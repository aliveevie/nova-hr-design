import { apiClient } from "./client";

export type FingerprintTemplate = {
  id: string;
  employeeId: string;
  fingerPosition: string;
  templateFormat: string;
  scannerLabel?: string | null;
  enrolledAt: string;
  isActive: boolean;
};

export type RecommendedFinger = {
  value: string;
  label: string;
  step: number;
  hint: string;
};

export type EnrollmentOverviewEmployee = {
  employeeId: string;
  name: string;
  department: string;
  enrolledFingers: number;
  maxFingers: number;
  isFullyEnrolled: boolean;
  enrolledPositions: string[];
};

export type FingerprintScanResult = {
  employeeId: string;
  employeeName: string;
  eventType: "check_in" | "check_out";
  attendanceId: string;
  matchScore?: number | null;
  message: string;
  alreadyCheckedIn?: boolean;
};

export type EnrollResult = {
  template: FingerprintTemplate;
  deviceName?: string;
  enrolledCount: number;
  maxFingers: number;
  isFullyEnrolled: boolean;
  nextRecommendedFinger?: string | null;
  nextRecommendedLabel?: string | null;
  fingerLabel?: string;
  message: string;
};

export type EmployeeTemplatesResponse = {
  templates: FingerprintTemplate[];
  fingerPositions: { value: string; label: string }[];
  recommendedFingers: RecommendedFinger[];
  maxFingers: number;
  enrolledCount: number;
  isFullyEnrolled: boolean;
  nextRecommendedFinger: string | null;
  nextRecommendedLabel: string | null;
  nextRecommendedHint: string | null;
};

export const fingerprintApi = {
  getStatus: async (): Promise<{ available: boolean; engine?: string; error?: string }> => {
    return apiClient.get("/fingerprint/status");
  },

  getEnrollmentOverview: async (): Promise<{
    employees: EnrollmentOverviewEmployee[];
    maxFingers: number;
    recommendedFingers: RecommendedFinger[];
  }> => {
    return apiClient.get("/fingerprint/enrollment/overview");
  },

  listEmployeeTemplates: async (employeeId: string): Promise<EmployeeTemplatesResponse> => {
    return apiClient.get(`/fingerprint/employees/${employeeId}/templates`);
  },

  enrollEmployee: async (
    employeeId: string,
    body: { fingerPosition: string; scannerLabel?: string; imageB64: string; dpi?: number }
  ): Promise<EnrollResult> => {
    return apiClient.post(`/fingerprint/employees/${employeeId}/enroll`, body);
  },

  deactivateTemplate: async (templateId: string): Promise<{ success: boolean }> => {
    return apiClient.delete(`/fingerprint/templates/${templateId}`);
  },

  scanAttendance: async (body: {
    imageB64: string;
    scannerId?: string;
    dpi?: number;
  }): Promise<FingerprintScanResult> => {
    return apiClient.post("/fingerprint/attendance/scan", body);
  },

  listAttendanceLogs: async (date?: string): Promise<{ logs: any[] }> => {
    const q = date ? `?date=${encodeURIComponent(date)}` : "";
    return apiClient.get(`/fingerprint/attendance/logs${q}`);
  },

  listScanners: async (): Promise<{ scanners: any[] }> => {
    return apiClient.get("/fingerprint/scanners");
  },

  upsertScanner: async (body: {
    id?: string;
    name: string;
    deviceLabel?: string;
    locationNote?: string;
    enabled?: boolean;
  }) => {
    return apiClient.post("/fingerprint/scanners", body);
  },
};

/** Parse scan/enroll API errors with structured codes. */
export const getFingerprintErrorCode = (e: unknown): string | null => {
  const err = e as Error & { code?: string; details?: { code?: string } };
  if (err.code) return err.code;
  if (err.details && typeof err.details === "object" && "code" in err.details) {
    return String((err.details as { code?: string }).code || "");
  }
  return null;
};
