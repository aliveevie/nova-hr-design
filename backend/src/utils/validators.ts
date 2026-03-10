import { z } from "zod";

export const employeeSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  language: z.string().optional(),
  ninNumber: z.string().optional(),
  bvn: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  address: z.string().optional(),
  department: z.string().min(1),
  jobTitle: z.string().min(1),
  grade: z.string().optional(),
  level: z.string().optional(),
  status: z.enum(["Active", "On Leave", "Inactive"]),
  joinDate: z.string().min(1),
  salary: z.number().positive(),
  nextOfKin: z
    .object({
      name: z.string(),
      relationship: z.string(),
      phone: z.string(),
      address: z.string(),
    })
    .optional(),
});

export const applicantSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  position: z.string().min(1),
  appliedDate: z.string().min(1),
  status: z.enum([
    "Applied",
    "Shortlisted",
    "Interviewed",
    "Offered",
    "Hired",
    "Rejected",
  ]),
});

export const leaveRequestSchema = z.object({
  employeeId: z.string().min(1),
  type: z.enum([
    "Annual Leave",
    "Sick Leave",
    "Maternity Leave",
    "Casual Leave",
    "Study Leave",
    "Paternity Leave",
    "Examination Leave",
    "Voluntary/Unpaid Leave",
    "Compassionate Leave",
  ]),
  from: z.string().min(1),
  to: z.string().min(1),
  reason: z.string().optional(),
});

export const attendanceSchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().min(1),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  status: z.enum(["Present", "Late", "Absent", "On Leave"]),
});

export const payrollSchema = z.object({
  employeeId: z.string().min(1),
  basicSalary: z.number().positive(),
  allowances: z
    .object({
      housing: z.number().default(0),
      transport: z.number().default(0),
      medical: z.number().default(0),
      other: z.number().default(0),
    })
    .optional(),
  deductions: z.object({
    tax: z.number().default(0),
    pension: z.number().default(0),
    nhia: z.number().default(0),
    loans: z.number().default(0),
  }),
  month: z.string().min(1),
  year: z.string().min(1),
});

export const performanceSchema = z.object({
  employeeId: z.string().min(1),
  overallScore: z.number().min(0).max(100),
  goals: z.number().min(0).max(100),
  teamwork: z.number().min(0).max(100),
  communication: z.number().min(0).max(100),
  rating: z.enum(["Excellent", "Good", "Average", "Poor"]),
  reviewDate: z.string().optional(),
});

export const trainingSchema = z.object({
  employeeId: z.string().min(1),
  title: z.string().min(1),
  date: z.string().min(1),
  status: z.enum(["Completed", "In Progress", "Scheduled"]),
  certification: z.boolean().default(false),
});

export const disciplineSchema = z.object({
  employeeId: z.string().min(1),
  type: z.enum(["Verbal Warning", "Written Warning", "Final Warning", "Query"]),
  date: z.string().min(1),
  reason: z.string().min(1),
  status: z.enum(["Active", "Resolved"]),
});

export const holidaySchema = z.object({
  name: z.string().min(1),
  date: z.string().min(1),
  day: z.string().min(1),
  type: z.enum(["National", "Company"]),
});

