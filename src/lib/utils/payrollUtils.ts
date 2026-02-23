import { Payroll } from "@/types";

export const calculateNetPay = (
  basicSalary: number,
  allowances: { housing?: number; transport?: number; medical?: number; other?: number },
  deductions: { tax: number; pension: number; nhia: number; loans?: number }
): number => {
  const totalAllowances =
    (allowances.housing || 0) +
    (allowances.transport || 0) +
    (allowances.medical || 0) +
    (allowances.other || 0);
  
  const totalDeductions =
    deductions.tax +
    deductions.pension +
    deductions.nhia +
    (deductions.loans || 0);
  
  return basicSalary + totalAllowances - totalDeductions;
};

export const calculateTax = (basicSalary: number, allowances: number): number => {
  const gross = basicSalary + allowances;
  // Simple tax calculation - 20% of gross
  return Math.round(gross * 0.2);
};

export const calculatePension = (basicSalary: number): number => {
  // 5% pension contribution
  return Math.round(basicSalary * 0.05);
};

export const calculateNHIA = (basicSalary: number): number => {
  // 1% NHIA contribution
  return Math.round(basicSalary * 0.01);
};

