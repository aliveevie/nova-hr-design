import { Router } from "express";
import {
  getPerformancesController,
  getPerformanceController,
  createPerformanceController,
  updatePerformanceController,
} from "../controllers/performance.controller.js";
import { authenticate, enforceEmployeeAccess, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.use(enforceEmployeeAccess); // Enforce employee access restrictions
router.get("/", getPerformancesController);
router.get("/detail/:id", getPerformanceController);
router.post("/", requireRole("HR Admin", "Manager"), createPerformanceController);
router.put("/:id", requireRole("HR Admin", "Manager"), updatePerformanceController);

export default router;

