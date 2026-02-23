import { apiClient } from "./client.js";
import { Employee } from "@/types";

export const employeeApi = {
  getAll: async (filters?: { department?: string; status?: string }): Promise<{ employees: Employee[] }> => {
    const params = new URLSearchParams();
    if (filters?.department) params.append("department", filters.department);
    if (filters?.status) params.append("status", filters.status);
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get<{ employees: Employee[] }>(`/employees${query}`);
  },

  getById: async (id: string): Promise<{ employee: Employee }> => {
    return apiClient.get<{ employee: Employee }>(`/employees/${id}`);
  },

  create: async (employee: Omit<Employee, "id" | "initials">): Promise<{ employee: Employee }> => {
    return apiClient.post<{ employee: Employee }>("/employees", employee);
  },

  update: async (id: string, employee: Partial<Employee>): Promise<{ employee: Employee }> => {
    return apiClient.put<{ employee: Employee }>(`/employees/${id}`, employee);
  },

  delete: async (id: string): Promise<{ message: string }> => {
    return apiClient.delete<{ message: string }>(`/employees/${id}`);
  },
};

