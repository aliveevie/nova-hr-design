import { Router } from "express";
import {
  getEmployeesController,
  getEmployeeController,
  createEmployeeController,
  updateEmployeeController,
  deleteEmployeeController,
} from "../controllers/employee.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.get("/", getEmployeesController);
router.get("/:id", getEmployeeController);
router.post("/", createEmployeeController);
router.put("/:id", updateEmployeeController);
router.delete("/:id", deleteEmployeeController);

export default router;

