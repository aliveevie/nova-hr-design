import { apiClient } from "./client.js";
import { TrainingRecord } from "@/types";

export const trainingApi = {
  getAll: async (filters?: { employeeId?: string }): Promise<{ trainings: TrainingRecord[] }> => {
    const params = new URLSearchParams();
    if (filters?.employeeId) params.append("employeeId", filters.employeeId);
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get<{ trainings: TrainingRecord[] }>(`/training${query}`);
  },

  getById: async (id: string): Promise<{ training: TrainingRecord }> => {
    return apiClient.get<{ training: TrainingRecord }>(`/training/detail/${id}`);
  },

  getByEmployee: async (employeeId: string): Promise<{ trainings: TrainingRecord[] }> => {
    return apiClient.get<{ trainings: TrainingRecord[] }>(`/training?employeeId=${employeeId}`);
  },

  create: async (training: Omit<TrainingRecord, "id" | "employee">): Promise<{ training: TrainingRecord }> => {
    return apiClient.post<{ training: TrainingRecord }>("/training", training);
  },

  update: async (id: string, training: Partial<TrainingRecord>): Promise<{ training: TrainingRecord }> => {
    return apiClient.put<{ training: TrainingRecord }>(`/training/${id}`, training);
  },

  delete: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/training/${id}`);
  },
};

