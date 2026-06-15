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
    firstLoginVerified?: boolean;
  };
  token: string;
}

export interface FirstLoginVerificationRequired {
  requiresFirstLoginVerification: true;
  message: string;
}

export const authApi = {
  login: async (
    credentials: LoginCredentials
  ): Promise<AuthResponse | FirstLoginVerificationRequired> => {
    const response = await apiClient.post<AuthResponse | FirstLoginVerificationRequired>(
      "/auth/login",
      credentials
    );
    if ("token" in response && response.token) {
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

  forgotPassword: async (email: string): Promise<{ message: string; recentlySent?: boolean; retryAfterMinutes?: number }> => {
    return apiClient.post<{ message: string; recentlySent?: boolean; retryAfterMinutes?: number }>(
      "/auth/forgot-password",
      { email }
    );
  },

  validateResetToken: async (
    token: string
  ): Promise<{ valid: boolean; reason?: string; expiresInMinutes?: number }> => {
    return apiClient.get<{ valid: boolean; reason?: string; expiresInMinutes?: number }>(
      `/auth/reset-password/validate?token=${encodeURIComponent(token)}`
    );
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

  verifyFirstLogin: async (token: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>("/auth/first-login/verify", { token });
    if (response.token) {
      localStorage.setItem("auth_token", response.token);
    }
    return response;
  },
};

