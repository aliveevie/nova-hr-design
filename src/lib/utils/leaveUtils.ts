import { LeaveBalance, LeaveRequest } from "@/types";
import { calculateWorkingDays } from "./dateUtils";
import { Holiday } from "@/types";

export const calculateLeaveDays = (
  from: string,
  to: string,
  holidays: Holiday[]
): number => {
  return calculateWorkingDays(from, to, holidays);
};

export const updateLeaveBalance = (
  balance: LeaveBalance,
  leaveType: LeaveRequest["type"],
  days: number
): LeaveBalance => {
  const updated = { ...balance };
  
  switch (leaveType) {
    case "Annual Leave":
      updated.annualLeave = Math.max(0, updated.annualLeave - days);
      break;
    case "Sick Leave":
      updated.sickLeave = Math.max(0, updated.sickLeave - days);
      break;
    case "Maternity Leave":
      updated.maternityLeave = Math.max(0, updated.maternityLeave - days);
      break;
    case "Casual Leave":
      updated.casualLeave = Math.max(0, updated.casualLeave - days);
      break;
    default:
      // Other leave types (e.g. study, paternity, unpaid, compassionate) do not affect tracked balances
      break;
  }
  
  return updated;
};

export const getLeaveBalanceForType = (
  balance: LeaveBalance | undefined,
  leaveType: LeaveRequest["type"]
): number => {
  if (!balance) return 0;
  
  switch (leaveType) {
    case "Annual Leave":
      return balance.annualLeave;
    case "Sick Leave":
      return balance.sickLeave;
    case "Maternity Leave":
      return balance.maternityLeave;
    case "Casual Leave":
      return balance.casualLeave;
    default:
      return 0;
  }
};

