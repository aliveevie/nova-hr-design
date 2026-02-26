import { apiClient } from "./client.js";
import { DisciplineRecord } from "@/types";

export const disciplineApi = {
  getAll: async (filters?: { employeeId?: string }): Promise<{ disciplines: DisciplineRecord[] }> => {
    const params = new URLSearchParams();
    if (filters?.employeeId) params.append("employeeId", filters.employeeId);
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get<{ disciplines: DisciplineRecord[] }>(`/discipline${query}`);
  },

  getById: async (id: string): Promise<{ discipline: DisciplineRecord }> => {
    return apiClient.get<{ discipline: DisciplineRecord }>(`/discipline/detail/${id}`);
  },

  getByEmployee: async (employeeId: string): Promise<{ disciplines: DisciplineRecord[] }> => {
    return apiClient.get<{ disciplines: DisciplineRecord[] }>(`/discipline?employeeId=${employeeId}`);
  },

  create: async (discipline: Omit<DisciplineRecord, "id" | "employee">): Promise<{ discipline: DisciplineRecord }> => {
    return apiClient.post<{ discipline: DisciplineRecord }>("/discipline", discipline);
  },

  update: async (id: string, discipline: Partial<DisciplineRecord>): Promise<{ discipline: DisciplineRecord }> => {
    return apiClient.put<{ discipline: DisciplineRecord }>(`/discipline/${id}`, discipline);
  },

  delete: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/discipline/${id}`);
  },
};

