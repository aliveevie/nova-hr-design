import { Request, Response } from "express";
import {
  login,
  getUserById,
  requestPasswordReset,
  resetPasswordWithToken,
  changePassword,
} from "../services/auth.service.js";
import { AuthRequest } from "../middleware/auth.middleware.js";
import { sendPasswordResetEmail } from "../services/email.service.js";
import { env } from "../config/env.js";

export const loginController = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const result = await login({ email, password });

    if (!result) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json(result);
  } catch (error) {
    console.error("Login error:", error);
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

    if (result) {
      const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${result.token}`;
      sendPasswordResetEmail(result.user.email, result.user.name, resetUrl, env.PASSWORD_RESET_TOKEN_TTL_MINUTES).catch((err) => {
        console.error("Password reset email send error:", err);
      });
    }

    // Do not reveal whether email exists
    res.json({ message: "If the account exists, a reset link has been sent to the email." });
  } catch (error) {
    console.error("Forgot password error:", error);
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
