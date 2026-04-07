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
import {
  getEmployeeById,
  hrAdminOwnsEmployee,
  resolveAdminOwnerForCreate,
} from "../services/employee.service.js";
import { getSql, isSupabaseEnabled } from "../config/supabase.js";

const defaultHrLeaveEmail = () =>
  process.env.HR_LEAVE_NOTIFY_EMAIL || "hr@galaxyitt.com.ng";

async function resolveLeaveNotifyEmailForEmployee(employee: Record<string, unknown> | null): Promise<string> {
  let notifyEmail = defaultHrLeaveEmail();
  const ownerId = employee?.admin_owner_id as string | undefined;
  if (!employee || !ownerId) return notifyEmail;

  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const rows = await sql`select email from users where id = ${ownerId} limit 1`;
    if (rows[0]?.email) return String(rows[0].email);
    return notifyEmail;
  }

  await dbHelpers.read();
  const db = getDatabase();
  const hr = db.data.users.find((u: { id?: string; email?: string }) => u.id === ownerId);
  if (hr?.email) return String(hr.email);
  return notifyEmail;
}

export const getLeaveRequestsController = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, status } = req.query;
    const filters: {
      employeeId?: string;
      status?: string;
      scopeAdminOwnerId?: string;
    } = {};
    if (employeeId) filters.employeeId = employeeId as string;
    if (status) filters.status = status as string;

    // Each HR Admin sees only their own employees' requests; Managers see the same scope as employee list (primary HR org)
    if (req.user?.role === "HR Admin") {
      filters.scopeAdminOwnerId = req.user.userId;
    } else if (req.user?.role === "Manager") {
      filters.scopeAdminOwnerId = await resolveAdminOwnerForCreate(
        "Manager",
        req.user.userId
      );
    }

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

    const employee = await getEmployeeById(validation.data.employeeId);
    if (employee) {
      const notifyEmail = await resolveLeaveNotifyEmailForEmployee(employee as Record<string, unknown>);
      const name = (employee as { name?: string }).name || "Employee";
      sendLeaveRequestEmail(
        notifyEmail,
        name,
        validation.data.type,
        validation.data.from,
        validation.data.to,
        days,
        validation.data.reason
      )
        .then((result) => {
          if (result.success) {
            console.log(`✅ Leave request notification sent to ${notifyEmail} for ${name}`);
          } else {
            console.error(`❌ Failed to send leave request notification to ${notifyEmail}`);
          }
        })
        .catch((err) => {
          console.error(`❌ Error sending leave request notification:`, err);
        });
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

    const targetEmployeeId = String((existing as { employee_id: string }).employee_id);

    if (req.user?.role === "Employee") {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (req.user?.role === "HR Admin") {
      const ok = await hrAdminOwnsEmployee(targetEmployeeId, req.user.userId);
      if (!ok) return res.status(403).json({ error: "Forbidden" });
    } else if (req.user?.role === "Manager") {
      const primary = await resolveAdminOwnerForCreate("Manager", req.user.userId);
      const emp = await getEmployeeById(targetEmployeeId);
      if (!emp || String((emp as { admin_owner_id?: string }).admin_owner_id) !== String(primary)) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const request = await updateLeaveRequest(id, { status });
    if (!request) {
      return res.status(404).json({ error: "Leave request not found" });
    }

    const employee = await getEmployeeById(String((request as { employee_id: string }).employee_id));

    if (employee) {
      const email = (employee as { email?: string }).email;
      const name = (employee as { name?: string }).name || "Employee";
      if (email) {
        sendLeaveApprovalEmail(
          email,
          name,
          request.type,
          request.from_date,
          request.to_date,
          status as "Approved" | "Rejected"
        )
          .then((result) => {
            if (result.success) {
              console.log(`✅ Leave ${status.toLowerCase()} email sent to ${email}`);
            } else {
              console.error(`❌ Failed to send leave ${status.toLowerCase()} email to ${email}`);
            }
          })
          .catch((err) => {
            console.error(`❌ Error sending leave ${status.toLowerCase()} email:`, err);
          });
      }
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

