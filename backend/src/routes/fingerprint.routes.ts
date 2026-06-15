import { Router } from "express";
import {
  fingerprintStatusController,
  listScannersController,
  upsertScannerController,
  listEmployeeTemplatesController,
  enrollEmployeeFingerprintController,
  deactivateTemplateController,
  scanAttendanceController,
  listFingerprintLogsController,
  enrollmentOverviewController,
} from "../controllers/fingerprint.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/status", requireRole("HR Admin", "Manager"), fingerprintStatusController);

router.get("/scanners", requireRole("HR Admin", "Manager"), listScannersController);
router.post("/scanners", requireRole("HR Admin", "Manager"), upsertScannerController);

router.get(
  "/enrollment/overview",
  requireRole("HR Admin", "Manager"),
  enrollmentOverviewController
);

router.get(
  "/employees/:employeeId/templates",
  requireRole("HR Admin", "Manager"),
  listEmployeeTemplatesController
);
router.post(
  "/employees/:employeeId/enroll",
  requireRole("HR Admin", "Manager"),
  enrollEmployeeFingerprintController
);
router.delete(
  "/templates/:templateId",
  requireRole("HR Admin", "Manager"),
  deactivateTemplateController
);

router.post("/attendance/scan", requireRole("HR Admin", "Manager"), scanAttendanceController);
router.get("/attendance/logs", requireRole("HR Admin", "Manager"), listFingerprintLogsController);

export default router;
