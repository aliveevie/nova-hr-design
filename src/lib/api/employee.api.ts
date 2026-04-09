import { apiClient } from "./client.js";
import { Employee } from "@/types";

export type EmployeeWorkDoc = {
  id: string;
  name: string;
  kind: "job_profile" | "okr_admin" | "okr_employee";
  mimeType: string;
  uploadedDate: string;
  hasFile: boolean;
  hasText: boolean;
  textContent?: string | null;
};

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

  bulkUpload: async (
    file: File
  ): Promise<{
    message: string;
    count: number;
    employees: Employee[];
    errors?: Array<{ row: number; field: string; message: string; rawValue?: unknown }>;
  }> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.postForm("/employees/bulk-upload", formData);
  },

  getWorkDocs: async (
    id: string
  ): Promise<{ jobProfile: EmployeeWorkDoc | null; okrTemplate: EmployeeWorkDoc | null; okrSubmission: EmployeeWorkDoc | null }> => {
    return apiClient.get(`/employees/${id}/work-docs`);
  },

  uploadJobProfile: async (id: string, args: { file?: File; textContent?: string }) => {
    const formData = new FormData();
    if (args.file) formData.append("file", args.file);
    if (args.textContent) formData.append("textContent", args.textContent);
    return apiClient.postForm(`/employees/${id}/job-profile`, formData);
  },

  uploadOkrTemplate: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.postForm(`/employees/${id}/okr-template`, formData);
  },

  uploadOkrSubmission: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.postForm(`/employees/${id}/okr-submission`, formData);
  },

  downloadWorkDoc: async (
    id: string,
    kind: "job_profile" | "okr_admin" | "okr_employee"
  ): Promise<Blob> => {
    return apiClient.getBlob(`/employees/${id}/work-docs/${kind}/download`);
  },
};

