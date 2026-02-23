import { Router } from "express";
import {
  getPerformancesController,
  getPerformanceController,
  createPerformanceController,
  updatePerformanceController,
} from "../controllers/performance.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.get("/", getPerformancesController);
router.get("/:employeeId", getPerformanceController);
router.post("/", createPerformanceController);
router.put("/:id", updatePerformanceController);

export default router;

