import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import {
  getPerformances,
  getPerformanceById,
  createPerformance,
  updatePerformance,
} from "../services/performance.service.js";
import { performanceSchema } from "../utils/validators.js";
import { sendPerformanceReviewEmail } from "../services/email.service.js";
import { getDatabase, dbHelpers } from "../config/database.js";
import { getHrAdminAllowedEmployeeIds } from "../utils/hr-admin-scope.util.js";

export const getPerformancesController = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId } = req.query;
    const filters: any = {};
    if (employeeId) filters.employeeId = employeeId as string;

    let performances = await getPerformances(filters);
    const allowedIds = await getHrAdminAllowedEmployeeIds(req);
    if (allowedIds) {
      const set = new Set(allowedIds);
      performances = performances.filter(
        (p: any) => p.employee_id && set.has(p.employee_id)
      );
    }
    const transformed = performances.map((p: any) => ({
      id: p.id,
      employeeId: p.employee_id,
      employee: p.employee_name,
      department: p.department,
      overallScore: p.overall_score,
      goals: p.goals,
      teamwork: p.teamwork,
      communication: p.communication,
      rating: p.rating,
      reviewDate: p.review_date,
      promotion: p.promotion_date
        ? {
            date: p.promotion_date,
            fromPosition: p.promotion_from_position,
            toPosition: p.promotion_to_position,
          }
        : undefined,
      salaryIncrement: p.salary_increment_date
        ? {
            date: p.salary_increment_date,
            amount: p.salary_increment_amount,
            percentage: p.salary_increment_percentage,
          }
        : undefined,
    }));

    res.json({ performances: transformed });
  } catch (error) {
    console.error("Get performances error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPerformanceController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const performance = await getPerformanceById(id);
    if (!performance) {
      return res.status(404).json({ error: "Performance not found" });
    }

    const latest = performance;
    const transformed = {
      id: latest.id,
      employeeId: latest.employee_id,
      employee: latest.employee_name,
      department: latest.department,
      overallScore: latest.overall_score,
      goals: latest.goals,
      teamwork: latest.teamwork,
      communication: latest.communication,
      rating: latest.rating,
      reviewDate: latest.review_date,
      promotion: latest.promotion_date
        ? {
            date: latest.promotion_date,
            fromPosition: latest.promotion_from_position,
            toPosition: latest.promotion_to_position,
          }
        : undefined,
      salaryIncrement: latest.salary_increment_date
        ? {
            date: latest.salary_increment_date,
            amount: latest.salary_increment_amount,
            percentage: latest.salary_increment_percentage,
          }
        : undefined,
    };

    res.json({ performance: transformed });
  } catch (error) {
    console.error("Get performance error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createPerformanceController = async (req: AuthRequest, res: Response) => {
  try {
    const validation = performanceSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid data", details: validation.error.errors });
    }

    const performance = await createPerformance(validation.data);

    // Send email
    await dbHelpers.read();
    const db = getDatabase();
    const employee = db.data.employees.find((e: any) => e.id === validation.data.employeeId);

    if (employee) {
      sendPerformanceReviewEmail(
        employee.email,
        employee.name,
        performance.overall_score,
        performance.rating
      )
        .then((result) => {
          if (result.success) {
            console.log(`✅ Performance review email sent to ${employee.email}`);
          } else {
            console.error(`❌ Failed to send performance review email to ${employee.email}`);
          }
        })
        .catch((err) => {
          console.error(`❌ Error sending performance review email:`, err);
        });
    }

    const transformed = {
      id: performance.id,
      employeeId: performance.employee_id,
      employee: performance.employee_name,
      department: performance.department,
      overallScore: performance.overall_score,
      goals: performance.goals,
      teamwork: performance.teamwork,
      communication: performance.communication,
      rating: performance.rating,
      reviewDate: performance.review_date,
    };

    res.status(201).json({ performance: transformed });
  } catch (error) {
    console.error("Create performance error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updatePerformanceController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validation = performanceSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid data", details: validation.error.errors });
    }

    const existing = await getPerformanceById(id);
    if (!existing) {
      return res.status(404).json({ error: "Performance not found" });
    }

    const performance = await updatePerformance(id, { ...existing, ...validation.data });

    const transformed = {
      id: performance.id,
      employeeId: performance.employee_id,
      employee: performance.employee_name,
      department: performance.department,
      overallScore: performance.overall_score,
      goals: performance.goals,
      teamwork: performance.teamwork,
      communication: performance.communication,
      rating: performance.rating,
      reviewDate: performance.review_date,
    };

    res.json({ performance: transformed });
  } catch (error) {
    console.error("Update performance error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

