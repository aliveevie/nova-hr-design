import { apiClient } from "./client.js";
import { AttendanceRecord } from "@/types";

export const attendanceApi = {
  getAll: async (filters?: { employeeId?: string; date?: string }): Promise<{ attendance: AttendanceRecord[] }> => {
    const params = new URLSearchParams();
    if (filters?.employeeId) params.append("employeeId", filters.employeeId);
    if (filters?.date) params.append("date", filters.date);
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get<{ attendance: AttendanceRecord[] }>(`/attendance${query}`);
  },

  getByEmployee: async (employeeId: string): Promise<{ attendance: AttendanceRecord[] }> => {
    return apiClient.get<{ attendance: AttendanceRecord[] }>(`/attendance/${employeeId}`);
  },

  checkIn: async (employeeId: string): Promise<{ attendance: AttendanceRecord }> => {
    return apiClient.post<{ attendance: AttendanceRecord }>("/attendance/checkin", { employeeId });
  },

  checkOut: async (employeeId: string): Promise<{ attendance: AttendanceRecord }> => {
    return apiClient.post<{ attendance: AttendanceRecord }>("/attendance/checkout", { employeeId });
  },

  update: async (id: string, data: Partial<AttendanceRecord>): Promise<{ attendance: AttendanceRecord }> => {
    return apiClient.put<{ attendance: AttendanceRecord }>(`/attendance/${id}`, data);
  },

  getSummary: async (month: string, year: string): Promise<{ summary: any }> => {
    return apiClient.get<{ summary: any }>(`/attendance/summary?month=${month}&year=${year}`);
  },
};

