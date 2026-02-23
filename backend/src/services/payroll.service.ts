import { getDatabase, dbHelpers } from "../config/database.js";
import { randomUUID } from "crypto";

export const getPayrolls = async (filters?: { employeeId?: string; month?: string; year?: string }) => {
  await dbHelpers.read();
  const db = getDatabase();
  let payrolls = [...db.data.payrolls];

  if (filters?.employeeId) {
    payrolls = payrolls.filter((p) => p.employee_id === filters.employeeId);
  }

  if (filters?.month) {
    payrolls = payrolls.filter((p) => p.month === filters.month);
  }

  if (filters?.year) {
    payrolls = payrolls.filter((p) => p.year === filters.year);
  }

  return payrolls.sort((a, b) => {
    const yearDiff = b.year.localeCompare(a.year);
    if (yearDiff !== 0) return yearDiff;
    return b.month.localeCompare(a.month);
  });
};

export const getPayrollById = async (id: string) => {
  await dbHelpers.read();
  const db = getDatabase();
  return db.data.payrolls.find((p) => p.id === id);
};

export const createPayroll = async (payrollData: any) => {
  await dbHelpers.read();
  const db = getDatabase();
  const id = randomUUID();

  // Get employee info
  const employee = db.data.employees.find((e) => e.id === payrollData.employeeId);
  if (!employee) {
    throw new Error("Employee not found");
  }

  const allowances = payrollData.allowances || {};
  const deductions = payrollData.deductions || {};
  const totalAllowances =
    (allowances.housing || 0) +
    (allowances.transport || 0) +
    (allowances.medical || 0) +
    (allowances.other || 0);
  const totalDeductions =
    (deductions.tax || 0) +
    (deductions.pension || 0) +
    (deductions.nhia || 0) +
    (deductions.loans || 0);
  const netPay = payrollData.basicSalary + totalAllowances - totalDeductions;

  const newPayroll = {
    id,
    employee_id: payrollData.employeeId,
    employee_name: employee.name,
    department: employee.department,
    basic_salary: payrollData.basicSalary,
    allowance_housing: allowances.housing || 0,
    allowance_transport: allowances.transport || 0,
    allowance_medical: allowances.medical || 0,
    allowance_other: allowances.other || 0,
    deduction_tax: deductions.tax || 0,
    deduction_pension: deductions.pension || 0,
    deduction_nhia: deductions.nhia || 0,
    deduction_loans: deductions.loans || 0,
    net_pay: netPay,
    status: "Pending",
    month: payrollData.month,
    year: payrollData.year,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.data.payrolls.push(newPayroll);
  await dbHelpers.write();
  return newPayroll;
};

export const updatePayroll = async (id: string, payrollData: any) => {
  await dbHelpers.read();
  const db = getDatabase();
  const index = db.data.payrolls.findIndex((p) => p.id === id);
  if (index === -1) {
    return null;
  }

  db.data.payrolls[index].status = payrollData.status || "Pending";
  db.data.payrolls[index].updated_at = new Date().toISOString();
  await dbHelpers.write();
  return db.data.payrolls[index];
};
