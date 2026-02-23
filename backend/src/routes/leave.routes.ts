import { Router } from "express";
import {
  getLeaveRequestsController,
  getLeaveBalanceController,
  createLeaveRequestController,
  updateLeaveRequestController,
} from "../controllers/leave.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.get("/requests", getLeaveRequestsController);
router.get("/balance/:employeeId", getLeaveBalanceController);
router.get("/requests/:employeeId", getLeaveRequestsController);
router.post("/requests", createLeaveRequestController);
router.put("/requests/:id", updateLeaveRequestController);

export default router;

