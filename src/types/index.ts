// User and Authentication Types
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: "HR Admin" | "Manager" | "Employee";
  initials: string;
}

export type AuthenticatedUser = Omit<User, "password">;

export interface AuthState {
  user: AuthenticatedUser | null;
  isAuthenticated: boolean;
}

// Employee Types
export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  gender?: "Male" | "Female" | "Other";
  address?: string;
  department: string;
  jobTitle: string;
  grade?: string;
  level?: string;
  status: "Active" | "On Leave" | "Inactive";
  joinDate: string;
  salary: number;
  initials: string;
  nextOfKin?: {
    name: string;
    relationship: string;
    phone: string;
    address: string;
  };
  documents?: Array<{
    id: string;
    name: string;
    type: string;
    uploadedDate: string;
  }>;
}

// Recruitment Types
export interface Applicant {
  id: string;
  name: string;
  email: string;
  position: string;
  appliedDate: string;
  status: "Applied" | "Shortlisted" | "Interviewed" | "Offered" | "Hired" | "Rejected";
  initials: string;
  interviewNotes?: string;
  onboardingChecklist?: {
    documentSubmission: boolean;
    accountCreation: boolean;
    equipmentAssignment: boolean;
    orientationCompletion: boolean;
  };
}

// Attendance Types
export interface Attendance {
  id: string;
  employeeId: string;
  employee: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status: "Present" | "Late" | "Absent" | "On Leave";
  department: string;
}

// Leave Types
export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee: string;
  type: "Annual Leave" | "Sick Leave" | "Maternity Leave" | "Casual Leave";
  from: string;
  to: string;
  days: number;
  status: "Approved" | "Pending" | "Rejected";
  reason?: string;
}

export interface LeaveBalance {
  employeeId: string;
  annualLeave: number;
  sickLeave: number;
  maternityLeave: number;
  casualLeave: number;
}

// Payroll Types
export interface Payroll {
  id: string;
  employeeId: string;
  employee: string;
  department: string;
  basicSalary: number;
  allowances: {
    housing?: number;
    transport?: number;
    medical?: number;
    other?: number;
  };
  deductions: {
    tax: number;
    pension: number;
    nhia: number;
    loans?: number;
  };
  netPay: number;
  status: "Paid" | "Pending";
  month: string;
  year: string;
}

// Performance Types
export interface Performance {
  id: string;
  employeeId: string;
  employee: string;
  department: string;
  overallScore: number;
  goals: number;
  teamwork: number;
  communication: number;
  rating: "Excellent" | "Good" | "Average" | "Poor";
  reviewDate?: string;
  promotion?: {
    date: string;
    fromPosition: string;
    toPosition: string;
  };
  salaryIncrement?: {
    date: string;
    amount: number;
    percentage: number;
  };
}

// Training Types
export interface Training {
  id: string;
  title: string;
  employeeId: string;
  employee: string;
  date: string;
  status: "Completed" | "In Progress" | "Scheduled";
  certification: boolean;
}

// Discipline Types
export interface Discipline {
  id: string;
  employeeId: string;
  employee: string;
  type: "Verbal Warning" | "Written Warning" | "Final Warning" | "Query";
  date: string;
  reason: string;
  status: "Active" | "Resolved";
}

// Holiday Types
export interface Holiday {
  id: string;
  name: string;
  date: string;
  day: string;
  type: "National" | "Company";
}

