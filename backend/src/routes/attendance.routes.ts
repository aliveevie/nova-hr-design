import { Router } from "express";
import {
  getAttendanceController,
  getEmployeeAttendanceController,
  checkInController,
  checkOutController,
  updateAttendanceController,
  getSummaryController,
  autoEvaluateAttendanceController,
  deleteOfficeLocationController,
  getEmployeeOfficeLocationController,
  listOfficeLocationsController,
  registerAttendanceDeviceController,
  upsertOfficeLocationController,
} from "../controllers/attendance.controller.js";
import { authenticate, enforceEmployeeAccess, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.use(enforceEmployeeAccess);
router.get("/", getAttendanceController);
router.get("/summary", requireRole("HR Admin", "Manager"), getSummaryController);
router.get("/offices", requireRole("HR Admin", "Manager"), listOfficeLocationsController);
router.post("/offices", requireRole("HR Admin", "Manager"), upsertOfficeLocationController);
router.delete("/offices/:id", requireRole("HR Admin", "Manager"), deleteOfficeLocationController);
router.get("/office", requireRole("Employee"), getEmployeeOfficeLocationController);
router.get("/:employeeId", getEmployeeAttendanceController);
router.post("/checkin", checkInController);
router.post("/checkout", checkOutController);
router.post("/device/register", requireRole("Employee"), registerAttendanceDeviceController);
router.post("/device/auto", requireRole("Employee"), autoEvaluateAttendanceController);
router.put("/:id", updateAttendanceController);

export default router;

