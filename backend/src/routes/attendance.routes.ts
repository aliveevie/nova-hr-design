import { Router } from "express";
import {
  getAttendanceController,
  getEmployeeAttendanceController,
  checkInController,
  checkOutController,
  updateAttendanceController,
  getSummaryController,
} from "../controllers/attendance.controller.js";
import { authenticate, enforceEmployeeAccess, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.use(enforceEmployeeAccess);
router.get("/", getAttendanceController);
router.get("/summary", requireRole("HR Admin", "Manager"), getSummaryController);
router.get("/:employeeId", getEmployeeAttendanceController);
router.post("/checkin", checkInController);
router.post("/checkout", checkOutController);
router.put("/:id", updateAttendanceController);

export default router;

