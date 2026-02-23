import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import {
  getAllApplicants,
  getApplicantById,
  createApplicant,
  updateApplicant,
  deleteApplicant,
} from "../services/recruitment.service.js";
import { applicantSchema } from "../utils/validators.js";
import { sendApplicantStatusEmail } from "../services/email.service.js";

export const getApplicantsController = async (req: AuthRequest, res: Response) => {
  try {
    const applicants = await getAllApplicants();
    const transformed = applicants.map((a: any) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      position: a.position,
      appliedDate: a.applied_date,
      status: a.status,
      initials: a.initials,
      interviewNotes: a.interview_notes || "",
      onboardingChecklist: {
        documentSubmission: a.onboarding_document_submission === 1,
        accountCreation: a.onboarding_account_creation === 1,
        equipmentAssignment: a.onboarding_equipment_assignment === 1,
        orientationCompletion: a.onboarding_orientation_completion === 1,
      },
    }));
    res.json({ applicants: transformed });
  } catch (error) {
    console.error("Get applicants error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getApplicantController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const applicant = await getApplicantById(id);
    if (!applicant) {
      return res.status(404).json({ error: "Applicant not found" });
    }

    const transformed = {
      id: applicant.id,
      name: applicant.name,
      email: applicant.email,
      position: applicant.position,
      appliedDate: applicant.applied_date,
      status: applicant.status,
      initials: applicant.initials,
      interviewNotes: applicant.interview_notes || "",
      onboardingChecklist: {
        documentSubmission: applicant.onboarding_document_submission === 1,
        accountCreation: applicant.onboarding_account_creation === 1,
        equipmentAssignment: applicant.onboarding_equipment_assignment === 1,
        orientationCompletion: applicant.onboarding_orientation_completion === 1,
      },
    };

    res.json({ applicant: transformed });
  } catch (error) {
    console.error("Get applicant error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createApplicantController = async (req: AuthRequest, res: Response) => {
  try {
    const validation = applicantSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid data", details: validation.error.errors });
    }

    const applicant = await createApplicant(validation.data);
    const transformed = {
      id: applicant.id,
      name: applicant.name,
      email: applicant.email,
      position: applicant.position,
      appliedDate: applicant.applied_date,
      status: applicant.status,
      initials: applicant.initials,
      interviewNotes: applicant.interview_notes || "",
      onboardingChecklist: {
        documentSubmission: applicant.onboarding_document_submission === 1,
        accountCreation: applicant.onboarding_account_creation === 1,
        equipmentAssignment: applicant.onboarding_equipment_assignment === 1,
        orientationCompletion: applicant.onboarding_orientation_completion === 1,
      },
    };

    res.status(201).json({ applicant: transformed });
  } catch (error) {
    console.error("Create applicant error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateApplicantController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await getApplicantById(id);
    if (!existing) {
      return res.status(404).json({ error: "Applicant not found" });
    }

    const oldStatus = existing.status;
    const applicant = await updateApplicant(id, req.body);

    // Send email if status changed
    if (req.body.status && req.body.status !== oldStatus) {
      sendApplicantStatusEmail(
        applicant.email,
        applicant.name,
        applicant.position,
        applicant.status
      ).catch((err) => console.error("Failed to send status email:", err));
    }

    const transformed = {
      id: applicant.id,
      name: applicant.name,
      email: applicant.email,
      position: applicant.position,
      appliedDate: applicant.applied_date,
      status: applicant.status,
      initials: applicant.initials,
      interviewNotes: applicant.interview_notes || "",
      onboardingChecklist: {
        documentSubmission: applicant.onboarding_document_submission === 1,
        accountCreation: applicant.onboarding_account_creation === 1,
        equipmentAssignment: applicant.onboarding_equipment_assignment === 1,
        orientationCompletion: applicant.onboarding_orientation_completion === 1,
      },
    };

    res.json({ applicant: transformed });
  } catch (error) {
    console.error("Update applicant error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteApplicantController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const applicant = await getApplicantById(id);
    if (!applicant) {
      return res.status(404).json({ error: "Applicant not found" });
    }

    await deleteApplicant(id);
    res.json({ message: "Applicant deleted successfully" });
  } catch (error) {
    console.error("Delete applicant error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

