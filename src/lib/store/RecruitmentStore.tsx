import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Applicant } from "@/types";
import { recruitmentApi } from "@/lib/api";

interface RecruitmentContextType {
  applicants: Applicant[];
  addApplicant: (applicant: Omit<Applicant, "id" | "initials">) => Promise<void>;
  updateApplicant: (id: string, applicant: Partial<Applicant>) => Promise<void>;
  deleteApplicant: (id: string) => Promise<void>;
  getApplicant: (id: string) => Applicant | undefined;
  refreshApplicants: () => Promise<void>;
}

const RecruitmentContext = createContext<RecruitmentContextType | undefined>(undefined);

export const RecruitmentProvider = ({ children }: { children: ReactNode }) => {
  const [applicants, setApplicants] = useState<Applicant[]>([]);

  const refreshApplicants = async () => {
    try {
      const response = await recruitmentApi.getAll();
      setApplicants(response.applicants);
    } catch (error) {
      console.error("Error fetching applicants:", error);
    }
  };

  useEffect(() => {
    refreshApplicants();
  }, []);

  const addApplicant = async (applicant: Omit<Applicant, "id" | "initials">) => {
    try {
      const response = await recruitmentApi.create(applicant);
      setApplicants([...applicants, response.applicant]);
    } catch (error) {
      console.error("Error adding applicant:", error);
      throw error;
    }
  };

  const updateApplicant = async (id: string, updates: Partial<Applicant>) => {
    try {
      const response = await recruitmentApi.update(id, updates);
      setApplicants(applicants.map((app) => (app.id === id ? response.applicant : app)));
    } catch (error) {
      console.error("Error updating applicant:", error);
      throw error;
    }
  };

  const deleteApplicant = async (id: string) => {
    try {
      await recruitmentApi.delete(id);
      setApplicants(applicants.filter((app) => app.id !== id));
    } catch (error) {
      console.error("Error deleting applicant:", error);
      throw error;
    }
  };

  const getApplicant = (id: string) => {
    return applicants.find((app) => app.id === id);
  };

  return (
    <RecruitmentContext.Provider
      value={{ applicants, addApplicant, updateApplicant, deleteApplicant, getApplicant, refreshApplicants }}
    >
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
