import { z } from "zod";

export const allowedDepartments = [
  "Finance and Accounting (Financial Control, Treasury, Financial Operations, Credit Control)",
  "Corporate Services (Facility Management, Fleet Management, Physical Security)",
  "Sales and Marketing",
  "Customer Support Services",
  "Research and Development",
  "Technical Operations",
  "Digital Skills Development",
  "Information Security",
  "Human resources and admin",
  "Procurment logistic and onchain supply",
  "Gov Integration and stakeholder engagement",
] as const;

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
  department: z.enum(allowedDepartments),
  jobTitle: z.string().min(1),
  grade: z.string().optional(),
  level: z.string().optional(),
  status: z.enum(["Active", "On Leave", "Inactive"]),
  joinDate: z.string().min(1),
  salary: z.coerce.number().positive(),
  nextOfKin: z
    .object({
      name: z.string().optional(),
      relationship: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
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

const latSchema = z
  .number()
  .refine((v) => Number.isFinite(v) && v >= -90 && v <= 90, "Latitude must be between -90 and 90");
const lngSchema = z
  .number()
  .refine((v) => Number.isFinite(v) && v >= -180 && v <= 180, "Longitude must be between -180 and 180");

export const officeLocationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(80),
  centerLat: latSchema,
  centerLng: lngSchema,
  radiusM: z.number().int().positive().max(5000),
  maxAccuracyM: z.number().int().positive().max(500),
  entryBufferM: z.number().int().min(0).max(500).optional(),
  exitBufferM: z.number().int().min(0).max(500).optional(),
  exitGraceSeconds: z.number().int().min(0).max(3600).optional(),
  openTime: z.string().regex(/^\d{2}:\d{2}$/, "Open time must be HH:MM").optional(),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/, "Close time must be HH:MM").optional(),
  timeZone: z.string().min(1).max(64).optional(),
  enabled: z.boolean().optional(),
  // Optional list of office public IPs / CIDRs. When set, a request whose
  // source IP matches ANY entry is treated as "inside the office network" for
  // auto-attendance, independent of browser geolocation. This is the reliable
  // cross-browser, cross-device fall-back: all staff on the office Wi-Fi/LAN
  // share the same WAN IP regardless of which browser they use.
  allowedIps: z.array(z.string().min(2).max(64)).max(50).optional(),
  // Optional list of office Wi-Fi SSIDs. Browsers cannot read an SSID on
  // their own, so the employee selects the network they are connected to
  // once and the server matches the claim against this list. Matching is
  // case-insensitive and works identically across every browser / OS.
  allowedSsids: z.array(z.string().min(1).max(64)).max(20).optional(),
});

/**
 * Targeted office-hours update. Does NOT touch geofence fields so the admin
 * can edit hours independently. All three fields are required.
 */
export const officeHoursSchema = z.object({
  openTime: z.string().regex(/^\d{2}:\d{2}$/, "Open time must be HH:MM"),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/, "Close time must be HH:MM"),
  timeZone: z.string().min(1).max(64),
});

/** Simplified office settings — no geolocation. */
export const officeSettingsSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2).max(80),
  openTime: z.string().regex(/^\d{2}:\d{2}$/, "Open time must be HH:MM"),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/, "Close time must be HH:MM"),
  timeZone: z.string().min(1).max(64),
  autoStartEnabled: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

/** Attendance report query params. Dates are ISO YYYY-MM-DD, inclusive. */
export const attendanceReportQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "from must be YYYY-MM-DD"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "to must be YYYY-MM-DD"),
  department: z.string().min(1).max(80).optional(),
});

// Browsers occasionally return fractional or 0 accuracy. Accept any non-negative
// number up to 50km (Wi-Fi / IP-geo fall-backs can be this coarse) and normalize
// downstream. Lat/lng are also optional so that IP-only check-ins work when
// the user has denied browser geolocation.
export const deviceRegisterSchema = z.object({
  deviceId: z.string().min(8).max(128),
  deviceLabel: z.string().min(1).max(80).optional(),
  lat: latSchema.optional(),
  lng: lngSchema.optional(),
  accuracyM: z.number().nonnegative().max(50_000).optional(),
  ssid: z.string().min(1).max(64).optional(),
});

export const autoAttendanceEvaluateSchema = z.object({
  deviceId: z.string().min(8).max(128),
  lat: latSchema.optional(),
  lng: lngSchema.optional(),
  accuracyM: z.number().nonnegative().max(50_000).optional(),
  // Employee-claimed current Wi-Fi SSID (e.g. "galaxy-itt"). Case-insensitive
  // match against the office's allowed_ssids list.
  ssid: z.string().min(1).max(64).optional(),
});

export const officeIpAllowlistSchema = z
  .array(z.string().min(2).max(64))
  .max(50)
  .optional();

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

