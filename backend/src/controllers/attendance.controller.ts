import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import {
  getAttendanceRecords,
  getAttendanceByEmployee,
  getAttendanceByDate,
  getAttendanceInRangeForEmployees,
  createAttendance,
  updateAttendance,
  updateOfficeHours,
  getMonthlySummary,
  deleteOfficeLocation,
  getEmployeeDevice,
  listEmployeeDevices,
  listOfficeLocationsForAdmin,
  registerEmployeeDevice,
  upsertOfficeLocation,
  updateEmployeeDeviceState,
} from "../services/attendance.service.js";
import {
  attendanceSchema,
  attendanceReportQuerySchema,
  autoAttendanceEvaluateSchema,
  deviceRegisterSchema,
  officeHoursSchema,
  officeLocationSchema,
} from "../utils/validators.js";
import { getHrAdminAllowedEmployeeIds } from "../utils/hr-admin-scope.util.js";
import { canUserAccessEmployee } from "../utils/ownership-access.util.js";
import { resolveAdminOwnerForCreate, getEmployeeById } from "../services/employee.service.js";
import { resolveInsideGeofence } from "../utils/geo.util.js";
import { getSourceIp, ipMatchesAllowlist, ssidMatchesAllowlist } from "../utils/ip.util.js";
import { sendAttendanceCheckinEmail, sendAttendanceCheckoutEmail } from "../services/email.service.js";

const toTimeHHMM = (d: Date) =>
  d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });

const parseHHMM = (v: string): number | null => {
  const m = /^(\d{2}):(\d{2})$/.exec(String(v || ""));
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
};

const getNowMinutesInTimeZone = (timeZone: string, d = new Date()): number | null => {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const hh = Number(parts.find((p) => p.type === "hour")?.value);
    const mm = Number(parts.find((p) => p.type === "minute")?.value);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return hh * 60 + mm;
  } catch {
    return null;
  }
};

const isWithinOfficeHours = (args: { nowMin: number; openMin: number; closeMin: number }): boolean => {
  const { nowMin, openMin, closeMin } = args;
  if (openMin === closeMin) return true; // treat as always open
  if (openMin < closeMin) return nowMin >= openMin && nowMin <= closeMin;
  // Overnight window (e.g. 20:00 -> 06:00)
  return nowMin >= openMin || nowMin <= closeMin;
};

export const getAttendanceController = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, date } = req.query;
    const filters: any = {};
    if (employeeId) filters.employeeId = employeeId as string;
    if (date) filters.date = date as string;

    let records = await getAttendanceRecords(filters);
    const allowedIds = await getHrAdminAllowedEmployeeIds(req);
    if (allowedIds) {
      const set = new Set(allowedIds);
      records = records.filter((r: any) => r.employee_id && set.has(r.employee_id));
    }
    const transformed = records.map((r: any) => ({
      id: r.id,
      employeeId: r.employee_id,
      employee: r.employee_name,
      date: r.date,
      checkIn: r.check_in,
      checkOut: r.check_out,
      status: r.status,
      department: r.department,
    }));

    res.json({ attendance: transformed });
  } catch (error) {
    console.error("Get attendance error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getEmployeeAttendanceController = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId } = req.params;
    const allowed = await canUserAccessEmployee(req, employeeId);
    if (!allowed) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const records = await getAttendanceByEmployee(employeeId);
    const transformed = records.map((r: any) => ({
      id: r.id,
      employeeId: r.employee_id,
      employee: r.employee_name,
      date: r.date,
      checkIn: r.check_in,
      checkOut: r.check_out,
      status: r.status,
      department: r.department,
    }));

    res.json({ attendance: transformed });
  } catch (error) {
    console.error("Get employee attendance error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const checkInController = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId } = req.body;
    const allowed = await canUserAccessEmployee(req, employeeId);
    if (!allowed) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });

    // Check if already checked in today
    const todayRecords = await getAttendanceByDate(today);
    const existing = todayRecords.find(
      (r: any) => r.employee_id === employeeId
    );

    if (existing) {
      return res.status(400).json({ error: "Already checked in today" });
    }

    const record = await createAttendance({
      employeeId,
      date: today,
      checkIn: now,
      status: now > "09:00" ? "Late" : "Present",
    });

    res.status(201).json({ attendance: record });
  } catch (error) {
    console.error("Check in error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const checkOutController = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId } = req.body;
    const allowed = await canUserAccessEmployee(req, employeeId);
    if (!allowed) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });

    const records = await getAttendanceByDate(today);
    const todayRecord = records.find((r: any) => r.employee_id === employeeId);

    if (!todayRecord) {
      return res.status(400).json({ error: "No check-in found for today" });
    }

    const updated = await updateAttendance(todayRecord.id, {
      checkOut: now,
      status: todayRecord.status, // Keep existing status
    });

    res.json({ attendance: updated });
  } catch (error) {
    console.error("Check out error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateAttendanceController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validation = attendanceSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid data", details: validation.error.errors });
    }

    const existing = await getAttendanceRecords();
    const current = existing.find((r: any) => r.id === id);
    if (!current) {
      return res.status(404).json({ error: "Attendance not found" });
    }
    const allowed = await canUserAccessEmployee(req, String((current as any).employee_id));
    if (!allowed) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updated = await updateAttendance(id, validation.data);
    res.json({ attendance: updated });
  } catch (error) {
    console.error("Update attendance error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getSummaryController = async (req: AuthRequest, res: Response) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ error: "Month and year are required" });
    }

    const summary = await getMonthlySummary(month as string, year as string);
    res.json({ summary });
  } catch (error) {
    console.error("Get summary error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const listOfficeLocationsController = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const adminOwnerId = await resolveAdminOwnerForCreate(req.user.role, req.user.userId);
    let rows = await listOfficeLocationsForAdmin(adminOwnerId);

    // Zero-input auto-seed: on first admin visit, if the office has no IP
    // allow-list yet, silently seed it with the admin's current public IP.
    // This is safe (no-op once populated) and means the admin never has to
    // click a button for cross-browser check-in to work.
    const currentIp = getSourceIp(req);
    if (
      rows.length === 1 &&
      (!(rows[0] as any).allowed_ips || (rows[0] as any).allowed_ips.length === 0) &&
      currentIp
    ) {
      try {
        const r = rows[0] as any;
        await upsertOfficeLocation({
          id: r.id,
          adminOwnerId,
          name: r.name,
          centerLat: Number(r.center_lat),
          centerLng: Number(r.center_lng),
          radiusM: Number(r.radius_m),
          maxAccuracyM: Number(r.max_accuracy_m),
          entryBufferM: Number(r.entry_buffer_m || 0),
          exitBufferM: Number(r.exit_buffer_m || 0),
          exitGraceSeconds: Number(r.exit_grace_seconds || 300),
          openTime: r.open_time ?? "00:00",
          closeTime: r.close_time ?? "23:59",
          timeZone: r.time_zone ?? "Africa/Lagos",
          enabled: !!r.enabled,
          allowedIps: [currentIp],
          allowedSsids: r.allowed_ssids ?? [],
        });
        rows = await listOfficeLocationsForAdmin(adminOwnerId);
      } catch (seedErr) {
        console.error("auto-seed allowed_ips failed:", seedErr);
      }
    }

    const locations = rows.map((r) => ({
      id: r.id,
      name: r.name,
      centerLat: r.center_lat,
      centerLng: r.center_lng,
      radiusM: r.radius_m,
      maxAccuracyM: r.max_accuracy_m,
      entryBufferM: r.entry_buffer_m,
      exitBufferM: r.exit_buffer_m,
      exitGraceSeconds: r.exit_grace_seconds,
      openTime: (r as any).open_time ?? "00:00",
      closeTime: (r as any).close_time ?? "23:59",
      timeZone: (r as any).time_zone ?? "Africa/Lagos",
      enabled: r.enabled,
      allowedIps: (r as any).allowed_ips ?? [],
      allowedSsids: (r as any).allowed_ssids ?? [],
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    return res.json({ locations, currentIp });
  } catch (e) {
    console.error("listOfficeLocationsController:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const upsertOfficeLocationController = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const v = officeLocationSchema.safeParse(req.body);
    if (!v.success) return res.status(400).json({ error: "Invalid data", details: v.error.errors });

    const adminOwnerId = await resolveAdminOwnerForCreate(req.user.role, req.user.userId);
    const row = await upsertOfficeLocation({
      id: v.data.id,
      adminOwnerId,
      name: v.data.name,
      centerLat: v.data.centerLat,
      centerLng: v.data.centerLng,
      radiusM: v.data.radiusM,
      maxAccuracyM: v.data.maxAccuracyM,
      entryBufferM: v.data.entryBufferM,
      exitBufferM: v.data.exitBufferM,
      exitGraceSeconds: v.data.exitGraceSeconds,
      openTime: v.data.openTime,
      closeTime: v.data.closeTime,
      timeZone: v.data.timeZone,
      enabled: v.data.enabled,
      allowedIps: v.data.allowedIps,
      allowedSsids: v.data.allowedSsids,
    });

    return res.status(201).json({
      location: {
        id: row.id,
        name: row.name,
        centerLat: row.center_lat,
        centerLng: row.center_lng,
        radiusM: row.radius_m,
        maxAccuracyM: row.max_accuracy_m,
        entryBufferM: row.entry_buffer_m,
        exitBufferM: row.exit_buffer_m,
        exitGraceSeconds: row.exit_grace_seconds,
        openTime: (row as any).open_time ?? "00:00",
        closeTime: (row as any).close_time ?? "23:59",
        timeZone: (row as any).time_zone ?? "Africa/Lagos",
        enabled: row.enabled,
        allowedIps: (row as any).allowed_ips ?? [],
        allowedSsids: (row as any).allowed_ssids ?? [],
        currentIp: getSourceIp(req),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (e) {
    console.error("upsertOfficeLocationController:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Updates only the open_time / close_time / time_zone of one office location.
 * Kept separate from upsertOfficeLocation so the admin UI can expose hours
 * as its own dedicated form without risking accidental changes to the
 * geofence or IP/SSID allow-lists.
 */
export const updateOfficeHoursController = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Missing id" });
    const v = officeHoursSchema.safeParse(req.body);
    if (!v.success) {
      return res.status(400).json({ error: "Invalid data", details: v.error.flatten() });
    }
    const adminOwnerId = await resolveAdminOwnerForCreate(req.user.role, req.user.userId);
    const row = await updateOfficeHours({
      id,
      adminOwnerId,
      openTime: v.data.openTime,
      closeTime: v.data.closeTime,
      timeZone: v.data.timeZone,
    });
    if (!row) return res.status(404).json({ error: "Office location not found" });
    return res.json({
      location: {
        id: row.id,
        name: row.name,
        openTime: (row as any).open_time ?? "00:00",
        closeTime: (row as any).close_time ?? "23:59",
        timeZone: (row as any).time_zone ?? "Africa/Lagos",
        updatedAt: row.updated_at,
      },
    });
  } catch (e) {
    console.error("updateOfficeHoursController:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Admin-scoped attendance report for a date range. Returns:
 *  - totals across all staff in range
 *  - per-employee breakdown (days present/late/absent + working days)
 *  - flat record list (used by CSV download on the client)
 */
export const getAttendanceReportController = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const v = attendanceReportQuerySchema.safeParse(req.query);
    if (!v.success) {
      return res.status(400).json({ error: "Invalid query", details: v.error.flatten() });
    }
    const { from, to, department } = v.data;
    if (from > to) {
      return res.status(400).json({ error: "'from' must be <= 'to'" });
    }

    const adminOwnerId = await resolveAdminOwnerForCreate(req.user.role, req.user.userId);
    const employees = (await (
      await import("../services/employee.service.js")
    ).getAllEmployees(
      department ? { department } : undefined,
      { hrAdminUserId: adminOwnerId } as any
    )) as any[];

    const empIds = employees.map((e) => String(e.id));
    const records = await getAttendanceInRangeForEmployees(empIds, from, to);

    // Unique working-day set per employee, plus status tallies.
    const byEmployee = new Map<
      string,
      { id: string; name: string; department: string; present: number; late: number; absent: number; onLeave: number; daysTracked: number }
    >();
    for (const e of employees) {
      byEmployee.set(String(e.id), {
        id: String(e.id),
        name: String(e.name || ""),
        department: String(e.department || ""),
        present: 0,
        late: 0,
        absent: 0,
        onLeave: 0,
        daysTracked: 0,
      });
    }

    const totals = { present: 0, late: 0, absent: 0, onLeave: 0 };
    const flat: Array<{
      date: string;
      employeeId: string;
      employeeName: string;
      department: string;
      checkIn: string | null;
      checkOut: string | null;
      status: string;
    }> = [];

    for (const r of records as any[]) {
      const empId = String(r.employee_id);
      const bucket = byEmployee.get(empId);
      const status = String(r.status || "Absent");
      if (bucket) {
        bucket.daysTracked += 1;
        if (status === "Present") bucket.present += 1;
        else if (status === "Late") bucket.late += 1;
        else if (status === "On Leave") bucket.onLeave += 1;
        else bucket.absent += 1;
      }
      if (status === "Present") totals.present += 1;
      else if (status === "Late") totals.late += 1;
      else if (status === "On Leave") totals.onLeave += 1;
      else totals.absent += 1;
      flat.push({
        date: String(r.date),
        employeeId: empId,
        employeeName: String(r.employee_name || bucket?.name || ""),
        department: String(bucket?.department || ""),
        checkIn: r.check_in || null,
        checkOut: r.check_out || null,
        status,
      });
    }

    return res.json({
      from,
      to,
      totals,
      byEmployee: Array.from(byEmployee.values()).sort((a, b) => a.name.localeCompare(b.name)),
      records: flat,
      employeeCount: employees.length,
    });
  } catch (e) {
    console.error("getAttendanceReportController:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteOfficeLocationController = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Missing id" });
    const adminOwnerId = await resolveAdminOwnerForCreate(req.user.role, req.user.userId);
    await deleteOfficeLocation(adminOwnerId, id);
    return res.json({ success: true });
  } catch (e) {
    console.error("deleteOfficeLocationController:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getEmployeeOfficeLocationController = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const employeeId = req.user.employeeId;
    if (!employeeId) return res.status(400).json({ error: "No employee linked to account" });

    const emp = await getEmployeeById(employeeId);
    const adminOwnerId = String((emp as any)?.admin_owner_id || "");
    if (!adminOwnerId) return res.json({ location: null });

    const rows = await listOfficeLocationsForAdmin(adminOwnerId);
    const enabled = rows.filter((x) => x.enabled);
    const loc = enabled[0] || null;
    if (!loc) return res.json({ location: null });

    const currentIp = getSourceIp(req);
    const ipOnNetwork = ipMatchesAllowlist(currentIp, (loc as any).allowed_ips ?? []);
    return res.json({
      location: {
        id: loc.id,
        name: loc.name,
        centerLat: loc.center_lat,
        centerLng: loc.center_lng,
        radiusM: loc.radius_m,
        maxAccuracyM: loc.max_accuracy_m,
        entryBufferM: loc.entry_buffer_m,
        exitBufferM: loc.exit_buffer_m,
        exitGraceSeconds: loc.exit_grace_seconds,
        openTime: (loc as any).open_time ?? "00:00",
        closeTime: (loc as any).close_time ?? "23:59",
        timeZone: (loc as any).time_zone ?? "Africa/Lagos",
        enabled: loc.enabled,
        // Tell the employee client whether their current network is already
        // recognised as an office network. The admin's IP list is *not*
        // exposed — employees only see a boolean.
        networkRecognized: ipOnNetwork,
        // SSIDs are non-sensitive network names the admin publishes so the
        // employee can pick "which office Wi-Fi am I on?". Exposing them is
        // required for the one-click selector in the portal.
        allowedSsids: ((loc as any).allowed_ssids ?? []) as string[],
        createdAt: loc.created_at,
        updatedAt: loc.updated_at,
      },
      currentIp,
    });
  } catch (e) {
    console.error("getEmployeeOfficeLocationController:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const registerAttendanceDeviceController = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const employeeId = req.user.employeeId;
    if (!employeeId) return res.status(400).json({ error: "No employee linked to account" });

    const v = deviceRegisterSchema.safeParse(req.body);
    if (!v.success) return res.status(400).json({ error: "Invalid data", details: v.error.errors });

    const emp = await getEmployeeById(employeeId);
    const adminOwnerId = String((emp as any)?.admin_owner_id || "");
    if (!adminOwnerId) return res.status(400).json({ error: "Employee is missing admin owner scope" });

    const geos = (await listOfficeLocationsForAdmin(adminOwnerId))
      .filter((x) => x.enabled)
      .map((g) => ({
        id: g.id,
        name: g.name,
        centerLat: Number(g.center_lat),
        centerLng: Number(g.center_lng),
        radiusM: Number(g.radius_m),
        maxAccuracyM: Number(g.max_accuracy_m),
        entryBufferM: Number(g.entry_buffer_m || 0),
        exitBufferM: Number(g.exit_buffer_m || 0),
        openTime: String((g as any).open_time ?? "00:00"),
        closeTime: String((g as any).close_time ?? "23:59"),
        timeZone: String((g as any).time_zone ?? "Africa/Lagos"),
      }));

    const hasFix =
      typeof v.data.lat === "number" &&
      typeof v.data.lng === "number" &&
      Number.isFinite(v.data.lat) &&
      Number.isFinite(v.data.lng);
    const inside = resolveInsideGeofence({
      point: hasFix
        ? { lat: v.data.lat!, lng: v.data.lng!, accuracyM: v.data.accuracyM ?? 0 }
        : { lat: 0, lng: 0, accuracyM: NaN },
      geofences: geos,
      previousZoneId: null,
    });

    // Allow registration from any location so the employee can default to their current
    // (login) device. The actual auto check-in still requires being inside the geofence
    // OR coming from a recognised office IP.
    const row = await registerEmployeeDevice({
      employeeId,
      deviceId: v.data.deviceId,
      deviceLabel: v.data.deviceLabel ?? null,
      lat: hasFix ? v.data.lat : null,
      lng: hasFix ? v.data.lng : null,
      accuracyM: hasFix ? v.data.accuracyM ?? null : null,
      insideState: !!inside.insideZoneId,
      insideZoneId: inside.insideZoneId,
    });

    return res.status(201).json({
      device: {
        employeeId: row.employee_id,
        deviceId: row.device_id,
        deviceLabel: row.device_label,
        registeredAt: row.registered_at,
        autoAttendanceEnabled: row.auto_attendance_enabled,
        lastZoneId: row.last_zone_id,
        lastSeenAt: row.last_seen_at,
        lastAccuracyM: row.last_accuracy_m,
        lastInsideState: row.last_inside_state,
      },
    });
  } catch (e) {
    console.error("registerAttendanceDeviceController:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const listEmployeeDevicesController = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const employeeId = req.user.employeeId;
    if (!employeeId) return res.status(400).json({ error: "No employee linked to account" });

    const rows = await listEmployeeDevices(employeeId);
    const devices = rows.map((row) => ({
      employeeId: row.employee_id,
      deviceId: row.device_id,
      deviceLabel: row.device_label,
      registeredAt: row.registered_at,
      autoAttendanceEnabled: row.auto_attendance_enabled,
      lastSeenAt: row.last_seen_at,
      lastAccuracyM: row.last_accuracy_m,
      lastInsideState: row.last_inside_state,
      lastZoneId: row.last_zone_id,
    }));
    return res.json({ devices });
  } catch (e) {
    console.error("listEmployeeDevicesController:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const autoEvaluateAttendanceController = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const employeeId = req.user.employeeId;
    if (!employeeId) return res.status(400).json({ error: "No employee linked to account" });

    const v = autoAttendanceEvaluateSchema.safeParse(req.body);
    if (!v.success) return res.status(400).json({ error: "Invalid data", details: v.error.errors });

    let device = await getEmployeeDevice(employeeId, v.data.deviceId);
    // Device registration is automatic: we upsert on first successful in-office evaluation.
    if (device && !device.auto_attendance_enabled) {
      return res.status(403).json({ error: "Auto attendance disabled for this device" });
    }

    const emp = await getEmployeeById(employeeId);
    const adminOwnerId = String((emp as any)?.admin_owner_id || "");
    if (!adminOwnerId) return res.status(400).json({ error: "Employee is missing admin owner scope" });

    const allGeos = (await listOfficeLocationsForAdmin(adminOwnerId))
      .filter((x) => x.enabled)
      .map((g) => ({
        id: g.id,
        name: g.name,
        centerLat: Number(g.center_lat),
        centerLng: Number(g.center_lng),
        radiusM: Number(g.radius_m),
        maxAccuracyM: Number(g.max_accuracy_m),
        entryBufferM: Number(g.entry_buffer_m || 0),
        exitBufferM: Number(g.exit_buffer_m || 0),
        exitGraceSeconds: Number(g.exit_grace_seconds || 300),
        openTime: String((g as any).open_time ?? "00:00"),
        closeTime: String((g as any).close_time ?? "23:59"),
        timeZone: String((g as any).time_zone ?? "Africa/Lagos"),
        allowedIps: ((g as any).allowed_ips as string[] | undefined) ?? [],
        allowedSsids: ((g as any).allowed_ssids as string[] | undefined) ?? [],
      }));

    // --- Network-based (IP) match is the primary cross-browser signal. -----
    // When the employee's request originates from an office's registered IP
    // we treat that zone as "inside" regardless of what the browser reports
    // for GPS. This is the only signal that behaves identically across
    // Chrome, Firefox, Safari, Edge, and mobile browsers.
    const currentIp = getSourceIp(req);
    const ipZone = allGeos.find((g) => ipMatchesAllowlist(currentIp, g.allowedIps));

    // --- Wi-Fi SSID claim (user-provided, cross-browser). -----------------
    // Browsers cannot read the SSID on their own, so the employee claims it
    // (one tap from the admin-published list) and the server verifies the
    // claim. Case-insensitive.
    const claimedSsid = v.data.ssid ?? null;
    const ssidZone = claimedSsid
      ? allGeos.find((g) => ssidMatchesAllowlist(claimedSsid, g.allowedSsids))
      : undefined;

    // --- Geolocation resolution (secondary / precision signal). -----------
    const hasFix =
      typeof v.data.lat === "number" &&
      typeof v.data.lng === "number" &&
      Number.isFinite(v.data.lat) &&
      Number.isFinite(v.data.lng);
    const insideRes = resolveInsideGeofence({
      point: hasFix
        ? { lat: v.data.lat!, lng: v.data.lng!, accuracyM: v.data.accuracyM ?? 0 }
        : // No GPS fix: pass NaN accuracy so geo.util returns reason:"no_fix"
          // rather than computing a bogus distance from (0,0).
          { lat: 0, lng: 0, accuracyM: NaN },
      geofences: allGeos,
      previousZoneId: device?.last_zone_id ?? null,
    });

    // Merge signals. Precedence: geo > ip > ssid. Any match counts as inside.
    const resolvedZoneId =
      insideRes.insideZoneId || ipZone?.id || ssidZone?.id || null;
    const matchedVia: "geo" | "ip" | "ssid" | "none" = insideRes.insideZoneId
      ? "geo"
      : ipZone
      ? "ip"
      : ssidZone
      ? "ssid"
      : "none";
    const newInside = !!resolvedZoneId;
    const now = new Date();
    const nowIso = now.toISOString();

    // Track when inside/outside state changed to enforce exit grace.
    const prevInside = !!device?.last_inside_state;
    const prevStateAt = device?.last_inside_state_at ? new Date(device.last_inside_state_at).getTime() : 0;
    const stateAtIso = newInside === prevInside ? (device?.last_inside_state_at || nowIso) : nowIso;

    const today = new Date().toISOString().split("T")[0];
    const todays = await getAttendanceRecords({ employeeId, date: today });
    const existing = (todays as any[]).find((r) => String(r.employee_id) === employeeId) || null;

    let action: "checked_in" | "checked_out" | "none" = "none";
    let attendanceRow: any = existing;

    // Auto-register device when we can confirm the user is in-office via
    // either geo OR IP. Registering on IP alone enables office attendance for
    // browsers that refuse geolocation (a common case on corporate laptops).
    if (!device && resolvedZoneId) {
      device = await registerEmployeeDevice({
        employeeId,
        deviceId: v.data.deviceId,
        deviceLabel: "Employee device",
        lat: hasFix ? v.data.lat : null,
        lng: hasFix ? v.data.lng : null,
        accuracyM: hasFix ? v.data.accuracyM ?? null : null,
        insideState: true,
        insideZoneId: resolvedZoneId,
      });
    }

    if (newInside && !existing) {
      const zoneIdForHours = resolvedZoneId;
      const zoneForHours = zoneIdForHours ? allGeos.find((g) => g.id === zoneIdForHours) : undefined;
      const tz = zoneForHours?.timeZone || "Africa/Lagos";
      const nowMin = getNowMinutesInTimeZone(tz, now);
      const openMin = parseHHMM(zoneForHours?.openTime || "00:00");
      const closeMin = parseHHMM(zoneForHours?.closeTime || "23:59");
      const withinHours =
        nowMin != null && openMin != null && closeMin != null
          ? isWithinOfficeHours({ nowMin, openMin, closeMin })
          : true;
      if (!withinHours) {
        // do not check in outside office hours
      } else {
      const t = toTimeHHMM(now);
      const status = t > "09:00" ? "Late" : "Present";
      attendanceRow = await createAttendance({
        employeeId,
        date: today,
        checkIn: t,
        status,
        source: "auto",
        deviceId: v.data.deviceId,
        geoLat: hasFix ? v.data.lat : null,
        geoLng: hasFix ? v.data.lng : null,
        geoAccuracyM: hasFix ? v.data.accuracyM ?? null : null,
      });
      action = "checked_in";
      }
    }

    if (!newInside && existing && !existing.check_out) {
      const zoneId = device?.last_zone_id;
      const zone = zoneId ? allGeos.find((g) => g.id === zoneId) : undefined;
      const graceSeconds = zone?.exitGraceSeconds ?? 300;
      const changedAtMs = newInside === prevInside ? prevStateAt : now.getTime();
      const outsideForMs = now.getTime() - changedAtMs;
      if (outsideForMs >= graceSeconds * 1000) {
        const t = toTimeHHMM(now);
        attendanceRow = await updateAttendance(existing.id, { checkOut: t });
        action = "checked_out";
      }
    }

    if (device) {
      // Preserve last_zone_id while outside so exit-grace applies to the last known office.
      const nextZoneId = resolvedZoneId ?? device.last_zone_id;
      await updateEmployeeDeviceState({
        employeeId,
        deviceId: v.data.deviceId,
        lat: hasFix ? v.data.lat ?? null : null,
        lng: hasFix ? v.data.lng ?? null : null,
        accuracyM: hasFix ? v.data.accuracyM ?? null : null,
        insideState: newInside,
        insideZoneId: nextZoneId,
        insideStateAt: stateAtIso,
      });
    }

    // Notifications (email only on actual state transitions)
    if (action !== "none") {
      const email = String((emp as any)?.email || "");
      const name = String((emp as any)?.name || "Employee");
      const zoneName = resolvedZoneId
        ? allGeos.find((g) => g.id === resolvedZoneId)?.name
        : undefined;
      try {
        if (action === "checked_in") {
          await sendAttendanceCheckinEmail({
            to: email,
            name,
            date: today,
            checkInTime: attendanceRow?.check_in || attendanceRow?.checkIn || toTimeHHMM(now),
            locationName: zoneName || "Office",
          });
        } else if (action === "checked_out") {
          await sendAttendanceCheckoutEmail({
            to: email,
            name,
            date: today,
            checkOutTime: attendanceRow?.check_out || attendanceRow?.checkOut || toTimeHHMM(now),
            locationName: zoneName || "Office",
          });
        }
      } catch (e) {
        console.error("attendance notification failed:", e);
      }
    }

    return res.json({
      action,
      insideZoneId: resolvedZoneId,
      matchedVia,
      // `reason` reflects the geo reason unless only an alternative signal
      // matched; the UI uses this to render specific help text.
      reason: !insideRes.insideZoneId
        ? matchedVia === "ip"
          ? "inside_via_ip"
          : matchedVia === "ssid"
          ? "inside_via_ssid"
          : insideRes.reason
        : insideRes.reason,
      distanceM: insideRes.distanceM,
      nearest: {
        zoneId: insideRes.nearestZoneId,
        zoneName: insideRes.nearestZoneName,
        distanceM: insideRes.nearestDistanceM,
        radiusM: insideRes.nearestRadiusM,
        maxAccuracyM: insideRes.nearestMaxAccuracyM,
      },
      yourLocation: hasFix
        ? { lat: v.data.lat, lng: v.data.lng, accuracyM: v.data.accuracyM ?? 0 }
        : null,
      network: {
        ip: currentIp,
        recognized: !!ipZone,
        zoneId: ipZone?.id ?? null,
        zoneName: ipZone?.name ?? null,
      },
      wifi: {
        claimedSsid,
        recognized: !!ssidZone,
        zoneId: ssidZone?.id ?? null,
        zoneName: ssidZone?.name ?? null,
      },
      attendance: attendanceRow
        ? {
            id: attendanceRow.id,
            employeeId: attendanceRow.employee_id,
            employee: attendanceRow.employee_name,
            date: attendanceRow.date,
            checkIn: attendanceRow.check_in,
            checkOut: attendanceRow.check_out,
            status: attendanceRow.status,
            department: attendanceRow.department,
          }
        : null,
    });
  } catch (e) {
    console.error("autoEvaluateAttendanceController:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

