import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import {
  getDisciplines,
  getDisciplineById,
  createDiscipline,
  updateDiscipline,
  deleteDiscipline,
} from "../services/discipline.service.js";
import { disciplineSchema } from "../utils/validators.js";
import { sendDisciplineEmail } from "../services/email.service.js";
import { getDatabase, dbHelpers } from "../config/database.js";
import { getHrAdminAllowedEmployeeIds } from "../utils/hr-admin-scope.util.js";
import { canUserAccessEmployee } from "../utils/ownership-access.util.js";

export const getDisciplinesController = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId } = req.query;
    const filters: any = {};
    if (employeeId) filters.employeeId = employeeId as string;

    let disciplines = await getDisciplines(filters);
    const allowedIds = await getHrAdminAllowedEmployeeIds(req);
    if (allowedIds) {
      const set = new Set(allowedIds);
      disciplines = disciplines.filter(
        (d: any) => d.employee_id && set.has(d.employee_id)
      );
    }
    const transformed = disciplines.map((d: any) => ({
      id: d.id,
      employeeId: d.employee_id,
      employee: d.employee_name,
      type: d.type,
      date: d.date,
      reason: d.reason,
      status: d.status,
    }));

    res.json({ disciplines: transformed });
  } catch (error) {
    console.error("Get disciplines error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getDisciplineController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const discipline = await getDisciplineById(id);
    if (!discipline) {
      return res.status(404).json({ error: "Discipline not found" });
    }
    const allowed = await canUserAccessEmployee(req, String((discipline as any).employee_id));
    if (!allowed) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const transformed = {
      id: discipline.id,
      employeeId: discipline.employee_id,
      employee: discipline.employee_name,
      type: discipline.type,
      date: discipline.date,
      reason: discipline.reason,
      status: discipline.status,
    };

    res.json({ discipline: transformed });
  } catch (error) {
    console.error("Get discipline error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createDisciplineController = async (req: AuthRequest, res: Response) => {
  try {
    const validation = disciplineSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid data", details: validation.error.errors });
    }
    const allowed = await canUserAccessEmployee(req, validation.data.employeeId);
    if (!allowed) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const discipline = await createDiscipline(validation.data);

    // Send email
    await dbHelpers.read();
    const db = getDatabase();
    const employee = db.data.employees.find((e: any) => e.id === validation.data.employeeId);

    if (employee) {
      sendDisciplineEmail(
        employee.email,
        employee.name,
        validation.data.type,
        validation.data.reason
      )
        .then((result) => {
          if (result.success) {
            console.log(`✅ Discipline notification email sent to ${employee.email}`);
          } else {
            console.error(`❌ Failed to send discipline email to ${employee.email}`);
          }
        })
        .catch((err) => {
          console.error(`❌ Error sending discipline email:`, err);
        });
    }

    const transformed = {
      id: discipline.id,
      employeeId: discipline.employee_id,
      employee: discipline.employee_name,
      type: discipline.type,
      date: discipline.date,
      reason: discipline.reason,
      status: discipline.status,
    };

    res.status(201).json({ discipline: transformed });
  } catch (error) {
    console.error("Create discipline error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateDisciplineController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validation = disciplineSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid data", details: validation.error.errors });
    }

    const existing = await getDisciplineById(id);
    if (!existing) {
      return res.status(404).json({ error: "Discipline not found" });
    }
    const allowed = await canUserAccessEmployee(req, String((existing as any).employee_id));
    if (!allowed) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const discipline = await updateDiscipline(id, { ...existing, ...validation.data });

    const transformed = {
      id: discipline.id,
      employeeId: discipline.employee_id,
      employee: discipline.employee_name,
      type: discipline.type,
      date: discipline.date,
      reason: discipline.reason,
      status: discipline.status,
    };

    res.json({ discipline: transformed });
  } catch (error) {
    console.error("Update discipline error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteDisciplineController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const discipline = await getDisciplineById(id);
    if (!discipline) {
      return res.status(404).json({ error: "Discipline not found" });
    }
    const allowed = await canUserAccessEmployee(req, String((discipline as any).employee_id));
    if (!allowed) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await deleteDiscipline(id);
    res.json({ message: "Discipline deleted successfully" });
  } catch (error) {
    console.error("Delete discipline error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

