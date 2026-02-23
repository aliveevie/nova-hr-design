import { Router } from "express";
import {
  getAttendanceController,
  getEmployeeAttendanceController,
  checkInController,
  checkOutController,
  updateAttendanceController,
  getSummaryController,
} from "../controllers/attendance.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.get("/", getAttendanceController);
router.get("/summary", getSummaryController);
router.get("/:employeeId", getEmployeeAttendanceController);
router.post("/checkin", checkInController);
router.post("/checkout", checkOutController);
router.put("/:id", updateAttendanceController);

export default router;

