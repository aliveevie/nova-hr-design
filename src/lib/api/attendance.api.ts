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
  /** Admin-only: list of office public IPs / CIDRs / prefixes. */
  allowedIps?: string[];
  /** List of office Wi-Fi SSIDs the employee can self-select from. */
  allowedSsids?: string[];
  /** Employee-only: set when the server recognises this request's IP. */
  networkRecognized?: boolean;
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
    list: async (): Promise<{ locations: OfficeLocationDto[]; currentIp?: string | null }> => {
      return apiClient.get<{ locations: OfficeLocationDto[]; currentIp?: string | null }>(
        "/attendance/offices"
      );
    },
    upsert: async (
      body: Omit<OfficeLocationDto, "createdAt" | "updatedAt" | "networkRecognized"> & {
        id?: string;
        allowedIps?: string[];
        allowedSsids?: string[];
      }
    ): Promise<{ location: OfficeLocationDto & { currentIp?: string | null } }> => {
      return apiClient.post<{ location: OfficeLocationDto & { currentIp?: string | null } }>(
        "/attendance/offices",
        body
      );
    },
    delete: async (id: string): Promise<{ success: boolean }> => {
      return apiClient.delete<{ success: boolean }>(`/attendance/offices/${id}`);
    },
    updateHours: async (
      id: string,
      body: { openTime: string; closeTime: string; timeZone: string }
    ): Promise<{
      location: {
        id: string;
        name: string;
        openTime: string;
        closeTime: string;
        timeZone: string;
        updatedAt: string;
      };
    }> => {
      return apiClient.patch(`/attendance/offices/${id}/hours`, body);
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

  getEmployeeOffice: async (): Promise<{
    location: OfficeLocationDto | null;
    currentIp?: string | null;
  }> => {
    return apiClient.get<{
      location: OfficeLocationDto | null;
      currentIp?: string | null;
    }>("/attendance/office");
  },

  registerDevice: async (body: {
    deviceId: string;
    deviceLabel?: string;
    lat?: number;
    lng?: number;
    accuracyM?: number;
  }): Promise<{
    device: {
      employeeId: string;
      deviceId: string;
      deviceLabel: string | null;
      registeredAt: string;
      autoAttendanceEnabled: boolean;
      lastZoneId: string | null;
      lastSeenAt: string | null;
      lastAccuracyM: number | null;
      lastInsideState: boolean;
    };
  }> => {
    return apiClient.post("/attendance/device/register", body);
  },

  listDevices: async (): Promise<{
    devices: {
      employeeId: string;
      deviceId: string;
      deviceLabel: string | null;
      registeredAt: string;
      autoAttendanceEnabled: boolean;
      lastSeenAt: string | null;
      lastAccuracyM: number | null;
      lastInsideState: boolean;
      lastZoneId: string | null;
    }[];
  }> => {
    return apiClient.get("/attendance/device");
  },

  autoEvaluate: async (body: {
    deviceId: string;
    lat?: number;
    lng?: number;
    accuracyM?: number;
    ssid?: string;
  }): Promise<{
    action: "checked_in" | "checked_out" | "none";
    insideZoneId: string | null;
    matchedVia?: "geo" | "ip" | "ssid" | "none";
    reason?:
      | "inside"
      | "inside_via_ip"
      | "inside_via_ssid"
      | "no_zones"
      | "accuracy_too_poor"
      | "too_far"
      | "no_fix";
    distanceM?: number | null;
    nearest?: {
      zoneId: string | null;
      zoneName: string | null;
      distanceM: number | null;
      radiusM: number | null;
      maxAccuracyM: number | null;
    };
    yourLocation?: { lat: number; lng: number; accuracyM: number } | null;
    network?: {
      ip: string | null;
      recognized: boolean;
      zoneId: string | null;
      zoneName: string | null;
    };
    wifi?: {
      claimedSsid: string | null;
      recognized: boolean;
      zoneId: string | null;
      zoneName: string | null;
    };
    attendance: AttendanceRecord | null;
  }> => {
    return apiClient.post("/attendance/device/auto", body);
  },
};

