import { apiClient } from "./client.js";

export const inviteApi = {
  create: (body?: { label?: string; expiresInDays?: number }) =>
    apiClient.post<{
      invite: { id: string; label: string | null; expiresAt: string; createdAt: string };
      inviteUrl: string;
      token: string;
    }>("/invites", body),

  list: () =>
    apiClient.get<{ invites: Array<{
      id: string;
      token: string | null;
      label: string | null;
      expiresAt: string;
      revokedAt: string | null;
      createdAt: string;
      completionCount: number;
    }>; baseUrl: string }>("/invites"),

  revoke: (id: string) =>
    apiClient.put<{ success: boolean }>(`/invites/${id}/revoke`),

  remove: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/invites/${id}`),

  stats: () =>
    apiClient.get<{
      inviteCount: number;
      totalCompletions: number;
      activeInvites: number;
    }>("/invites/stats"),
};
