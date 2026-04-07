import { apiClient } from "./client.js";

/** Public onboarding — same `apiClient` / base URL as `/auth/login` and `/invites`. */
export const publicInviteApi = {
  validate: (token: string) =>
    apiClient.get<{
      valid: boolean;
      reason?: string;
      expiresAt?: string;
    }>(`/public/staff-invite/${encodeURIComponent(token)}`),

  submit: (token: string, body: Record<string, unknown>) =>
    apiClient.post<{
      success: boolean;
      message: string;
      employee: { id: string; name: string; email: string };
    }>(`/public/staff-invite/${encodeURIComponent(token)}/submit`, body),
};
