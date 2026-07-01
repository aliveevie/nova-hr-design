import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import {
  enrollEmployeeFingerprint,
  deactivateFingerprintTemplate,
  listEmployeeFingerprintTemplates,
  listFingerprintScanners,
  upsertFingerprintScanner,
  processFingerprintAttendanceScan,
  listFingerprintAttendanceLogs,
  getFingerprintScannerStatus,
  getEnrollmentOverviewForAdmin,
  FingerprintScanError,
  RECOMMENDED_FINGER_POSITIONS,
  MAX_FINGERS_PER_EMPLOYEE,
  FINGER_POSITIONS,
} from "../services/fingerprint.service.js";
import { getEmployeeById } from "../services/employee.service.js";

const getAdminOwnerId = (req: AuthRequest) => req.user?.userId || "";

export const fingerprintStatusController = async (_req: AuthRequest, res: Response) => {
  try {
    const status = await getFingerprintScannerStatus();
    res.json(status);
  } catch (e) {
    console.error("fingerprintStatusController:", e);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const listScannersController = async (req: AuthRequest, res: Response) => {
  try {
    const rows = await listFingerprintScanners(getAdminOwnerId(req));
    res.json({
      scanners: rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        deviceLabel: r.device_label,
        locationNote: r.location_note,
        enabled: r.enabled,
        createdAt: r.created_at,
      })),
    });
  } catch (e) {
    console.error("listScannersController:", e);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const upsertScannerController = async (req: AuthRequest, res: Response) => {
  try {
    const { id, name, deviceLabel, locationNote, enabled } = req.body;
    if (!name) return res.status(400).json({ error: "Scanner name is required" });
    const row = await upsertFingerprintScanner(getAdminOwnerId(req), {
      id,
      name,
      deviceLabel,
      locationNote,
      enabled,
    });
    res.json({
      scanner: {
        id: row.id,
        name: row.name,
        deviceLabel: row.device_label,
        locationNote: row.location_note,
        enabled: row.enabled,
      },
    });
  } catch (e) {
    console.error("upsertScannerController:", e);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const enrollmentOverviewController = async (req: AuthRequest, res: Response) => {
  try {
    const employees = await getEnrollmentOverviewForAdmin(getAdminOwnerId(req));
    res.json({
      employees,
      maxFingers: MAX_FINGERS_PER_EMPLOYEE,
      recommendedFingers: RECOMMENDED_FINGER_POSITIONS,
    });
  } catch (e) {
    console.error("enrollmentOverviewController:", e);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const listEmployeeTemplatesController = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId } = req.params;
    const emp = await getEmployeeById(employeeId);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    if (req.user?.role !== "Employee") {
      const adminId = getAdminOwnerId(req);
      if (String((emp as any).admin_owner_id) !== adminId) {
        return res.status(403).json({ error: "Forbidden" });
      }
    } else if (req.user.employeeId !== employeeId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const rows = await listEmployeeFingerprintTemplates(employeeId);
    const enrolledPositions = rows.map((t: any) => t.finger_position);
    const nextFinger = RECOMMENDED_FINGER_POSITIONS.find(
      (f) => !enrolledPositions.includes(f.value)
    );

    res.json({
      templates: rows.map((t: any) => ({
        id: t.id,
        employeeId: t.employee_id,
        fingerPosition: t.finger_position,
        templateFormat: t.template_format,
        scannerLabel: t.scanner_label,
        enrolledAt: t.enrolled_at,
        isActive: t.is_active,
      })),
      fingerPositions: FINGER_POSITIONS,
      recommendedFingers: RECOMMENDED_FINGER_POSITIONS,
      maxFingers: MAX_FINGERS_PER_EMPLOYEE,
      enrolledCount: rows.length,
      isFullyEnrolled: rows.length >= MAX_FINGERS_PER_EMPLOYEE,
      nextRecommendedFinger: nextFinger?.value ?? null,
      nextRecommendedLabel: nextFinger?.label ?? null,
      nextRecommendedHint: nextFinger?.hint ?? null,
    });
  } catch (e) {
    console.error("listEmployeeTemplatesController:", e);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const enrollEmployeeFingerprintController = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { fingerPosition, scannerLabel, imageB64, dpi } = req.body;
    if (!fingerPosition) {
      return res.status(400).json({ error: "fingerPosition is required" });
    }
    if (!imageB64) {
      return res.status(400).json({ error: "imageB64 (captured fingerprint) is required" });
    }

    const emp = await getEmployeeById(employeeId);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    if (String((emp as any).admin_owner_id) !== getAdminOwnerId(req)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const result = await enrollEmployeeFingerprint({
      employeeId,
      fingerPosition,
      enrolledByUserId: getAdminOwnerId(req),
      scannerLabel,
      imageB64,
      dpi: typeof dpi === "number" ? dpi : undefined,
    });

    const fingerMeta = RECOMMENDED_FINGER_POSITIONS.find((f) => f.value === fingerPosition);

    res.status(201).json({
      template: {
        id: result.template.id,
        employeeId: result.template.employee_id,
        fingerPosition: result.template.finger_position,
        scannerLabel: result.template.scanner_label,
        enrolledAt: result.template.enrolled_at,
      },
      deviceName: result.deviceName,
      enrolledCount: result.enrolledCount,
      maxFingers: result.maxFingers,
      isFullyEnrolled: result.isFullyEnrolled,
      nextRecommendedFinger: result.nextRecommendedFinger,
      nextRecommendedLabel: result.nextRecommendedLabel,
      fingerLabel: fingerMeta?.label ?? fingerPosition,
      message: result.isFullyEnrolled
        ? "All recommended fingerprints enrolled successfully."
        : `${fingerMeta?.label ?? fingerPosition} enrolled successfully.`,
    });
  } catch (e: any) {
    console.error("enrollEmployeeFingerprintController:", e);
    const msg = String(e?.message || "");
    if (msg.includes("already has") || msg.includes("already enrolled")) {
      return res.status(409).json({ error: msg, code: "DUPLICATE_ENROLLMENT" });
    }
    if (msg.includes("matching engine") || msg.includes("matcher")) {
      return res.status(503).json({
        error: "Fingerprint matching engine unavailable on the server.",
        details: msg,
      });
    }
    if (msg.includes("read the fingerprint") || msg.includes("No fingerprint image")) {
      return res.status(422).json({ error: msg, code: "CAPTURE_FAILED" });
    }
    res.status(500).json({ error: msg || "Internal server error" });
  }
};

export const deactivateTemplateController = async (req: AuthRequest, res: Response) => {
  try {
    const { templateId } = req.params;
    const ok = await deactivateFingerprintTemplate(templateId, getAdminOwnerId(req));
    if (!ok) return res.status(404).json({ error: "Template not found" });
    res.json({ success: true });
  } catch (e) {
    console.error("deactivateTemplateController:", e);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const scanAttendanceController = async (req: AuthRequest, res: Response) => {
  try {
    const { scannerId, imageB64, dpi } = req.body;
    if (!imageB64) {
      return res.status(400).json({ error: "imageB64 (captured fingerprint) is required", code: "NO_IMAGE" });
    }
    const result = await processFingerprintAttendanceScan({
      adminOwnerId: getAdminOwnerId(req),
      scannerId: scannerId ?? null,
      imageB64,
      dpi: typeof dpi === "number" ? dpi : undefined,
    });
    res.json(result);
  } catch (e: any) {
    console.error("scanAttendanceController:", e);
    if (e instanceof FingerprintScanError) {
      return res.status(e.statusCode).json({
        error: e.message,
        code: e.code,
      });
    }
    const msg = String(e?.message || "");
    if (msg.includes("matcher") || msg.includes("engine")) {
      return res.status(503).json({ error: msg, code: "MATCHER_UNAVAILABLE" });
    }
    res.status(400).json({ error: msg || "Scan failed", code: "SCAN_FAILED" });
  }
};

export const listFingerprintLogsController = async (req: AuthRequest, res: Response) => {
  try {
    const date = typeof req.query.date === "string" ? req.query.date : undefined;
    const rows = await listFingerprintAttendanceLogs(getAdminOwnerId(req), { date });
    res.json({
      logs: rows.map((l: any) => ({
        id: l.id,
        employeeId: l.employee_id,
        employeeName: l.employee_name,
        department: l.department,
        eventType: l.event_type,
        matchScore: l.match_score,
        attendanceId: l.attendance_id,
        attendanceDate: l.attendance_date,
        message: l.message,
        createdAt: l.created_at,
      })),
    });
  } catch (e) {
    console.error("listFingerprintLogsController:", e);
    res.status(500).json({ error: "Internal server error" });
  }
};
