import { Router } from "express";
import multer from "multer";
import {
  getEmployeesController,
  getEmployeeController,
  createEmployeeController,
  updateEmployeeController,
  deleteEmployeeController,
  bulkUploadEmployeesController,
  uploadEmployeeJobProfileController,
  uploadEmployeeOkrTemplateController,
  uploadEmployeeOkrSubmissionController,
  getEmployeeWorkDocsController,
  downloadEmployeeWorkDocController,
} from "../controllers/employee.controller.js";
import { authenticate, enforceEmployeeAccess, requireRole } from "../middleware/auth.middleware.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.use(authenticate);
router.use(enforceEmployeeAccess); // Enforce employee access restrictions
router.get("/", requireRole("HR Admin", "Manager"), getEmployeesController);
router.post("/bulk-upload", requireRole("HR Admin", "Manager"), upload.single("file"), bulkUploadEmployeesController);
router.get("/:id", getEmployeeController); // Employees can view their own record
router.get("/:id/work-docs", getEmployeeWorkDocsController);
router.get("/:id/work-docs/:kind/download", downloadEmployeeWorkDocController);
router.post("/:id/job-profile", upload.single("file"), uploadEmployeeJobProfileController);
router.post("/:id/okr-template", upload.single("file"), uploadEmployeeOkrTemplateController);
router.post("/:id/okr-submission", upload.single("file"), uploadEmployeeOkrSubmissionController);
router.post("/", requireRole("HR Admin", "Manager"), createEmployeeController);
router.put("/:id", updateEmployeeController); // Employees can update their own next of kin
router.delete("/:id", requireRole("HR Admin", "Manager"), deleteEmployeeController);

export default router;

