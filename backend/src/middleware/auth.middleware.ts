import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.util.js";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    employeeId?: string;
  };
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  };
};

/**
 * Middleware to ensure employees can only access their own data
 * If user is an Employee, automatically filter by their employeeId
 */
export const enforceEmployeeAccess = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // If user is an Employee, they can only access their own data
  if (req.user.role === "Employee" && req.user.employeeId) {
    // Override any employeeId in query params or body with the logged-in employee's ID
    if (req.query.employeeId && req.query.employeeId !== req.user.employeeId) {
      return res.status(403).json({ error: "Forbidden: You can only access your own data" });
    }
    
    // Set employeeId to the logged-in employee's ID
    req.query.employeeId = req.user.employeeId;
    
    // For POST/PUT requests, ensure employeeId in body matches
    if (req.body && req.body.employeeId && req.body.employeeId !== req.user.employeeId) {
      return res.status(403).json({ error: "Forbidden: You can only modify your own data" });
    }
    
    // For route params like /balance/:employeeId
    if (req.params.employeeId && req.params.employeeId !== req.user.employeeId) {
      return res.status(403).json({ error: "Forbidden: You can only access your own data" });
    }
  }

  next();
};

