import { apiClient } from "./client.js";
import { AttendanceRecord } from "@/types";

export type OfficeLocationDto = {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusM: number;
  maxAccuracyM: number;
  entryBufferM: number;
  exitBufferM: number;
  exitGraceSeconds: number;
  openTime?: string;
  closeTime?: string;
  timeZone?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

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

  offices: {
    list: async (): Promise<{ locations: OfficeLocationDto[] }> => {
      return apiClient.get<{ locations: OfficeLocationDto[] }>("/attendance/offices");
    },
    upsert: async (
      body: Omit<OfficeLocationDto, "createdAt" | "updatedAt"> & { id?: string }
    ): Promise<{ location: OfficeLocationDto }> => {
      return apiClient.post<{ location: OfficeLocationDto }>("/attendance/offices", body);
    },
    delete: async (id: string): Promise<{ success: boolean }> => {
      return apiClient.delete<{ success: boolean }>(`/attendance/offices/${id}`);
    },
  },

  getEmployeeOffice: async (): Promise<{ location: OfficeLocationDto | null }> => {
    return apiClient.get<{ location: OfficeLocationDto | null }>("/attendance/office");
  },

  registerDevice: async (body: {
    deviceId: string;
    deviceLabel?: string;
    lat: number;
    lng: number;
    accuracyM: number;
  }): Promise<{
    device: {
      employeeId: string;
      deviceId: string;
      deviceLabel: string | null;
      registeredAt: string;
      autoAttendanceEnabled: boolean;
      lastZoneId: string | null;
    };
  }> => {
    return apiClient.post("/attendance/device/register", body);
  },

  autoEvaluate: async (body: {
    deviceId: string;
    lat: number;
    lng: number;
    accuracyM: number;
  }): Promise<{
    action: "checked_in" | "checked_out" | "none";
    insideZoneId: string | null;
    attendance: AttendanceRecord | null;
  }> => {
    return apiClient.post("/attendance/device/auto", body);
  },
};

