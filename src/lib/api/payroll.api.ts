import { apiClient } from "./client.js";
import { PayrollRecord } from "@/types";

export const payrollApi = {
  getAll: async (filters?: { employeeId?: string; month?: string; year?: string }): Promise<{ payrolls: PayrollRecord[] }> => {
    const params = new URLSearchParams();
    if (filters?.employeeId) params.append("employeeId", filters.employeeId);
    if (filters?.month) params.append("month", filters.month);
    if (filters?.year) params.append("year", filters.year);
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get<{ payrolls: PayrollRecord[] }>(`/payroll${query}`);
  },

  getById: async (id: string): Promise<{ payroll: PayrollRecord }> => {
    return apiClient.get<{ payroll: PayrollRecord }>(`/payroll/${id}`);
  },

  getByEmployee: async (employeeId: string): Promise<{ payrolls: PayrollRecord[] }> => {
    return apiClient.get<{ payrolls: PayrollRecord[] }>(`/payroll/employee/${employeeId}`);
  },

  create: async (payroll: Omit<PayrollRecord, "id" | "employee" | "department" | "netPay" | "status">): Promise<{ payroll: PayrollRecord }> => {
    return apiClient.post<{ payroll: PayrollRecord }>("/payroll", payroll);
  },

  update: async (id: string, status: "Paid" | "Pending"): Promise<{ payroll: PayrollRecord }> => {
    return apiClient.put<{ payroll: PayrollRecord }>(`/payroll/${id}`, { status });
  },
};

