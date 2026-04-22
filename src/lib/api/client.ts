// Single base for every API call (auth, employees, invites, public onboarding, etc.).
// Keep this environment-driven; do not hardcode deployment URLs.
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export const getApiBaseUrl = (): string => API_BASE_URL;

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getToken(): string | null {
    return localStorage.getItem("auth_token");
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const url = `${this.baseURL}${endpoint}`;

    const headers: HeadersInit = {
      ...options.headers,
    };

    const isFormData = options.body instanceof FormData;
    if (!isFormData && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      const apiError = new Error(error.error || `HTTP error! status: ${response.status}`) as Error & {
        details?: unknown;
        status?: number;
      };
      apiError.details = error;
      apiError.status = response.status;
      throw apiError;
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async postForm<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: formData,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async getBlob(endpoint: string): Promise<Blob> {
    const token = this.getToken();
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      const apiError = new Error(error.error || `HTTP error! status: ${response.status}`) as Error & {
        details?: unknown;
        status?: number;
      };
      apiError.details = error;
      apiError.status = response.status;
      throw apiError;
    }
    return response.blob();
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

