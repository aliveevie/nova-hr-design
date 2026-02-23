import { Router } from "express";
import {
  getDisciplinesController,
  getDisciplineController,
  createDisciplineController,
  updateDisciplineController,
  deleteDisciplineController,
} from "../controllers/discipline.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.get("/", getDisciplinesController);
router.get("/:employeeId", getDisciplinesController);
router.get("/detail/:id", getDisciplineController);
router.post("/", createDisciplineController);
router.put("/:id", updateDisciplineController);
router.delete("/:id", deleteDisciplineController);

export default router;

