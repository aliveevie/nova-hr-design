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
      label: string | null;
      expiresAt: string;
      revokedAt: string | null;
      createdAt: string;
      completionCount: number;
    }>; baseUrl: string }>("/invites"),

  stats: () =>
    apiClient.get<{
      inviteCount: number;
      totalCompletions: number;
      activeInvites: number;
    }>("/invites/stats"),
};
