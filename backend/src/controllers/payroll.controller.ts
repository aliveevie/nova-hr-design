import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import {
  getPayrolls,
  getPayrollById,
  createPayroll,
  updatePayroll,
} from "../services/payroll.service.js";
import { payrollSchema } from "../utils/validators.js";
import { sendPayrollEmail } from "../services/email.service.js";
import { getDatabase, dbHelpers } from "../config/database.js";
import { getHrAdminAllowedEmployeeIds } from "../utils/hr-admin-scope.util.js";

export const getPayrollsController = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, month, year } = req.query;
    const filters: any = {};
    if (employeeId) filters.employeeId = employeeId as string;
    if (month) filters.month = month as string;
    if (year) filters.year = year as string;

    let payrolls = await getPayrolls(filters);
    const allowedIds = await getHrAdminAllowedEmployeeIds(req);
    if (allowedIds) {
      const set = new Set(allowedIds);
      payrolls = payrolls.filter((p: any) => p.employee_id && set.has(p.employee_id));
    }
    const transformed = payrolls.map((p: any) => ({
      id: p.id,
      employeeId: p.employee_id,
      employee: p.employee_name,
      department: p.department,
      basicSalary: p.basic_salary,
      allowances: {
        housing: p.allowance_housing,
        transport: p.allowance_transport,
        medical: p.allowance_medical,
        other: p.allowance_other,
      },
      deductions: {
        tax: p.deduction_tax,
        pension: p.deduction_pension,
        nhia: p.deduction_nhia,
        loans: p.deduction_loans,
      },
      netPay: p.net_pay,
      status: p.status,
      month: p.month,
      year: p.year,
    }));

    res.json({ payrolls: transformed });
  } catch (error) {
    console.error("Get payrolls error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getPayrollController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const payroll = await getPayrollById(id);
    if (!payroll) {
      return res.status(404).json({ error: "Payroll not found" });
    }

    const transformed = {
      id: payroll.id,
      employeeId: payroll.employee_id,
      employee: payroll.employee_name,
      department: payroll.department,
      basicSalary: payroll.basic_salary,
      allowances: {
        housing: payroll.allowance_housing,
        transport: payroll.allowance_transport,
        medical: payroll.allowance_medical,
        other: payroll.allowance_other,
      },
      deductions: {
        tax: payroll.deduction_tax,
        pension: payroll.deduction_pension,
        nhia: payroll.deduction_nhia,
        loans: payroll.deduction_loans,
      },
      netPay: payroll.net_pay,
      status: payroll.status,
      month: payroll.month,
      year: payroll.year,
    };

    res.json({ payroll: transformed });
  } catch (error) {
    console.error("Get payroll error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createPayrollController = async (req: AuthRequest, res: Response) => {
  try {
    const validation = payrollSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid data", details: validation.error.errors });
    }

    const payroll = await createPayroll(validation.data);

    // Send email when status is Paid
    if (req.body.status === "Paid") {
      await dbHelpers.read();
      const db = getDatabase();
      const employee = db.data.employees.find((e: any) => e.id === validation.data.employeeId);

      if (employee) {
        sendPayrollEmail(
          employee.email,
          employee.name,
          payroll.month,
          payroll.year,
          payroll.net_pay
        )
          .then((result) => {
            if (result.success) {
              console.log(`✅ Payroll email sent to ${employee.email} for ${payroll.month}/${payroll.year}`);
            } else {
              console.error(`❌ Failed to send payroll email to ${employee.email}`);
            }
          })
          .catch((err) => {
            console.error(`❌ Error sending payroll email:`, err);
          });
      }
    }

    const transformed = {
      id: payroll.id,
      employeeId: payroll.employee_id,
      employee: payroll.employee_name,
      department: payroll.department,
      basicSalary: payroll.basic_salary,
      allowances: {
        housing: payroll.allowance_housing,
        transport: payroll.allowance_transport,
        medical: payroll.allowance_medical,
        other: payroll.allowance_other,
      },
      deductions: {
        tax: payroll.deduction_tax,
        pension: payroll.deduction_pension,
        nhia: payroll.deduction_nhia,
        loans: payroll.deduction_loans,
      },
      netPay: payroll.net_pay,
      status: payroll.status,
      month: payroll.month,
      year: payroll.year,
    };

    res.status(201).json({ payroll: transformed });
  } catch (error) {
    console.error("Create payroll error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updatePayrollController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const existing = await getPayrollById(id);
    if (!existing) {
      return res.status(404).json({ error: "Payroll not found" });
    }

    const payroll = await updatePayroll(id, { status });

    // Send email when status changes to Paid
    if (status === "Paid" && existing.status !== "Paid") {
      await dbHelpers.read();
      const db = getDatabase();
      const employee = db.data.employees.find((e: any) => e.id === payroll.employee_id);

      if (employee) {
        sendPayrollEmail(
          employee.email,
          employee.name,
          payroll.month,
          payroll.year,
          payroll.net_pay
        )
          .then((result) => {
            if (result.success) {
              console.log(`✅ Payroll email sent to ${employee.email} for ${payroll.month}/${payroll.year}`);
            } else {
              console.error(`❌ Failed to send payroll email to ${employee.email}`);
            }
          })
          .catch((err) => {
            console.error(`❌ Error sending payroll email:`, err);
          });
      }
    }

    const transformed = {
      id: payroll.id,
      employeeId: payroll.employee_id,
      employee: payroll.employee_name,
      department: payroll.department,
      basicSalary: payroll.basic_salary,
      allowances: {
        housing: payroll.allowance_housing,
        transport: payroll.allowance_transport,
        medical: payroll.allowance_medical,
        other: payroll.allowance_other,
      },
      deductions: {
        tax: payroll.deduction_tax,
        pension: payroll.deduction_pension,
        nhia: payroll.deduction_nhia,
        loans: payroll.deduction_loans,
      },
      netPay: payroll.net_pay,
      status: payroll.status,
      month: payroll.month,
      year: payroll.year,
    };

    res.json({ payroll: transformed });
  } catch (error) {
    console.error("Update payroll error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

