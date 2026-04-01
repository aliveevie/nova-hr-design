import { apiClient } from "./client.js";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    initials: string;
    employeeId?: string;
    mustChangePassword?: boolean;
  };
  token: string;
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/auth/login", credentials);
    if (response.token) {
      localStorage.setItem("auth_token", response.token);
    }
    return response;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
    localStorage.removeItem("auth_token");
  },

  getMe: async (): Promise<{ user: AuthResponse["user"] }> => {
    return apiClient.get<{ user: AuthResponse["user"] }>("/auth/me");
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    return apiClient.post<{ message: string }>("/auth/forgot-password", { email });
  },

  resetPassword: async (token: string, password: string): Promise<{ message: string }> => {
    return apiClient.post<{ message: string }>("/auth/reset-password", { token, password });
  },

  changePassword: async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> => {
    return apiClient.post<{ message: string }>("/auth/change-password", {
      currentPassword,
      newPassword,
    });
  },
};

