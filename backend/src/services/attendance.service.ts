import { getDatabase, dbHelpers } from "../config/database.js";
import { randomUUID } from "crypto";
import { getSql, isSupabaseEnabled } from "../config/supabase.js";
import { getEmployeeById } from "./employee.service.js";

type AttendanceStatus = "Present" | "Late" | "Absent" | "On Leave";
type AttendanceSource = "manual" | "auto";

export type AttendanceFilters = { employeeId?: string; date?: string };

export type OfficeLocationRow = {
  id: string;
  admin_owner_id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  radius_m: number;
  max_accuracy_m: number;
  entry_buffer_m: number;
  exit_buffer_m: number;
  exit_grace_seconds: number;
  open_time: string;
  close_time: string;
  time_zone: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type EmployeeDeviceRow = {
  id: string;
  employee_id: string;
  device_id: string;
  device_label: string | null;
  registered_at: string;
  auto_attendance_enabled: boolean;
  last_seen_at: string | null;
  last_lat: number | null;
  last_lng: number | null;
  last_accuracy_m: number | null;
  last_inside_state: boolean;
  last_inside_state_at: string | null;
  last_zone_id: string | null;
  created_at: string;
  updated_at: string;
};

const sortByDateDesc = (a: any, b: any) =>
  new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();

export const getAttendanceRecords = async (filters?: AttendanceFilters) => {
  if (isSupabaseEnabled) {
    const sql = getSql()!;
    if (filters?.employeeId && filters?.date) {
      return sql`
        select * from attendance
        where employee_id = ${filters.employeeId} and date = ${filters.date}
        order by date desc
      `;
    }
    if (filters?.employeeId) {
      return sql`
        select * from attendance
        where employee_id = ${filters.employeeId}
        order by date desc
      `;
    }
    if (filters?.date) {
      return sql`
        select * from attendance
        where date = ${filters.date}
        order by employee_name asc
      `;
    }
    // Avoid listing global attendance without scoping at controller level.
    return sql`select * from attendance order by date desc`;
  }

  await dbHelpers.read();
  const db = getDatabase();
  let records = [...(db.data.attendance || [])];

  if (filters?.employeeId) {
    records = records.filter((r) => r.employee_id === filters.employeeId);
  }

  if (filters?.date) {
    records = records.filter((r) => r.date === filters.date);
  }

  return records.sort(sortByDateDesc);
};

export const getAttendanceByEmployee = async (employeeId: string) => {
  return getAttendanceRecords({ employeeId });
};

export const getAttendanceByDate = async (date: string) => {
  return getAttendanceRecords({ date });
};

type CreateAttendanceInput = {
  employeeId: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status: AttendanceStatus;
  source?: AttendanceSource;
  deviceId?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
  geoAccuracyM?: number | null;
};

export const createAttendance = async (attendanceData: CreateAttendanceInput) => {
  const id = randomUUID();

  const employee = await getEmployeeById(attendanceData.employeeId);
  if (!employee) throw new Error("Employee not found");

  const employeeName = String((employee as any).name || "Employee");
  const department = String((employee as any).department || "");

  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const [row] = await sql`
      insert into attendance (
        id,
        employee_id,
        employee_name,
        date,
        check_in,
        check_out,
        status,
        department,
        source,
        device_id,
        geo_lat,
        geo_lng,
        geo_accuracy_m
      ) values (
        ${id},
        ${attendanceData.employeeId},
        ${employeeName},
        ${attendanceData.date},
        ${attendanceData.checkIn ?? ""},
        ${attendanceData.checkOut ?? null},
        ${attendanceData.status},
        ${department || null},
        ${attendanceData.source ?? "manual"},
        ${attendanceData.deviceId ?? null},
        ${attendanceData.geoLat ?? null},
        ${attendanceData.geoLng ?? null},
        ${attendanceData.geoAccuracyM ?? null}
      )
      returning *
    `;
    return row;
  }

  await dbHelpers.read();
  const db = getDatabase();
  const newRecord = {
    id,
    employee_id: attendanceData.employeeId,
    employee_name: employeeName,
    date: attendanceData.date,
    check_in: attendanceData.checkIn ?? null,
    check_out: attendanceData.checkOut ?? null,
    status: attendanceData.status,
    department,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.data.attendance.push(newRecord);
  await dbHelpers.write();
  return newRecord;
};

export const updateAttendance = async (id: string, attendanceData: any) => {
  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const rows = await sql`select * from attendance where id = ${id} limit 1`;
    const existing = rows[0] as Record<string, any> | undefined;
    if (!existing) return null;

    const checkIn =
      attendanceData.checkIn !== undefined ? attendanceData.checkIn : existing.check_in;
    const checkOut =
      attendanceData.checkOut !== undefined ? attendanceData.checkOut : existing.check_out;
    const status =
      attendanceData.status !== undefined ? attendanceData.status : existing.status;

    const [updated] = await sql`
      update attendance set
        check_in = ${checkIn},
        check_out = ${checkOut},
        status = ${status},
        updated_at = now()
      where id = ${id}
      returning *
    `;
    return updated;
  }

  await dbHelpers.read();
  const db = getDatabase();
  const index = db.data.attendance.findIndex((a) => a.id === id);
  if (index === -1) {
    return null;
  }

  db.data.attendance[index] = {
    ...db.data.attendance[index],
    check_in: attendanceData.checkIn !== undefined ? attendanceData.checkIn : db.data.attendance[index].check_in,
    check_out: attendanceData.checkOut !== undefined ? attendanceData.checkOut : db.data.attendance[index].check_out,
    status: attendanceData.status || db.data.attendance[index].status,
    updated_at: new Date().toISOString(),
  };

  await dbHelpers.write();
  return db.data.attendance[index];
};

export const getMonthlySummary = async (month: string, year: string) => {
  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const startDate = `${year}-${month.padStart(2, "0")}-01`;
    const endDate = `${year}-${month.padStart(2, "0")}-31`;
    const rows: any[] = await sql`
      select status from attendance
      where date >= ${startDate} and date <= ${endDate}
    `;
    const statuses = rows.map((r) => String(r.status || ""));
    return {
      total: rows.length,
      present: statuses.filter((s) => s === "Present").length,
      absent: statuses.filter((s) => s === "Absent").length,
      late: statuses.filter((s) => s === "Late").length,
    };
  }

  await dbHelpers.read();
  const db = getDatabase();
  const startDate = `${year}-${month.padStart(2, "0")}-01`;
  const endDate = `${year}-${month.padStart(2, "0")}-31`;

  const records = db.data.attendance.filter(
    (r) => r.date >= startDate && r.date <= endDate
  );

  return {
    total: records.length,
    present: records.filter((r) => r.status === "Present").length,
    absent: records.filter((r) => r.status === "Absent").length,
    late: records.filter((r) => r.status === "Late").length,
  };
};

export const listOfficeLocationsForAdmin = async (adminOwnerId: string): Promise<OfficeLocationRow[]> => {
  if (!isSupabaseEnabled) {
    await dbHelpers.read();
    const db = getDatabase();
    return (db.data.officeLocations || []).filter(
      (x: any) => String(x.admin_owner_id) === String(adminOwnerId)
    );
  }
  const sql = getSql()!;
  return sql`
    select * from office_locations
    where admin_owner_id = ${adminOwnerId}
    order by created_at desc
  ` as unknown as OfficeLocationRow[];
};

export type UpsertOfficeLocationInput = {
  id?: string;
  adminOwnerId: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusM: number;
  maxAccuracyM: number;
  entryBufferM?: number;
  exitBufferM?: number;
  exitGraceSeconds?: number;
  openTime?: string;
  closeTime?: string;
  timeZone?: string;
  enabled?: boolean;
};

export const upsertOfficeLocation = async (input: UpsertOfficeLocationInput): Promise<OfficeLocationRow> => {
  const id = input.id || randomUUID();
  if (!isSupabaseEnabled) {
    await dbHelpers.read();
    const db = getDatabase();
    const idx = (db.data.officeLocations || []).findIndex((x: any) => x.id === id);
    const row = {
      id,
      admin_owner_id: input.adminOwnerId,
      name: input.name,
      center_lat: input.centerLat,
      center_lng: input.centerLng,
      radius_m: input.radiusM,
      max_accuracy_m: input.maxAccuracyM,
      entry_buffer_m: input.entryBufferM ?? 0,
      exit_buffer_m: input.exitBufferM ?? 0,
      exit_grace_seconds: input.exitGraceSeconds ?? 300,
      open_time: input.openTime ?? "00:00",
      close_time: input.closeTime ?? "23:59",
      time_zone: input.timeZone ?? "Africa/Lagos",
      enabled: input.enabled ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (idx === -1) db.data.officeLocations.push(row);
    else db.data.officeLocations[idx] = { ...db.data.officeLocations[idx], ...row, updated_at: new Date().toISOString() };
    await dbHelpers.write();
    return row as any;
  }

  const sql = getSql()!;
  const [row] = await sql`
    insert into office_locations (
      id, admin_owner_id, name, center_lat, center_lng, radius_m, max_accuracy_m,
      entry_buffer_m, exit_buffer_m, exit_grace_seconds, open_time, close_time, time_zone, enabled
    ) values (
      ${id},
      ${input.adminOwnerId},
      ${input.name},
      ${input.centerLat},
      ${input.centerLng},
      ${input.radiusM},
      ${input.maxAccuracyM},
      ${input.entryBufferM ?? 0},
      ${input.exitBufferM ?? 0},
      ${input.exitGraceSeconds ?? 300},
      ${input.openTime ?? "00:00"},
      ${input.closeTime ?? "23:59"},
      ${input.timeZone ?? "Africa/Lagos"},
      ${input.enabled ?? true}
    )
    on conflict (id) do update set
      name = excluded.name,
      center_lat = excluded.center_lat,
      center_lng = excluded.center_lng,
      radius_m = excluded.radius_m,
      max_accuracy_m = excluded.max_accuracy_m,
      entry_buffer_m = excluded.entry_buffer_m,
      exit_buffer_m = excluded.exit_buffer_m,
      exit_grace_seconds = excluded.exit_grace_seconds,
      open_time = excluded.open_time,
      close_time = excluded.close_time,
      time_zone = excluded.time_zone,
      enabled = excluded.enabled,
      updated_at = now()
    returning *
  `;
  return row as any;
};

export const deleteOfficeLocation = async (adminOwnerId: string, id: string): Promise<boolean> => {
  if (!isSupabaseEnabled) {
    await dbHelpers.read();
    const db = getDatabase();
    db.data.officeLocations = (db.data.officeLocations || []).filter((x: any) => x.id !== id);
    await dbHelpers.write();
    return true;
  }
  const sql = getSql()!;
  await sql`delete from office_locations where id = ${id} and admin_owner_id = ${adminOwnerId}`;
  return true;
};

export type RegisterEmployeeDeviceInput = {
  employeeId: string;
  deviceId: string;
  deviceLabel?: string | null;
  lat?: number | null;
  lng?: number | null;
  accuracyM?: number | null;
  insideState?: boolean;
  insideZoneId?: string | null;
};

export const getEmployeeDevice = async (
  employeeId: string,
  deviceId: string
): Promise<EmployeeDeviceRow | null> => {
  if (!isSupabaseEnabled) {
    await dbHelpers.read();
    const db = getDatabase();
    const row = (db.data.employeeDevices || []).find(
      (x: any) => x.employee_id === employeeId && x.device_id === deviceId
    );
    return row || null;
  }
  const sql = getSql()!;
  const rows = await sql`
    select * from employee_devices
    where employee_id = ${employeeId} and device_id = ${deviceId}
    limit 1
  `;
  return (rows[0] as any) || null;
};

export const registerEmployeeDevice = async (input: RegisterEmployeeDeviceInput): Promise<EmployeeDeviceRow> => {
  const id = randomUUID();
  if (!isSupabaseEnabled) {
    await dbHelpers.read();
    const db = getDatabase();
    const idx = (db.data.employeeDevices || []).findIndex(
      (x: any) => x.employee_id === input.employeeId && x.device_id === input.deviceId
    );
    const now = new Date().toISOString();
    const row = {
      id: idx === -1 ? id : db.data.employeeDevices[idx].id,
      employee_id: input.employeeId,
      device_id: input.deviceId,
      device_label: input.deviceLabel ?? null,
      registered_at: idx === -1 ? now : db.data.employeeDevices[idx].registered_at,
      auto_attendance_enabled: true,
      last_seen_at: now,
      last_lat: input.lat ?? null,
      last_lng: input.lng ?? null,
      last_accuracy_m: input.accuracyM ?? null,
      last_inside_state: input.insideState ?? false,
      last_inside_state_at: now,
      last_zone_id: input.insideZoneId ?? null,
      created_at: idx === -1 ? now : db.data.employeeDevices[idx].created_at,
      updated_at: now,
    };
    if (idx === -1) db.data.employeeDevices.push(row);
    else db.data.employeeDevices[idx] = row;
    await dbHelpers.write();
    return row as any;
  }

  const sql = getSql()!;
  const [row] = await sql`
    insert into employee_devices (
      id, employee_id, device_id, device_label, registered_at, auto_attendance_enabled,
      last_seen_at, last_lat, last_lng, last_accuracy_m,
      last_inside_state, last_inside_state_at, last_zone_id
    ) values (
      ${id},
      ${input.employeeId},
      ${input.deviceId},
      ${input.deviceLabel ?? null},
      now(),
      true,
      now(),
      ${input.lat ?? null},
      ${input.lng ?? null},
      ${input.accuracyM ?? null},
      ${input.insideState ?? false},
      now(),
      ${input.insideZoneId ?? null}
    )
    on conflict (employee_id, device_id) do update set
      device_label = excluded.device_label,
      last_seen_at = excluded.last_seen_at,
      last_lat = excluded.last_lat,
      last_lng = excluded.last_lng,
      last_accuracy_m = excluded.last_accuracy_m,
      last_inside_state = excluded.last_inside_state,
      last_inside_state_at = excluded.last_inside_state_at,
      last_zone_id = excluded.last_zone_id,
      updated_at = now()
    returning *
  `;
  return row as any;
};

export type UpdateEmployeeDeviceStateInput = {
  employeeId: string;
  deviceId: string;
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  insideState: boolean;
  insideZoneId: string | null;
  insideStateAt: string; // ISO
};

export const updateEmployeeDeviceState = async (input: UpdateEmployeeDeviceStateInput): Promise<EmployeeDeviceRow | null> => {
  if (!isSupabaseEnabled) {
    await dbHelpers.read();
    const db = getDatabase();
    const idx = (db.data.employeeDevices || []).findIndex(
      (x: any) => x.employee_id === input.employeeId && x.device_id === input.deviceId
    );
    if (idx === -1) return null;
    const prev = db.data.employeeDevices[idx];
    const row = {
      ...prev,
      last_seen_at: new Date().toISOString(),
      last_lat: input.lat,
      last_lng: input.lng,
      last_accuracy_m: input.accuracyM,
      last_inside_state: input.insideState,
      last_inside_state_at: input.insideStateAt,
      last_zone_id: input.insideZoneId,
      updated_at: new Date().toISOString(),
    };
    db.data.employeeDevices[idx] = row;
    await dbHelpers.write();
    return row as any;
  }

  const sql = getSql()!;
  const [row] = await sql`
    update employee_devices set
      last_seen_at = now(),
      last_lat = ${input.lat},
      last_lng = ${input.lng},
      last_accuracy_m = ${input.accuracyM},
      last_inside_state = ${input.insideState},
      last_inside_state_at = ${input.insideStateAt},
      last_zone_id = ${input.insideZoneId},
      updated_at = now()
    where employee_id = ${input.employeeId} and device_id = ${input.deviceId}
    returning *
  `;
  return (row as any) || null;
};
