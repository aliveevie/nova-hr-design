import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import {
  getLeaveRequests,
  getLeaveRequestById,
  createLeaveRequest,
  updateLeaveRequest,
  getLeaveBalance,
} from "../services/leave.service.js";
import { leaveRequestSchema } from "../utils/validators.js";
import { sendLeaveRequestEmail, sendLeaveApprovalEmail } from "../services/email.service.js";
import { getDatabase, dbHelpers } from "../config/database.js";

export const getLeaveRequestsController = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, status } = req.query;
    const filters: any = {};
    if (employeeId) filters.employeeId = employeeId as string;
    if (status) filters.status = status as string;

    const requests = await getLeaveRequests(filters);
    const transformed = requests.map((r: any) => ({
      id: r.id,
      employeeId: r.employee_id,
      employee: r.employee_name,
      type: r.type,
      from: r.from_date,
      to: r.to_date,
      days: r.days,
      status: r.status,
      reason: r.reason,
    }));

    res.json({ leaveRequests: transformed });
  } catch (error) {
    console.error("Get leave requests error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getLeaveBalanceController = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId } = req.params;
    const balance = await getLeaveBalance(employeeId);
    res.json({ balance });
  } catch (error) {
    console.error("Get leave balance error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createLeaveRequestController = async (req: AuthRequest, res: Response) => {
  try {
    const validation = leaveRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid data", details: validation.error.errors });
    }

    // Calculate days
    const from = new Date(validation.data.from);
    const to = new Date(validation.data.to);
    const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const request = await createLeaveRequest({
      ...validation.data,
      days,
    });

    // Send email to manager (get manager email from employee's department)
    await dbHelpers.read();
    const db = getDatabase();
    const employee = db.data.employees.find((e: any) => e.id === validation.data.employeeId);

    if (employee) {
      // For now, send to HR email - in production, get manager email
      sendLeaveRequestEmail(
        "hr@galaxyitt.com.ng", // Manager email
        employee.name || "Employee",
        validation.data.type,
        validation.data.from,
        validation.data.to,
        days,
        validation.data.reason
      ).catch((err) => console.error("Failed to send leave request email:", err));
    }

    const transformed = {
      id: request.id,
      employeeId: request.employee_id,
      employee: request.employee_name,
      type: request.type,
      from: request.from_date,
      to: request.to_date,
      days: request.days,
      status: request.status,
      reason: request.reason,
    };

    res.status(201).json({ leaveRequest: transformed });
  } catch (error) {
    console.error("Create leave request error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateLeaveRequestController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["Approved", "Rejected", "Pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const existing = await getLeaveRequestById(id);
    if (!existing) {
      return res.status(404).json({ error: "Leave request not found" });
    }

    const request = await updateLeaveRequest(id, { status });

    // Send email to employee
    await dbHelpers.read();
    const db = getDatabase();
    const employee = db.data.employees.find((e: any) => e.id === request.employee_id);

    if (employee) {
      sendLeaveApprovalEmail(
        employee.email,
        employee.name,
        request.type,
        request.from_date,
        request.to_date,
        status as "Approved" | "Rejected"
      ).catch((err) => console.error("Failed to send approval email:", err));
    }

    const transformed = {
      id: request.id,
      employeeId: request.employee_id,
      employee: request.employee_name,
      type: request.type,
      from: request.from_date,
      to: request.to_date,
      days: request.days,
      status: request.status,
      reason: request.reason,
    };

    res.json({ leaveRequest: transformed });
  } catch (error) {
    console.error("Update leave request error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

