import { apiClient } from "./client.js";
import { LeaveRequest, LeaveBalance } from "@/types";

export const leaveApi = {
  getRequests: async (filters?: { employeeId?: string; status?: string }): Promise<{ leaveRequests: LeaveRequest[] }> => {
    const params = new URLSearchParams();
    if (filters?.employeeId) params.append("employeeId", filters.employeeId);
    if (filters?.status) params.append("status", filters.status);
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get<{ leaveRequests: LeaveRequest[] }>(`/leave/requests${query}`);
  },

  getBalance: async (employeeId: string): Promise<{ balance: LeaveBalance }> => {
    return apiClient.get<{ balance: LeaveBalance }>(`/leave/balance/${employeeId}`);
  },

  createRequest: async (request: Omit<LeaveRequest, "id" | "employee" | "days" | "status">): Promise<{ leaveRequest: LeaveRequest }> => {
    return apiClient.post<{ leaveRequest: LeaveRequest }>("/leave/requests", request);
  },

  updateRequest: async (id: string, status: "Approved" | "Rejected" | "Pending"): Promise<{ leaveRequest: LeaveRequest }> => {
    return apiClient.put<{ leaveRequest: LeaveRequest }>(`/leave/requests/${id}`, { status });
  },
};

