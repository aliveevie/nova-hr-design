import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import {
  getAttendanceRecords,
  getAttendanceByEmployee,
  getAttendanceByDate,
  createAttendance,
  updateAttendance,
  getMonthlySummary,
  deleteOfficeLocation,
  getEmployeeDevice,
  listOfficeLocationsForAdmin,
  registerEmployeeDevice,
  upsertOfficeLocation,
  updateEmployeeDeviceState,
} from "../services/attendance.service.js";
import {
  attendanceSchema,
  autoAttendanceEvaluateSchema,
  deviceRegisterSchema,
  officeLocationSchema,
} from "../utils/validators.js";
import { getHrAdminAllowedEmployeeIds } from "../utils/hr-admin-scope.util.js";
import { canUserAccessEmployee } from "../utils/ownership-access.util.js";
import { resolveAdminOwnerForCreate, getEmployeeById } from "../services/employee.service.js";
import { resolveInsideGeofence } from "../utils/geo.util.js";
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
    const rows = await listOfficeLocationsForAdmin(adminOwnerId);
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
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    return res.json({ locations });
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
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (e) {
    console.error("upsertOfficeLocationController:", e);
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
        createdAt: loc.created_at,
        updatedAt: loc.updated_at,
      },
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

    const inside = resolveInsideGeofence({
      point: { lat: v.data.lat, lng: v.data.lng, accuracyM: v.data.accuracyM },
      geofences: geos,
      previousZoneId: null,
    });
    if (!inside.insideZoneId) {
      return res.status(400).json({ error: "You must be within an office location to register this device." });
    }

    const row = await registerEmployeeDevice({
      employeeId,
      deviceId: v.data.deviceId,
      deviceLabel: v.data.deviceLabel ?? null,
      lat: v.data.lat,
      lng: v.data.lng,
      accuracyM: v.data.accuracyM,
      insideState: true,
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
      },
    });
  } catch (e) {
    console.error("registerAttendanceDeviceController:", e);
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
      }));

    const insideRes = resolveInsideGeofence({
      point: { lat: v.data.lat, lng: v.data.lng, accuracyM: v.data.accuracyM },
      geofences: allGeos,
      previousZoneId: device?.last_zone_id ?? null,
    });

    const newInside = !!insideRes.insideZoneId;
    const now = new Date();
    const nowIso = now.toISOString();

    // Track when inside/outside state changed to enforce exit grace.
    const prevInside = !!device?.last_inside_state;
    const prevStateAt = device?.last_inside_state_at ? new Date(device.last_inside_state_at).getTime() : 0;
    const stateAtIso = newInside === prevInside ? (device.last_inside_state_at || nowIso) : nowIso;

    const today = new Date().toISOString().split("T")[0];
    const todays = await getAttendanceRecords({ employeeId, date: today });
    const existing = (todays as any[]).find((r) => String(r.employee_id) === employeeId) || null;

    let action: "checked_in" | "checked_out" | "none" = "none";
    let attendanceRow: any = existing;

    // Auto-register device when the user is in-office and we can resolve a zone.
    if (!device && insideRes.insideZoneId) {
      device = await registerEmployeeDevice({
        employeeId,
        deviceId: v.data.deviceId,
        deviceLabel: "Employee device",
        lat: v.data.lat,
        lng: v.data.lng,
        accuracyM: v.data.accuracyM,
        insideState: true,
        insideZoneId: insideRes.insideZoneId,
      });
    }

    if (newInside && !existing) {
      const zoneIdForHours = insideRes.insideZoneId;
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
        geoLat: v.data.lat,
        geoLng: v.data.lng,
        geoAccuracyM: v.data.accuracyM,
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
      const nextZoneId = insideRes.insideZoneId ?? device.last_zone_id;
      await updateEmployeeDeviceState({
        employeeId,
        deviceId: v.data.deviceId,
        lat: v.data.lat,
        lng: v.data.lng,
        accuracyM: v.data.accuracyM,
        insideState: newInside,
        insideZoneId: nextZoneId,
        insideStateAt: stateAtIso,
      });
    }

    // Notifications (email only on actual state transitions)
    if (action !== "none") {
      const email = String((emp as any)?.email || "");
      const name = String((emp as any)?.name || "Employee");
      const zoneName =
        insideRes.insideZoneId ? allGeos.find((g) => g.id === insideRes.insideZoneId)?.name : undefined;
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
      insideZoneId: insideRes.insideZoneId,
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

