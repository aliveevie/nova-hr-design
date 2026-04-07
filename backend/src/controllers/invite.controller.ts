import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import {
  createStaffInvite,
  getInviteStatsForAdmin,
  listInvitesForAdmin,
  submitStaffInvite,
  validateStaffInviteToken,
} from "../services/invite.service.js";
import { env } from "../config/env.js";
import { sendWelcomeEmailForNewEmployeeRow } from "../services/email.service.js";
import { mapUniqueViolationToPublicInviteResponse } from "../utils/postgres-conflict.util.js";

export const createInviteController = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const label = typeof req.body?.label === "string" ? req.body.label : undefined;
    const expiresInDays =
      typeof req.body?.expiresInDays === "number" ? req.body.expiresInDays : undefined;

    const { rawToken, invite } = await createStaffInvite(req.user.userId, {
      label,
      expiresInDays,
    });
    const inviteUrl = `${env.FRONTEND_URL.replace(/\/$/, "")}/staff-onboarding/${rawToken}`;
    res.status(201).json({
      invite: {
        id: invite.id,
        label: (invite as any).label,
        expiresAt: (invite as any).expires_at,
        createdAt: (invite as any).created_at,
      },
      inviteUrl,
      token: rawToken,
    });
  } catch (e) {
    console.error("createInviteController:", e);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const listInvitesController = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const rows = await listInvitesForAdmin(req.user.userId);
    const base = env.FRONTEND_URL.replace(/\/$/, "");
    const invites = rows.map((r: any) => ({
      id: r.id,
      label: r.label,
      expiresAt: r.expires_at,
      revokedAt: r.revoked_at,
      createdAt: r.created_at,
      completionCount: Number(r.completion_count) || 0,
    }));
    res.json({ invites, baseUrl: `${base}/staff-onboarding` });
  } catch (e) {
    console.error("listInvitesController:", e);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const inviteStatsController = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const stats = await getInviteStatsForAdmin(req.user.userId);
    res.json(stats);
  } catch (e) {
    console.error("inviteStatsController:", e);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPublicInviteController = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ valid: false, error: "Missing token" });

    const result = await validateStaffInviteToken(token);
    if (!result.valid) {
      return res.json({
        valid: false,
        reason: "reason" in result ? result.reason : "invalid",
      });
    }
    res.json({
      valid: true,
      expiresAt: (result.invite as any).expires_at,
    });
  } catch (e) {
    console.error("getPublicInviteController:", e);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const submitPublicInviteController = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    if (!token) return res.status(400).json({ error: "Missing token" });

    const result = await submitStaffInvite(token, req.body);
    if (!result.success) {
      if ("errors" in result && result.errors) {
        return res.status(400).json({ error: "Validation failed", details: result.errors });
      }
      return res.status(400).json({ error: "error" in result ? result.error : "Submit failed" });
    }

    const emp = result.employee as any;
    const emailResult = await sendWelcomeEmailForNewEmployeeRow(emp, emp.tempPassword);
    if (!emailResult.success) {
      console.error(`Welcome email failed for invite onboarding: ${emp.email}`);
    }

    res.status(201).json({
      success: true,
      message:
        "Your account was created. Login details have been sent to your email.",
      employee: {
        id: emp.id,
        name: emp.name,
        email: emp.email,
      },
    });
  } catch (e) {
    const conflict = mapUniqueViolationToPublicInviteResponse(e);
    if (conflict) {
      return res.status(conflict.status).json(conflict.body);
    }
    console.error("submitPublicInviteController:", e);
    res.status(500).json({ error: "Internal server error" });
  }
};
