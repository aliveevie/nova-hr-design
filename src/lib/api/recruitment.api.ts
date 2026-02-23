import { apiClient } from "./client.js";
import { Applicant } from "@/types";

export const recruitmentApi = {
  getAll: async (): Promise<{ applicants: Applicant[] }> => {
    return apiClient.get<{ applicants: Applicant[] }>("/applicants");
  },

  getById: async (id: string): Promise<{ applicant: Applicant }> => {
    return apiClient.get<{ applicant: Applicant }>(`/applicants/${id}`);
  },

  create: async (applicant: Omit<Applicant, "id" | "initials">): Promise<{ applicant: Applicant }> => {
    return apiClient.post<{ applicant: Applicant }>("/applicants", applicant);
  },

  update: async (id: string, applicant: Partial<Applicant>): Promise<{ applicant: Applicant }> => {
    return apiClient.put<{ applicant: Applicant }>(`/applicants/${id}`, applicant);
  },

  delete: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/applicants/${id}`);
  },
};

