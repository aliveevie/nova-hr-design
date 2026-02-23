import { Request, Response } from "express";
import { login, getUserById } from "../services/auth.service.js";
import { AuthRequest } from "../middleware/auth.middleware.js";

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

export const logoutController = async (req: Request, res: Response) => {
  // Since we're using JWT, logout is handled client-side by removing the token
  // But we can add token blacklisting here if needed
  res.json({ message: "Logged out successfully" });
};

