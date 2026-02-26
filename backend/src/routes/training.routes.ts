import { Router } from "express";
import {
  getTrainingsController,
  getTrainingController,
  createTrainingController,
  updateTrainingController,
  deleteTrainingController,
} from "../controllers/training.controller.js";
import { authenticate, enforceEmployeeAccess, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.use(enforceEmployeeAccess); // Enforce employee access restrictions
router.get("/", getTrainingsController);
router.get("/detail/:id", getTrainingController);
router.post("/", requireRole("HR Admin", "Manager"), createTrainingController);
router.put("/:id", requireRole("HR Admin", "Manager"), updateTrainingController);
router.delete("/:id", requireRole("HR Admin", "Manager"), deleteTrainingController);

export default router;

