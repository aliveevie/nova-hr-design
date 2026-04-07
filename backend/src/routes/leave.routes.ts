import { Router } from "express";
import {
  getLeaveRequestsController,
  getLeaveBalanceController,
  createLeaveRequestController,
  updateLeaveRequestController,
} from "../controllers/leave.controller.js";
import { authenticate, enforceEmployeeAccess, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.use(enforceEmployeeAccess); // Enforce employee access restrictions
router.get("/requests", getLeaveRequestsController);
router.get("/balance/:employeeId", getLeaveBalanceController);
router.post("/requests", createLeaveRequestController);
router.put("/requests/:id", requireRole("HR Admin", "Manager"), updateLeaveRequestController);

export default router;

