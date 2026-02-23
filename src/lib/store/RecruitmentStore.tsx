import { createContext, useContext, useState, ReactNode } from "react";
import { Applicant } from "@/types";
import { applicants as initialApplicants } from "@/lib/mockData";

interface RecruitmentContextType {
  applicants: Applicant[];
  addApplicant: (applicant: Omit<Applicant, "id" | "initials">) => void;
  updateApplicant: (id: string, applicant: Partial<Applicant>) => void;
  deleteApplicant: (id: string) => void;
  getApplicant: (id: string) => Applicant | undefined;
}

const RecruitmentContext = createContext<RecruitmentContextType | undefined>(undefined);

export const RecruitmentProvider = ({ children }: { children: ReactNode }) => {
  const [applicants, setApplicants] = useState<Applicant[]>(initialApplicants);

  const addApplicant = (applicant: Omit<Applicant, "id" | "initials">) => {
    const newApplicant: Applicant = {
      ...applicant,
      id: String(applicants.length + 1),
      initials: applicant.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
      interviewNotes: applicant.interviewNotes || "",
      onboardingChecklist: applicant.onboardingChecklist || {
        documentSubmission: false,
        accountCreation: false,
        equipmentAssignment: false,
        orientationCompletion: false,
      },
    };
    setApplicants([...applicants, newApplicant]);
  };

  const updateApplicant = (id: string, updates: Partial<Applicant>) => {
    setApplicants(applicants.map((app) => (app.id === id ? { ...app, ...updates } : app)));
  };

  const deleteApplicant = (id: string) => {
    setApplicants(applicants.filter((app) => app.id !== id));
  };

  const getApplicant = (id: string) => {
    return applicants.find((app) => app.id === id);
  };

  return (
    <RecruitmentContext.Provider value={{ applicants, addApplicant, updateApplicant, deleteApplicant, getApplicant }}>
      {children}
    </RecruitmentContext.Provider>
  );
};

export const useRecruitment = () => {
  const context = useContext(RecruitmentContext);
  if (context === undefined) {
    throw new Error("useRecruitment must be used within a RecruitmentProvider");
  }
  return context;
};

