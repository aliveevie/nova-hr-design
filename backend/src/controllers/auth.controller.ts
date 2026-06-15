import { Request, Response } from "express";
import {
  login,
  getUserById,
  requestPasswordReset,
  resetPasswordWithToken,
  revokePasswordResetToken,
  validateResetToken,
  changePassword,
  verifyFirstLoginToken,
} from "../services/auth.service.js";
import { AuthRequest } from "../middleware/auth.middleware.js";
import {
  sendAdminLoginNotificationEmail,
  sendFirstLoginVerificationEmail,
  sendPasswordResetEmail,
} from "../services/email.service.js";
import { env } from "../config/env.js";

const getClientIp = (req: Request) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0];
  }
  return req.ip || "unknown";
};

export const loginController = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const ipAddress = getClientIp(req);
    const userAgent = req.headers["user-agent"] || "unknown";
    const result = await login({ email, password }, { ipAddress, userAgent });

    if (!result) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if ("requiresFirstLoginVerification" in result && result.requiresFirstLoginVerification) {
      const verifyUrl = `${env.FRONTEND_URL}/first-login-verify?token=${result.verificationToken}`;
      sendFirstLoginVerificationEmail(
        result.user.email,
        result.user.name,
        verifyUrl,
        30
      ).catch((err) => {
        console.error("First-login verification email send error:", err);
      });

      return res.status(202).json({
        requiresFirstLoginVerification: true,
        message: "Verification link sent to your email. Complete verification to continue.",
      });
    }

    sendAdminLoginNotificationEmail(
      result.user.email,
      result.user.name,
      ipAddress,
      String(userAgent)
    ).catch((err) => {
      console.error("Admin login notification email send error:", err);
    });

    res.json(result);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const verifyFirstLoginController = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: "Verification token is required" });
    }

    const result = await verifyFirstLoginToken(token);
    if (!result) {
      return res.status(400).json({ error: "Invalid or expired verification token" });
    }

    const ipAddress = getClientIp(req);
    const userAgent = req.headers["user-agent"] || "unknown";
    sendAdminLoginNotificationEmail(
      result.user.email,
      result.user.name,
      ipAddress,
      String(userAgent)
    ).catch((err) => {
      console.error("Admin login notification email send error:", err);
    });

    res.json(result);
  } catch (error) {
    console.error("Verify first login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const forgotPasswordController = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const result = await requestPasswordReset(email);

    if (result?.kind === "throttled") {
      return res.json({
        message:
          "If the account exists, a reset link has already been sent recently. Check your inbox and spam folder, or wait a few minutes before requesting again.",
        recentlySent: true,
        retryAfterMinutes: result.retryAfterMinutes,
      });
    }

    if (result?.kind === "created") {
      const base = env.FRONTEND_URL.replace(/\/$/, "");
      const resetUrl = `${base}/reset-password?token=${encodeURIComponent(result.token)}`;
      const emailResult = await sendPasswordResetEmail(
        result.user.email,
        result.user.name,
        resetUrl,
        env.PASSWORD_RESET_TOKEN_TTL_MINUTES
      );
      if (!emailResult.success) {
        await revokePasswordResetToken(result.token);
        console.error("Password reset email failed to send for", result.user.email);
      }
    }

    // Do not reveal whether email exists
    res.json({
      message:
        "If the account exists, a reset link has been sent to the email. Delivery can take a few minutes — check spam if you do not see it.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const validateResetTokenController = async (req: Request, res: Response) => {
  try {
    const token = String(req.query.token || "");
    const result = await validateResetToken(token);
    if (!result.valid) {
      return res.status(400).json({
        valid: false,
        reason: result.reason || "invalid",
        error: "Invalid or expired reset token",
      });
    }
    return res.json({
      valid: true,
      expiresInMinutes: env.PASSWORD_RESET_TOKEN_TTL_MINUTES,
    });
  } catch (error) {
    console.error("Validate reset token error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const resetPasswordController = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: "Token and new password are required" });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const success = await resetPasswordWithToken(token, password);
    if (!success) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const meController = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Me error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const changePasswordController = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters" });
    }

    const result = await changePassword(req.user.userId, currentPassword, newPassword);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const logoutController = async (_req: Request, res: Response) => {
  res.json({ message: "Logged out successfully" });
};
