import { Router } from "express";
import {
  getTrainingsController,
  getTrainingController,
  createTrainingController,
  updateTrainingController,
  deleteTrainingController,
} from "../controllers/training.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.get("/", getTrainingsController);
router.get("/:employeeId", getTrainingsController);
router.get("/detail/:id", getTrainingController);
router.post("/", createTrainingController);
router.put("/:id", updateTrainingController);
router.delete("/:id", deleteTrainingController);

export default router;

