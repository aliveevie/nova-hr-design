import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import {
  getTrainings,
  getTrainingById,
  createTraining,
  updateTraining,
  deleteTraining,
} from "../services/training.service.js";
import { trainingSchema } from "../utils/validators.js";
import { sendTrainingReminderEmail } from "../services/email.service.js";
import { getDatabase, dbHelpers } from "../config/database.js";
import { getHrAdminAllowedEmployeeIds } from "../utils/hr-admin-scope.util.js";

export const getTrainingsController = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId } = req.query;
    const filters: any = {};
    if (employeeId) filters.employeeId = employeeId as string;

    let trainings = await getTrainings(filters);
    const allowedIds = await getHrAdminAllowedEmployeeIds(req);
    if (allowedIds) {
      const set = new Set(allowedIds);
      trainings = trainings.filter((t: any) => t.employee_id && set.has(t.employee_id));
    }
    const transformed = trainings.map((t: any) => ({
      id: t.id,
      employeeId: t.employee_id,
      employee: t.employee_name,
      title: t.title,
      date: t.date,
      status: t.status,
      certification: t.certification === 1,
    }));

    res.json({ trainings: transformed });
  } catch (error) {
    console.error("Get trainings error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getTrainingController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const training = await getTrainingById(id);
    if (!training) {
      return res.status(404).json({ error: "Training not found" });
    }

    const transformed = {
      id: training.id,
      employeeId: training.employee_id,
      employee: training.employee_name,
      title: training.title,
      date: training.date,
      status: training.status,
      certification: training.certification === 1,
    };

    res.json({ training: transformed });
  } catch (error) {
    console.error("Get training error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createTrainingController = async (req: AuthRequest, res: Response) => {
  try {
    const validation = trainingSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid data", details: validation.error.errors });
    }

    const training = await createTraining(validation.data);

    // Send reminder email if scheduled
    if (validation.data.status === "Scheduled") {
      await dbHelpers.read();
      const db = getDatabase();
      const employee = db.data.employees.find((e: any) => e.id === validation.data.employeeId);

      if (employee) {
        sendTrainingReminderEmail(
          employee.email,
          employee.name,
          validation.data.title,
          validation.data.date
        )
          .then((result) => {
            if (result.success) {
              console.log(`✅ Training reminder email sent to ${employee.email}`);
            } else {
              console.error(`❌ Failed to send training reminder email to ${employee.email}`);
            }
          })
          .catch((err) => {
            console.error(`❌ Error sending training reminder email:`, err);
          });
      }
    }

    const transformed = {
      id: training.id,
      employeeId: training.employee_id,
      employee: training.employee_name,
      title: training.title,
      date: training.date,
      status: training.status,
      certification: training.certification === 1,
    };

    res.status(201).json({ training: transformed });
  } catch (error) {
    console.error("Create training error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateTrainingController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validation = trainingSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid data", details: validation.error.errors });
    }

    const existing = await getTrainingById(id);
    if (!existing) {
      return res.status(404).json({ error: "Training not found" });
    }

    const training = await updateTraining(id, { ...existing, ...validation.data });

    const transformed = {
      id: training.id,
      employeeId: training.employee_id,
      employee: training.employee_name,
      title: training.title,
      date: training.date,
      status: training.status,
      certification: training.certification === 1,
    };

    res.json({ training: transformed });
  } catch (error) {
    console.error("Update training error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteTrainingController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const training = await getTrainingById(id);
    if (!training) {
      return res.status(404).json({ error: "Training not found" });
    }

    await deleteTraining(id);
    res.json({ message: "Training deleted successfully" });
  } catch (error) {
    console.error("Delete training error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

