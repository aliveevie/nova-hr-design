import { Holiday } from "@/types";

export const isHoliday = (date: string, holidays: Holiday[]): boolean => {
  return holidays.some((h) => h.date === date);
};

export const isWeekend = (date: string): boolean => {
  const d = new Date(date);
  const day = d.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};

export const calculateWorkingDays = (from: string, to: string, holidays: Holiday[]): number => {
  const start = new Date(from);
  const end = new Date(to);
  let count = 0;
  
  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0];
    if (!isWeekend(dateStr) && !isHoliday(dateStr, holidays)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const getCurrentMonth = (): string => {
  const now = new Date();
  return String(now.getMonth() + 1).padStart(2, "0");
};

export const getCurrentYear = (): string => {
  return String(new Date().getFullYear());
};

