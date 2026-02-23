import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import {
  getAttendanceRecords,
  getAttendanceByEmployee,
  getAttendanceByDate,
  createAttendance,
  updateAttendance,
  getMonthlySummary,
} from "../services/attendance.service.js";
import { attendanceSchema } from "../utils/validators.js";

export const getAttendanceController = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, date } = req.query;
    const filters: any = {};
    if (employeeId) filters.employeeId = employeeId as string;
    if (date) filters.date = date as string;

    const records = await getAttendanceRecords(filters);
    const transformed = records.map((r: any) => ({
      id: r.id,
      employeeId: r.employee_id,
      employee: r.employee_name,
      date: r.date,
      checkIn: r.check_in,
      checkOut: r.check_out,
      status: r.status,
      department: r.department,
    }));

    res.json({ attendance: transformed });
  } catch (error) {
    console.error("Get attendance error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getEmployeeAttendanceController = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId } = req.params;
    const records = await getAttendanceByEmployee(employeeId);
    const transformed = records.map((r: any) => ({
      id: r.id,
      employeeId: r.employee_id,
      employee: r.employee_name,
      date: r.date,
      checkIn: r.check_in,
      checkOut: r.check_out,
      status: r.status,
      department: r.department,
    }));

    res.json({ attendance: transformed });
  } catch (error) {
    console.error("Get employee attendance error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const checkInController = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId } = req.body;
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });

    // Check if already checked in today
    const todayRecords = await getAttendanceByDate(today);
    const existing = todayRecords.find(
      (r: any) => r.employee_id === employeeId
    );

    if (existing) {
      return res.status(400).json({ error: "Already checked in today" });
    }

    const record = await createAttendance({
      employeeId,
      date: today,
      checkIn: now,
      status: now > "09:00" ? "Late" : "Present",
    });

    res.status(201).json({ attendance: record });
  } catch (error) {
    console.error("Check in error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const checkOutController = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId } = req.body;
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" });

    const records = await getAttendanceByDate(today);
    const todayRecord = records.find((r: any) => r.employee_id === employeeId);

    if (!todayRecord) {
      return res.status(400).json({ error: "No check-in found for today" });
    }

    const updated = await updateAttendance(todayRecord.id, {
      checkOut: now,
      status: todayRecord.status, // Keep existing status
    });

    res.json({ attendance: updated });
  } catch (error) {
    console.error("Check out error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateAttendanceController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validation = attendanceSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid data", details: validation.error.errors });
    }

    const updated = await updateAttendance(id, validation.data);
    res.json({ attendance: updated });
  } catch (error) {
    console.error("Update attendance error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getSummaryController = async (req: AuthRequest, res: Response) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ error: "Month and year are required" });
    }

    const summary = await getMonthlySummary(month as string, year as string);
    res.json({ summary });
  } catch (error) {
    console.error("Get summary error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

