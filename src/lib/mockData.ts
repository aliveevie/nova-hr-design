// Authentication Users - Keep this for login functionality
export const users = [
  {
    id: "1",
    name: "Mariya Abubakar",
    email: "mabubakar@galaxyitt.com.ng",
    password: "mabubukar$#!0024!",
    role: "HR Admin" as const,
    initials: "MA",
  },
];

// All other data starts empty - will be populated as users add entries
export const employees: any[] = [];

export const recentActivities: any[] = [];

export const upcomingHolidays: any[] = [];

export const attendanceChartData: any[] = [];

export const applicants: any[] = [];

export const leaveRequests: any[] = [];

export const payrollData: any[] = [];

// Leave Balances - will be created when employees are added
export const leaveBalances: any[] = [];

export const trainingRecords: any[] = [];

export const disciplineRecords: any[] = [];

export const holidaysList: any[] = [];

export const performanceData: any[] = [];

export const attendanceRecords: any[] = [];
