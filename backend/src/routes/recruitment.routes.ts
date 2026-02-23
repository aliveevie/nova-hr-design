import { Router } from "express";
import {
  getApplicantsController,
  getApplicantController,
  createApplicantController,
  updateApplicantController,
  deleteApplicantController,
} from "../controllers/recruitment.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);
router.get("/", getApplicantsController);
router.get("/:id", getApplicantController);
router.post("/", createApplicantController);
router.put("/:id", updateApplicantController);
router.delete("/:id", deleteApplicantController);

export default router;

