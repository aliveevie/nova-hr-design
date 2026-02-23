import { getDatabase, dbHelpers } from "../config/database.js";
import { randomUUID } from "crypto";

export const getAllApplicants = async () => {
  await dbHelpers.read();
  const db = getDatabase();
  return db.data.applicants.sort((a, b) => 
    new Date(b.applied_date || 0).getTime() - new Date(a.applied_date || 0).getTime()
  );
};

export const getApplicantById = async (id: string) => {
  await dbHelpers.read();
  const db = getDatabase();
  return db.data.applicants.find((a) => a.id === id);
};

export const createApplicant = async (applicantData: any) => {
  await dbHelpers.read();
  const db = getDatabase();
  const id = randomUUID();
  const initials = applicantData.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const newApplicant = {
    id,
    name: applicantData.name,
    email: applicantData.email,
    position: applicantData.position,
    applied_date: applicantData.appliedDate,
    status: applicantData.status,
    initials,
    interview_notes: applicantData.interviewNotes || "",
    onboarding_document_submission: 0,
    onboarding_account_creation: 0,
    onboarding_equipment_assignment: 0,
    onboarding_orientation_completion: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.data.applicants.push(newApplicant);
  await dbHelpers.write();
  return newApplicant;
};

export const updateApplicant = async (id: string, applicantData: any) => {
  await dbHelpers.read();
  const db = getDatabase();
  const index = db.data.applicants.findIndex((a) => a.id === id);
  if (index === -1) {
    return null;
  }

  const existing = db.data.applicants[index];
  db.data.applicants[index] = {
    ...existing,
    name: applicantData.name || existing.name,
    email: applicantData.email || existing.email,
    position: applicantData.position || existing.position,
    applied_date: applicantData.appliedDate || existing.applied_date,
    status: applicantData.status || existing.status,
    interview_notes: applicantData.interviewNotes !== undefined ? applicantData.interviewNotes : existing.interview_notes,
    onboarding_document_submission: applicantData.onboardingChecklist?.documentSubmission ? 1 : (existing.onboarding_document_submission || 0),
    onboarding_account_creation: applicantData.onboardingChecklist?.accountCreation ? 1 : (existing.onboarding_account_creation || 0),
    onboarding_equipment_assignment: applicantData.onboardingChecklist?.equipmentAssignment ? 1 : (existing.onboarding_equipment_assignment || 0),
    onboarding_orientation_completion: applicantData.onboardingChecklist?.orientationCompletion ? 1 : (existing.onboarding_orientation_completion || 0),
    updated_at: new Date().toISOString(),
  };

  await dbHelpers.write();
  return db.data.applicants[index];
};

export const deleteApplicant = async (id: string) => {
  await dbHelpers.read();
  const db = getDatabase();
  db.data.applicants = db.data.applicants.filter((a) => a.id !== id);
  await dbHelpers.write();
  return true;
};
