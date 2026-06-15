import { apiClient } from "./client.js";
import { AttendanceRecord } from "@/types";

export type OfficeSettingsDto = {
  id: string;
  name: string;
  openTime: string;
  closeTime: string;
  timeZone: string;
  enabled: boolean;
  autoStartEnabled?: boolean;
  sessionOpen?: boolean;
  sessionIsOpen?: boolean;
  sessionDate?: string | null;
  sessionStartedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type DailyAttendanceEmployee = {
  employeeId: string;
  name: string;
  department: string;
  attendanceId: string | null;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  source: string | null;
};

export type DailyAttendanceResponse = {
  date: string;
  session: {
    isOpen: boolean;
    mode: "manual" | "auto" | "closed";
    todayInOfficeTz: string;
    openTime: string;
    closeTime: string;
    timeZone: string;
    autoStartEnabled: boolean;
    manuallyStarted: boolean;
    message: string;
  };
  office: {
    id: string;
    name: string;
    openTime: string;
    closeTime: string;
    timeZone: string;
    autoStartEnabled: boolean;
    sessionOpen: boolean;
    sessionDate: string | null;
  } | null;
  stats: {
    present: number;
    late: number;
    absent: number;
    onLeave: number;
    yet: number;
  };
  employees: DailyAttendanceEmployee[];
};

export const attendanceApi = {
  getAll: async (filters?: { employeeId?: string; date?: string }): Promise<{ attendance: AttendanceRecord[] }> => {
    const params = new URLSearchParams();
    if (filters?.employeeId) params.append("employeeId", filters.employeeId);
    if (filters?.date) params.append("date", filters.date);
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiClient.get<{ attendance: AttendanceRecord[] }>(`/attendance${query}`);
  },

  getDaily: async (date: string, department?: string): Promise<DailyAttendanceResponse> => {
    const q = new URLSearchParams({ date });
    if (department && department !== "all") q.append("department", department);
    return apiClient.get(`/attendance/daily?${q.toString()}`);
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
    list: async (): Promise<{ locations: OfficeSettingsDto[] }> => {
      return apiClient.get<{ locations: OfficeSettingsDto[] }>("/attendance/offices");
    },
    saveSettings: async (body: {
      id?: string;
      name: string;
      openTime: string;
      closeTime: string;
      timeZone: string;
      autoStartEnabled?: boolean;
      enabled?: boolean;
    }): Promise<{ location: OfficeSettingsDto }> => {
      return apiClient.post("/attendance/offices/settings", body);
    },
    updateHours: async (
      id: string,
      body: { openTime: string; closeTime: string; timeZone: string }
    ) => {
      return apiClient.patch(`/attendance/offices/${id}/hours`, body);
    },
    delete: async (id: string): Promise<{ success: boolean }> => {
      return apiClient.delete<{ success: boolean }>(`/attendance/offices/${id}`);
    },
  },

  session: {
    start: async () => {
      return apiClient.post<{
        success: boolean;
        message: string;
        session: DailyAttendanceResponse["session"];
        office: DailyAttendanceResponse["office"];
      }>("/attendance/session/start");
    },
    stop: async () => {
      return apiClient.post<{
        success: boolean;
        message: string;
        session: DailyAttendanceResponse["session"];
        office: DailyAttendanceResponse["office"];
      }>("/attendance/session/stop");
    },
  },

  getReport: async (params: {
    from: string;
    to: string;
    department?: string;
  }): Promise<{
    from: string;
    to: string;
    totals: { present: number; late: number; absent: number; onLeave: number };
    byEmployee: Array<{
      id: string;
      name: string;
      department: string;
      present: number;
      late: number;
      absent: number;
      onLeave: number;
      daysTracked: number;
    }>;
    records: Array<{
      date: string;
      employeeId: string;
      employeeName: string;
      department: string;
      checkIn: string | null;
      checkOut: string | null;
      status: string;
    }>;
    employeeCount: number;
  }> => {
    const q = new URLSearchParams();
    q.append("from", params.from);
    q.append("to", params.to);
    if (params.department && params.department !== "all") {
      q.append("department", params.department);
    }
    return apiClient.get(`/attendance/report?${q.toString()}`);
  },

  getEmployeeOffice: async (): Promise<{ location: OfficeSettingsDto | null }> => {
    return apiClient.get<{ location: OfficeSettingsDto | null }>("/attendance/office");
  },

  listDevices: async (): Promise<{
    devices: {
      employeeId: string;
      deviceId: string;
      deviceLabel: string | null;
      registeredAt: string;
      autoAttendanceEnabled: boolean;
      lastSeenAt: string | null;
      lastInsideState: boolean;
    }[];
  }> => {
    return apiClient.get("/attendance/device");
  },

  registerDevice: async (body: {
    deviceId: string;
    deviceLabel?: string;
  }) => {
    return apiClient.post("/attendance/device/register", body);
  },

  autoEvaluate: async (body: { deviceId: string }): Promise<{
    action: "checked_in" | "checked_out" | "none";
    attendance: AttendanceRecord | null;
    reason?: string;
    matchedVia?: string;
    network?: { recognized: boolean };
    nearest?: { distanceM: number | null; radiusM: number | null; maxAccuracyM: number | null };
  }> => {
    return apiClient.post("/attendance/device/auto", body);
  },
};
