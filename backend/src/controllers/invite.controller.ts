import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import {
  createStaffInvite,
  deleteInviteForAdmin,
  getInviteStatsForAdmin,
  listInvitesForAdmin,
  revokeInviteForAdmin,
  submitStaffInvite,
  resendWelcomeEmailForInvite,
  validateStaffInviteToken,
} from "../services/invite.service.js";
import { env } from "../config/env.js";
import { sendWelcomeEmailForNewEmployeeRow } from "../services/email.service.js";
import { mapUniqueViolationToPublicInviteResponse } from "../utils/postgres-conflict.util.js";

const getClientIp = (req: Request) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) return forwarded.split(",")[0].trim();
  if (Array.isArray(forwarded) && forwarded.length > 0) return forwarded[0];
  return req.ip || "unknown";
};

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
      token: r.raw_token ?? null,
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

export const revokeInviteController = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    const updated = await revokeInviteForAdmin(req.user.userId, id);
    if (!updated) return res.status(404).json({ error: "Invite not found" });
    res.json({ success: true });
  } catch (e) {
    console.error("revokeInviteController:", e);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteInviteController = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const { id } = req.params;
    const deleted = await deleteInviteForAdmin(req.user.userId, id);
    if (!deleted) return res.status(404).json({ error: "Invite not found" });
    res.json({ success: true });
  } catch (e) {
    console.error("deleteInviteController:", e);
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
    // Respond immediately; deliver welcome email in background to reduce onboarding latency.
    sendWelcomeEmailForNewEmployeeRow(emp, emp.tempPassword)
      .then((emailResult) => {
        if (!emailResult.success) {
          console.error(`Welcome email failed for invite onboarding: ${emp.email}`);
        }
      })
      .catch((err) => {
        console.error(`Welcome email error for invite onboarding ${emp.email}:`, err);
      });

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

export const resendPublicInviteWelcomeController = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const email = String(req.body?.email || "").trim();
    const deviceId = typeof req.body?.deviceId === "string" ? req.body.deviceId : undefined;
    if (!token) return res.status(400).json({ error: "Missing token" });
    if (!email) return res.status(400).json({ error: "Email is required" });

    const result = await resendWelcomeEmailForInvite({
      rawToken: token,
      email,
      ipAddress: getClientIp(req),
      deviceId,
    });
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    return res.json({ success: true, message: "Welcome email sent. Please check your inbox/spam folder." });
  } catch (e) {
    console.error("resendPublicInviteWelcomeController:", e);
    res.status(500).json({ error: "Internal server error" });
  }
};
