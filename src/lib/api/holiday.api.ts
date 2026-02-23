import { apiClient } from "./client.js";
import { Holiday } from "@/types";

export const holidayApi = {
  getAll: async (): Promise<{ holidays: Holiday[] }> => {
    return apiClient.get<{ holidays: Holiday[] }>("/holidays");
  },

  getById: async (id: string): Promise<{ holiday: Holiday }> => {
    return apiClient.get<{ holiday: Holiday }>(`/holidays/${id}`);
  },

  create: async (holiday: Omit<Holiday, "id">): Promise<{ holiday: Holiday }> => {
    return apiClient.post<{ holiday: Holiday }>("/holidays", holiday);
  },

  update: async (id: string, holiday: Partial<Holiday>): Promise<{ holiday: Holiday }> => {
    return apiClient.put<{ holiday: Holiday }>(`/holidays/${id}`, holiday);
  },

  delete: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/holidays/${id}`);
  },
};

