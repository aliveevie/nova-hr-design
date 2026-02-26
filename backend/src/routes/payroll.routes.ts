import { Router } from "express";
import {
  getPayrollsController,
  getPayrollController,
  createPayrollController,
  updatePayrollController,
} from "../controllers/payroll.controller.js";
import { authenticate, enforceEmployeeAccess, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.use(enforceEmployeeAccess); // Enforce employee access restrictions
router.get("/", getPayrollsController);
router.get("/employee/:employeeId", getPayrollsController);
router.get("/:id", getPayrollController);
router.post("/", requireRole("HR Admin", "Manager"), createPayrollController);
router.put("/:id", requireRole("HR Admin", "Manager"), updatePayrollController);

export default router;

