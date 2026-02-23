import { Router } from "express";
import {
  getPayrollsController,
  getPayrollController,
  createPayrollController,
  updatePayrollController,
} from "../controllers/payroll.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.get("/", getPayrollsController);
router.get("/employee/:employeeId", getPayrollsController);
router.get("/:id", getPayrollController);
router.post("/", createPayrollController);
router.put("/:id", updatePayrollController);

export default router;

