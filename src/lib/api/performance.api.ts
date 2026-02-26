import { apiClient } from "./client.js";
import { PerformanceRecord } from "@/types";

export const performanceApi = {
  getAll: async (filters?: { employeeId?: string }): Promise<{ performances: PerformanceRecord[] }> => {
    const params = new URLSearchParams();
    if (filters?.employeeId) params.append("employeeId", filters.employeeId);
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get<{ performances: PerformanceRecord[] }>(`/performance${query}`);
  },

  getByEmployee: async (employeeId: string): Promise<{ performances: PerformanceRecord[] }> => {
    return apiClient.get<{ performances: PerformanceRecord[] }>(`/performance?employeeId=${employeeId}`);
  },

  create: async (performance: Omit<PerformanceRecord, "id" | "employee" | "department">): Promise<{ performance: PerformanceRecord }> => {
    return apiClient.post<{ performance: PerformanceRecord }>("/performance", performance);
  },

  update: async (id: string, performance: Partial<PerformanceRecord>): Promise<{ performance: PerformanceRecord }> => {
    return apiClient.put<{ performance: PerformanceRecord }>(`/performance/${id}`, performance);
  },
};

