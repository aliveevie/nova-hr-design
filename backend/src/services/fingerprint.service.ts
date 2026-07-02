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
  MAX_FINGERS_PER_EMPLOYEE,
  RECOMMENDED_FINGER_POSITIONS,
  FINGER_POSITIONS,
} from "../utils/fingerprintBridge.util.js";
import {
  extractTemplateFromImage,
  identifyAgainstGallery,
  getMatcherStatus,
  FINGERPRINT_DPI,
  SOURCEAFIS_TEMPLATE_FORMAT,
} from "../utils/sourceafisBridge.util.js";
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
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode = 400,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class FingerprintEnrollError extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode = 409,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
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
  /**
   * PNG fingerprint image (base64) captured in the browser via the
   * DigitalPersona WebSDK. The server extracts a SourceAFIS template from it —
   * this is what lets the reader live on any user's device while the backend
   * (and matching) runs in the cloud.
   */
  imageB64: string;
  dpi?: number;
}) => {
  const employee = await getEmployeeById(input.employeeId);
  if (!employee) throw new Error("Employee not found");

  if (!input.imageB64) {
    throw new Error("No fingerprint image was captured. Place the finger on the reader and retry.");
  }

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

  const dpi = input.dpi ?? FINGERPRINT_DPI;
  const extracted = await extractTemplateFromImage(input.imageB64, dpi);
  if (!extracted.success) {
    console.error("[fingerprint] template extract failed:", extracted.error, { dpi });
    throw new Error(
      extracted.error === "matcher_unavailable"
        ? "Fingerprint matching engine unavailable on the server."
        : "Could not read the fingerprint. Press firmly and centered, then retry."
    );
  }

  const adminOwnerId = String((employee as any).admin_owner_id ?? "");
  if (adminOwnerId) {
    await assertFingerprintNotAlreadyRegistered({
      adminOwnerId,
      employeeId: input.employeeId,
      fingerPosition: input.fingerPosition,
      imageB64: input.imageB64,
      dpi,
    });
  }

  if (!isSupabaseEnabled) throw new Error("Fingerprint enrollment requires database");

  const sql = getSql()!;
  const templateBytes = Buffer.from(extracted.template_b64, "base64");
  const imageBytes = Buffer.from(input.imageB64, "base64");

  const [row] = await sql`
    insert into employee_fingerprint_templates (
      employee_id,
      finger_position,
      template_format,
      template_data,
      fingerprint_image,
      image_dpi,
      scanner_label,
      enrolled_by_user_id,
      is_active
    ) values (
      ${input.employeeId},
      ${input.fingerPosition},
      ${SOURCEAFIS_TEMPLATE_FORMAT},
      ${templateBytes},
      ${imageBytes},
      ${dpi},
      ${input.scannerLabel ?? null},
      ${input.enrolledByUserId},
      true
    )
    on conflict (employee_id, finger_position)
    do update set
      template_data = excluded.template_data,
      template_format = excluded.template_format,
      fingerprint_image = excluded.fingerprint_image,
      image_dpi = excluded.image_dpi,
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
    deviceName: input.scannerLabel ?? null,
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
  // Only SourceAFIS templates are matchable by the server-side engine. Legacy
  // libfprint rows (if any) are ignored — those employees simply re-enroll.
  return sql`
    select t.id, t.employee_id, t.finger_position, t.template_data, e.name as employee_name
    from employee_fingerprint_templates t
    inner join employees e on e.id = t.employee_id
    where e.admin_owner_id = ${adminOwnerId}
      and t.is_active = true
      and t.template_format = ${SOURCEAFIS_TEMPLATE_FORMAT}
      and e.status = 'Active'
  `;
};

/** Reject enrollment when this physical finger is already registered (any employee). */
const assertFingerprintNotAlreadyRegistered = async (input: {
  adminOwnerId: string;
  employeeId: string;
  fingerPosition: string;
  imageB64: string;
  dpi: number;
}) => {
  const allTemplates = await loadTemplatesForAdmin(input.adminOwnerId);
  const gallery = allTemplates
    .filter(
      (t: any) =>
        !(
          String(t.employee_id) === input.employeeId &&
          String(t.finger_position) === input.fingerPosition
        )
    )
    .map((t: any) => ({
      id: String(t.id),
      template_b64: Buffer.from(t.template_data).toString("base64"),
    }));

  if (!gallery.length) return;

  const match = await identifyAgainstGallery(input.imageB64, gallery, { dpi: input.dpi });
  if (!match.success) return;

  const owner = allTemplates.find((t: any) => String(t.id) === match.template_id);
  const ownerName = owner ? String(owner.employee_name || "another employee") : "another employee";
  const ownerId = owner ? String(owner.employee_id) : "";
  const sameEmployee = ownerId === input.employeeId;

  throw new FingerprintEnrollError(
    sameEmployee
      ? `This fingerprint is already registered for ${ownerName} under another finger slot. Use a different finger.`
      : `This fingerprint is already registered for ${ownerName}. Each finger can only belong to one employee.`,
    "FINGERPRINT_ALREADY_TAKEN",
    409,
    {
      employeeId: ownerId,
      employeeName: ownerName,
      matchScore: match.score,
    }
  );
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
  /** PNG fingerprint image (base64) captured in the browser via WebSDK. */
  imageB64: string;
  dpi?: number;
}) => {
  if (!input.imageB64) {
    throw new FingerprintScanError(
      "No fingerprint image was captured. Place the finger on the reader and retry.",
      "NO_IMAGE",
      400
    );
  }

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
      422
    );
  }

  const gallery = templates.map((t: any) => ({
    id: String(t.id),
    template_b64: Buffer.from(t.template_data).toString("base64"),
  }));

  const match = await identifyAgainstGallery(input.imageB64, gallery, {
    dpi: input.dpi ?? FINGERPRINT_DPI,
  });
  if (!match.success) {
    await logFingerprintEvent({
      adminOwnerId: input.adminOwnerId,
      scannerId: input.scannerId ?? null,
      eventType: "identify_failed",
      message: match.error,
      matchScore: match.best_score ?? null,
    });
    throw new FingerprintScanError(
      "Fingerprint not recognized. Register this finger for an employee, or scan a finger that was already enrolled.",
      "UNKNOWN_FINGERPRINT",
      422,
      { bestScore: match.best_score ?? null }
    );
  }

  const matched = templates.find((t: any) => String(t.id) === match.template_id);
  if (!matched) {
    throw new FingerprintScanError("Matched template not found", "UNKNOWN_FINGERPRINT", 422);
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
      matchScore: match.score,
      attendanceId: String(existing.id),
      attendanceDate: today,
      message: `Already checked in at ${existing.check_in}`,
    });
    return {
      employeeId,
      employeeName: String((employee as any).name || ""),
      eventType: "check_in" as const,
      attendanceId: String(existing.id),
      matchScore: match.score,
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
    matchScore: match.score,
    attendanceId,
    attendanceDate: today,
    message,
  });

  return {
    employeeId,
    employeeName: String((employee as any).name || ""),
    eventType: "check_in" as const,
    attendanceId,
    matchScore: match.score,
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
  // The physical reader now lives in the user's browser (DigitalPersona
  // WebSDK), so backend "status" reflects whether the server-side matching
  // engine is ready. The frontend separately checks the browser reader.
  const matcher = await getMatcherStatus();
  return {
    available: matcher.available,
    engine: matcher.engine,
    error: matcher.error,
  };
};

export { FINGER_POSITIONS, RECOMMENDED_FINGER_POSITIONS, MAX_FINGERS_PER_EMPLOYEE };
