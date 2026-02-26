import { Router } from "express";
import {
  getDisciplinesController,
  getDisciplineController,
  createDisciplineController,
  updateDisciplineController,
  deleteDisciplineController,
} from "../controllers/discipline.controller.js";
import { authenticate, enforceEmployeeAccess, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.use(enforceEmployeeAccess); // Enforce employee access restrictions
router.get("/", getDisciplinesController);
router.get("/detail/:id", getDisciplineController);
router.post("/", requireRole("HR Admin", "Manager"), createDisciplineController);
router.put("/:id", requireRole("HR Admin", "Manager"), updateDisciplineController);
router.delete("/:id", requireRole("HR Admin", "Manager"), deleteDisciplineController);

export default router;

