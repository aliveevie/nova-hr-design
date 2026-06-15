import { randomUUID } from "crypto";
import { getSql, isSupabaseEnabled } from "../config/supabase.js";
import { getEmployeeById, getAllEmployees } from "./employee.service.js";
import {
  createAttendance,
  getAttendanceRecords,
  updateAttendance,
  listOfficeLocationsForAdmin,
  autoCheckoutOpenAttendanceForAdmin,
} from "./attendance.service.js";
import {
  captureFingerprintTemplate,
  identifyFingerprint,
  getScannerBridgeStatus,
  MAX_FINGERS_PER_EMPLOYEE,
  RECOMMENDED_FINGER_POSITIONS,
  FINGER_POSITIONS,
} from "../utils/fingerprintBridge.util.js";
import {
  isFingerprintScanAllowed,
  deriveLateStatus,
  getDateInTimeZone,
  toTimeHHMMInTimeZone,
  DEFAULT_OPEN_TIME,
  DEFAULT_CLOSE_TIME,
  DEFAULT_TIME_ZONE,
} from "../utils/attendance-session.util.js";

export class FingerprintScanError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const listFingerprintScanners = async (adminOwnerId: string) => {
  if (!isSupabaseEnabled) return [];
  const sql = getSql()!;
  return sql`
    select * from fingerprint_scanners
    where admin_owner_id = ${adminOwnerId}
    order by created_at desc
  `;
};

export const upsertFingerprintScanner = async (
  adminOwnerId: string,
  data: { id?: string; name: string; deviceLabel?: string | null; locationNote?: string | null; enabled?: boolean }
) => {
  if (!isSupabaseEnabled) throw new Error("Fingerprint requires database");
  const sql = getSql()!;

  if (data.id) {
    const [row] = await sql`
      update fingerprint_scanners set
        name = ${data.name},
        device_label = ${data.deviceLabel ?? null},
        location_note = ${data.locationNote ?? null},
        enabled = ${data.enabled ?? true}
      where id = ${data.id} and admin_owner_id = ${adminOwnerId}
      returning *
    `;
    return row;
  }

  const [row] = await sql`
    insert into fingerprint_scanners (admin_owner_id, name, device_label, location_note, enabled)
    values (${adminOwnerId}, ${data.name}, ${data.deviceLabel ?? null}, ${data.locationNote ?? null}, ${data.enabled ?? true})
    returning *
  `;
  return row;
};

export const countEmployeeFingerprintTemplates = async (employeeId: string): Promise<number> => {
  if (!isSupabaseEnabled) return 0;
  const sql = getSql()!;
  const [row] = await sql`
    select count(*)::int as c from employee_fingerprint_templates
    where employee_id = ${employeeId} and is_active = true
  `;
  return Number((row as any)?.c ?? 0);
};

export const listEmployeeFingerprintTemplates = async (employeeId: string) => {
  if (!isSupabaseEnabled) return [];
  const sql = getSql()!;
  return sql`
    select id, employee_id, finger_position, template_format, scanner_label,
           enrolled_by_user_id, is_active, enrolled_at, updated_at
    from employee_fingerprint_templates
    where employee_id = ${employeeId} and is_active = true
    order by enrolled_at desc
  `;
};

export const getEnrollmentOverviewForAdmin = async (adminOwnerId: string) => {
  const employees = (await getAllEmployees({ status: "Active" }, { hrAdminUserId: adminOwnerId })) as any[];
  if (!isSupabaseEnabled) {
    return employees.map((e) => ({
      employeeId: String(e.id),
      name: String(e.name || ""),
      department: String(e.department || ""),
      enrolledFingers: 0,
      maxFingers: MAX_FINGERS_PER_EMPLOYEE,
      isFullyEnrolled: false,
      enrolledPositions: [] as string[],
    }));
  }

  const sql = getSql()!;
  const rows = await sql`
    select e.id as employee_id, e.name, e.department,
           coalesce(json_agg(t.finger_position) filter (where t.id is not null), '[]') as positions,
           count(t.id)::int as finger_count
    from employees e
    left join employee_fingerprint_templates t
      on t.employee_id = e.id and t.is_active = true
    where e.admin_owner_id = ${adminOwnerId} and e.status = 'Active'
    group by e.id, e.name, e.department
    order by e.name asc
  `;

  return (rows as any[]).map((r) => {
    const positions = Array.isArray(r.positions) ? r.positions : [];
    const count = Number(r.finger_count ?? 0);
    return {
      employeeId: String(r.employee_id),
      name: String(r.name || ""),
      department: String(r.department || ""),
      enrolledFingers: count,
      maxFingers: MAX_FINGERS_PER_EMPLOYEE,
      isFullyEnrolled: count >= MAX_FINGERS_PER_EMPLOYEE,
      enrolledPositions: positions,
    };
  });
};

export const enrollEmployeeFingerprint = async (input: {
  employeeId: string;
  fingerPosition: string;
  enrolledByUserId: string;
  scannerLabel?: string | null;
}) => {
  const employee = await getEmployeeById(input.employeeId);
  if (!employee) throw new Error("Employee not found");

  const existing = await listEmployeeFingerprintTemplates(input.employeeId);
  if (existing.length >= MAX_FINGERS_PER_EMPLOYEE) {
    throw new Error(
      `This employee already has ${MAX_FINGERS_PER_EMPLOYEE} fingerprints enrolled. Remove one before adding another.`
    );
  }

  const duplicateFinger = existing.find(
    (t: any) => String(t.finger_position) === input.fingerPosition
  );
  if (duplicateFinger) {
    throw new Error(`Finger "${input.fingerPosition}" is already enrolled for this employee.`);
  }

  const captured = await captureFingerprintTemplate(input.fingerPosition);
  if (!captured.success) {
    throw new Error(captured.error || "Fingerprint capture failed");
  }

  if (!isSupabaseEnabled) throw new Error("Fingerprint enrollment requires database");

  const sql = getSql()!;
  const templateBytes = Buffer.from(captured.template_b64, "base64");

  const [row] = await sql`
    insert into employee_fingerprint_templates (
      employee_id,
      finger_position,
      template_format,
      template_data,
      scanner_label,
      enrolled_by_user_id,
      is_active
    ) values (
      ${input.employeeId},
      ${input.fingerPosition},
      'libfprint-2',
      ${templateBytes},
      ${input.scannerLabel ?? captured.device_name ?? null},
      ${input.enrolledByUserId},
      true
    )
    on conflict (employee_id, finger_position)
    do update set
      template_data = excluded.template_data,
      template_format = excluded.template_format,
      scanner_label = excluded.scanner_label,
      enrolled_by_user_id = excluded.enrolled_by_user_id,
      is_active = true,
      enrolled_at = now(),
      updated_at = now()
    returning id, employee_id, finger_position, scanner_label, enrolled_at, is_active
  `;

  await sql`
    insert into fingerprint_attendance_logs (
      employee_id, fingerprint_template_id, admin_owner_id, event_type, message
    ) values (
      ${input.employeeId},
      ${row.id},
      ${(employee as any).admin_owner_id ?? null},
      'enrollment',
      ${`Enrolled ${input.fingerPosition}`}
    )
  `;

  const newCount = existing.length + 1;
  const nextRecommended = RECOMMENDED_FINGER_POSITIONS.find(
    (f) => !existing.some((t: any) => t.finger_position === f.value) && f.value !== input.fingerPosition
  );

  return {
    template: row,
    deviceName: captured.device_name,
    enrolledCount: newCount,
    maxFingers: MAX_FINGERS_PER_EMPLOYEE,
    isFullyEnrolled: newCount >= MAX_FINGERS_PER_EMPLOYEE,
    nextRecommendedFinger: nextRecommended?.value ?? null,
    nextRecommendedLabel: nextRecommended?.label ?? null,
  };
};

export const deactivateFingerprintTemplate = async (
  templateId: string,
  adminOwnerId: string
) => {
  if (!isSupabaseEnabled) return false;
  const sql = getSql()!;
  const rows = await sql`
    update employee_fingerprint_templates t
    set is_active = false, updated_at = now()
    from employees e
    where t.id = ${templateId}
      and t.employee_id = e.id
      and e.admin_owner_id = ${adminOwnerId}
    returning t.id
  `;
  return rows.length > 0;
};

const loadTemplatesForAdmin = async (adminOwnerId: string) => {
  if (!isSupabaseEnabled) return [];
  const sql = getSql()!;
  return sql`
    select t.id, t.employee_id, t.finger_position, t.template_data, e.name as employee_name
    from employee_fingerprint_templates t
    inner join employees e on e.id = t.employee_id
    where e.admin_owner_id = ${adminOwnerId}
      and t.is_active = true
      and e.status = 'Active'
  `;
};

export const logFingerprintEvent = async (data: {
  employeeId?: string | null;
  templateId?: string | null;
  scannerId?: string | null;
  adminOwnerId?: string | null;
  eventType: string;
  matchScore?: number | null;
  attendanceId?: string | null;
  attendanceDate?: string | null;
  message?: string | null;
}) => {
  if (!isSupabaseEnabled) return;
  const sql = getSql()!;
  await sql`
    insert into fingerprint_attendance_logs (
      employee_id, fingerprint_template_id, scanner_id, admin_owner_id,
      event_type, match_score, attendance_id, attendance_date, message
    ) values (
      ${data.employeeId ?? null},
      ${data.templateId ?? null},
      ${data.scannerId ?? null},
      ${data.adminOwnerId ?? null},
      ${data.eventType},
      ${data.matchScore ?? null},
      ${data.attendanceId ?? null},
      ${data.attendanceDate ?? null},
      ${data.message ?? null}
    )
  `;
};

export const processFingerprintAttendanceScan = async (input: {
  adminOwnerId: string;
  scannerId?: string | null;
}) => {
  await autoCheckoutOpenAttendanceForAdmin(input.adminOwnerId);

  const offices = await listOfficeLocationsForAdmin(input.adminOwnerId);
  const office = offices[0] ?? null;
  const tz = office?.time_zone || DEFAULT_TIME_ZONE;
  const openTime = office?.open_time || DEFAULT_OPEN_TIME;
  const closeTime = office?.close_time || DEFAULT_CLOSE_TIME;

  if (!isFingerprintScanAllowed(office, new Date())) {
    throw new FingerprintScanError(
      `Fingerprint attendance is only available during office hours (${openTime}–${closeTime}).`,
      "OUTSIDE_HOURS",
      403
    );
  }

  const templates = await loadTemplatesForAdmin(input.adminOwnerId);
  if (!templates.length) {
    throw new FingerprintScanError(
      "No fingerprints enrolled yet. Register employees using the enrollment wizard.",
      "NO_ENROLLMENTS",
      404
    );
  }

  const gallery = templates.map((t: any) => ({
    id: String(t.id),
    template_b64: Buffer.from(t.template_data).toString("base64"),
  }));

  const match = await identifyFingerprint(gallery);
  if (!match.success) {
    await logFingerprintEvent({
      adminOwnerId: input.adminOwnerId,
      scannerId: input.scannerId ?? null,
      eventType: "identify_failed",
      message: match.error,
    });
    throw new FingerprintScanError(
      "Fingerprint not recognized. Register this finger for an employee.",
      "UNKNOWN_FINGERPRINT",
      404
    );
  }

  const matched = templates.find((t: any) => String(t.id) === match.template_id);
  if (!matched) {
    throw new FingerprintScanError("Matched template not found", "UNKNOWN_FINGERPRINT", 404);
  }

  const employeeId = String(matched.employee_id);
  const employee = await getEmployeeById(employeeId);
  if (!employee) throw new Error("Employee not found");

  const now = new Date();
  const today = getDateInTimeZone(tz, now);
  const timeStr = toTimeHHMMInTimeZone(tz, now);

  const existingRows = await getAttendanceRecords({ employeeId, date: today });
  const existing = existingRows[0] as any;

  if (existing?.check_out) {
    await logFingerprintEvent({
      employeeId,
      templateId: String(matched.id),
      scannerId: input.scannerId ?? null,
      adminOwnerId: input.adminOwnerId,
      eventType: "verify_failed",
      attendanceDate: today,
      message: "Already checked out for today",
    });
    throw new FingerprintScanError(
      "Already checked out for today. Sign-out happens automatically at close time.",
      "ALREADY_CHECKED_OUT",
      409
    );
  }

  if (existing?.check_in) {
    await logFingerprintEvent({
      employeeId,
      templateId: String(matched.id),
      scannerId: input.scannerId ?? null,
      adminOwnerId: input.adminOwnerId,
      eventType: "check_in",
      matchScore: match.match_score,
      attendanceId: String(existing.id),
      attendanceDate: today,
      message: `Already checked in at ${existing.check_in}`,
    });
    return {
      employeeId,
      employeeName: String((employee as any).name || ""),
      eventType: "check_in" as const,
      attendanceId: String(existing.id),
      matchScore: match.match_score,
      message: `Already checked in at ${existing.check_in}. You will be signed out automatically at ${closeTime}.`,
      alreadyCheckedIn: true,
    };
  }

  const row = await createAttendance({
    employeeId,
    date: today,
    checkIn: timeStr,
    status: deriveLateStatus(timeStr, openTime),
    source: "fingerprint",
    deviceId: input.scannerId ? `fp:${input.scannerId}` : "fingerprint",
  });
  const attendanceId = String(row.id);

  if (isSupabaseEnabled) {
    const sql = getSql()!;
    await sql`
      update attendance set
        fingerprint_template_id = ${matched.id},
        fingerprint_scanner_id = ${input.scannerId ?? null}
      where id = ${attendanceId}
    `;
  }

  const message = `Checked in at ${timeStr}. Auto sign-out at ${closeTime}.`;

  await logFingerprintEvent({
    employeeId,
    templateId: String(matched.id),
    scannerId: input.scannerId ?? null,
    adminOwnerId: input.adminOwnerId,
    eventType: "check_in",
    matchScore: match.match_score,
    attendanceId,
    attendanceDate: today,
    message,
  });

  return {
    employeeId,
    employeeName: String((employee as any).name || ""),
    eventType: "check_in" as const,
    attendanceId,
    matchScore: match.match_score,
    message,
    alreadyCheckedIn: false,
  };
};

export const listFingerprintAttendanceLogs = async (
  adminOwnerId: string,
  filters?: { date?: string; limit?: number }
) => {
  if (!isSupabaseEnabled) return [];
  const sql = getSql()!;
  const limit = Math.min(filters?.limit ?? 100, 500);
  if (filters?.date) {
    return sql`
      select l.*, e.name as employee_name, e.department
      from fingerprint_attendance_logs l
      left join employees e on e.id = l.employee_id
      where l.admin_owner_id = ${adminOwnerId}
        and l.attendance_date = ${filters.date}
      order by l.created_at desc
      limit ${limit}
    `;
  }
  return sql`
    select l.*, e.name as employee_name, e.department
    from fingerprint_attendance_logs l
    left join employees e on e.id = l.employee_id
    where l.admin_owner_id = ${adminOwnerId}
    order by l.created_at desc
    limit ${limit}
  `;
};

export const getFingerprintScannerStatus = async () => {
  return getScannerBridgeStatus();
};

export { FINGER_POSITIONS, RECOMMENDED_FINGER_POSITIONS, MAX_FINGERS_PER_EMPLOYEE };
