export const employees = [
  { id: "1", name: "Sarah Johnson", email: "sarah.j@novahr.com", department: "Engineering", jobTitle: "Senior Developer", status: "Active" as const, phone: "+1 (555) 123-4567", joinDate: "2021-03-15", salary: 95000, initials: "SJ" },
  { id: "2", name: "Michael Chen", email: "m.chen@novahr.com", department: "Marketing", jobTitle: "Marketing Manager", status: "Active" as const, phone: "+1 (555) 234-5678", joinDate: "2020-07-22", salary: 85000, initials: "MC" },
  { id: "3", name: "Emily Rodriguez", email: "e.rodriguez@novahr.com", department: "Human Resources", jobTitle: "HR Specialist", status: "Active" as const, phone: "+1 (555) 345-6789", joinDate: "2022-01-10", salary: 72000, initials: "ER" },
  { id: "4", name: "David Kim", email: "d.kim@novahr.com", department: "Finance", jobTitle: "Financial Analyst", status: "On Leave" as const, phone: "+1 (555) 456-7890", joinDate: "2019-11-05", salary: 88000, initials: "DK" },
  { id: "5", name: "Jessica Thompson", email: "j.thompson@novahr.com", department: "Engineering", jobTitle: "Frontend Developer", status: "Active" as const, phone: "+1 (555) 567-8901", joinDate: "2023-02-28", salary: 82000, initials: "JT" },
  { id: "6", name: "Robert Williams", email: "r.williams@novahr.com", department: "Sales", jobTitle: "Sales Director", status: "Active" as const, phone: "+1 (555) 678-9012", joinDate: "2018-06-14", salary: 105000, initials: "RW" },
  { id: "7", name: "Amanda Foster", email: "a.foster@novahr.com", department: "Design", jobTitle: "UI/UX Designer", status: "Active" as const, phone: "+1 (555) 789-0123", joinDate: "2022-09-01", salary: 78000, initials: "AF" },
  { id: "8", name: "James Wilson", email: "j.wilson@novahr.com", department: "Operations", jobTitle: "Operations Manager", status: "Inactive" as const, phone: "+1 (555) 890-1234", joinDate: "2017-04-20", salary: 92000, initials: "JW" },
];

export const recentActivities = [
  { id: "1", action: "Completed onboarding", user: "Sarah Johnson", time: "2 hours ago", type: "success" as const },
  { id: "2", action: "Leave request approved", user: "David Kim", time: "4 hours ago", type: "info" as const },
  { id: "3", action: "New applicant received", user: "Alex Turner", time: "5 hours ago", type: "default" as const },
  { id: "4", action: "Performance review submitted", user: "Michael Chen", time: "Yesterday", type: "success" as const },
  { id: "5", action: "Payroll processed for February", user: "System", time: "Yesterday", type: "info" as const },
];

export const upcomingHolidays = [
  { name: "Presidents' Day", date: "Feb 17, 2026" },
  { name: "Memorial Day", date: "May 25, 2026" },
  { name: "Independence Day", date: "Jul 4, 2026" },
  { name: "Labor Day", date: "Sep 7, 2026" },
];

export const attendanceChartData = [
  { day: "Mon", present: 142, absent: 8, late: 6 },
  { day: "Tue", present: 138, absent: 10, late: 8 },
  { day: "Wed", present: 148, absent: 5, late: 3 },
  { day: "Thu", present: 145, absent: 6, late: 5 },
  { day: "Fri", present: 135, absent: 12, late: 9 },
];

export const applicants = [
  { id: "1", name: "Alex Turner", position: "Frontend Developer", appliedDate: "2026-02-10", status: "Applied" as const, email: "alex.t@email.com", initials: "AT" },
  { id: "2", name: "Maria Santos", position: "Product Manager", appliedDate: "2026-02-05", status: "Interviewed" as const, email: "maria.s@email.com", initials: "MS" },
  { id: "3", name: "Tom Baker", position: "Data Analyst", appliedDate: "2026-01-28", status: "Offered" as const, email: "tom.b@email.com", initials: "TB" },
  { id: "4", name: "Lisa Park", position: "UX Researcher", appliedDate: "2026-01-15", status: "Hired" as const, email: "lisa.p@email.com", initials: "LP" },
  { id: "5", name: "Chris Evans", position: "Backend Developer", appliedDate: "2026-02-18", status: "Applied" as const, email: "chris.e@email.com", initials: "CE" },
];

export const leaveRequests = [
  { id: "1", employee: "David Kim", type: "Annual Leave", from: "2026-02-20", to: "2026-02-24", days: 3, status: "Approved" as const },
  { id: "2", employee: "Sarah Johnson", type: "Sick Leave", from: "2026-03-01", to: "2026-03-02", days: 2, status: "Pending" as const },
  { id: "3", employee: "Jessica Thompson", type: "Personal Leave", from: "2026-03-10", to: "2026-03-10", days: 1, status: "Pending" as const },
  { id: "4", employee: "Robert Williams", type: "Annual Leave", from: "2026-01-10", to: "2026-01-14", days: 5, status: "Approved" as const },
  { id: "5", employee: "Amanda Foster", type: "Sick Leave", from: "2026-01-20", to: "2026-01-20", days: 1, status: "Rejected" as const },
];

export const payrollData = [
  { id: "1", employee: "Sarah Johnson", department: "Engineering", basicSalary: 95000, deductions: 18500, netPay: 76500, status: "Paid" as const },
  { id: "2", employee: "Michael Chen", department: "Marketing", basicSalary: 85000, deductions: 16200, netPay: 68800, status: "Paid" as const },
  { id: "3", employee: "Emily Rodriguez", department: "Human Resources", basicSalary: 72000, deductions: 13800, netPay: 58200, status: "Paid" as const },
  { id: "4", employee: "David Kim", department: "Finance", basicSalary: 88000, deductions: 17000, netPay: 71000, status: "Pending" as const },
  { id: "5", employee: "Robert Williams", department: "Sales", basicSalary: 105000, deductions: 21000, netPay: 84000, status: "Paid" as const },
];

export const trainingRecords = [
  { id: "1", title: "React Advanced Patterns", employee: "Sarah Johnson", date: "2026-01-15", status: "Completed" as const, certification: true },
  { id: "2", title: "Leadership Workshop", employee: "Michael Chen", date: "2026-02-01", status: "In Progress" as const, certification: false },
  { id: "3", title: "Data Privacy Compliance", employee: "Emily Rodriguez", date: "2026-02-10", status: "Completed" as const, certification: true },
  { id: "4", title: "Financial Modeling", employee: "David Kim", date: "2026-03-01", status: "Scheduled" as const, certification: false },
  { id: "5", title: "UX Research Methods", employee: "Amanda Foster", date: "2026-01-20", status: "Completed" as const, certification: true },
];

export const disciplineRecords = [
  { id: "1", employee: "James Wilson", type: "Verbal Warning", date: "2026-01-10", reason: "Repeated tardiness", status: "Active" as const },
  { id: "2", employee: "Robert Williams", type: "Written Warning", date: "2025-12-15", reason: "Policy violation", status: "Resolved" as const },
  { id: "3", employee: "Michael Chen", type: "Verbal Warning", date: "2025-11-20", reason: "Missed deadline", status: "Resolved" as const },
];

export const holidaysList = [
  { id: "1", name: "New Year's Day", date: "2026-01-01", day: "Thursday", type: "National" as const },
  { id: "2", name: "Martin Luther King Jr. Day", date: "2026-01-19", day: "Monday", type: "National" as const },
  { id: "3", name: "Presidents' Day", date: "2026-02-16", day: "Monday", type: "National" as const },
  { id: "4", name: "Memorial Day", date: "2026-05-25", day: "Monday", type: "National" as const },
  { id: "5", name: "Independence Day", date: "2026-07-04", day: "Saturday", type: "National" as const },
  { id: "6", name: "Labor Day", date: "2026-09-07", day: "Monday", type: "National" as const },
  { id: "7", name: "Thanksgiving", date: "2026-11-26", day: "Thursday", type: "National" as const },
  { id: "8", name: "Christmas Day", date: "2026-12-25", day: "Friday", type: "National" as const },
  { id: "9", name: "Company Foundation Day", date: "2026-06-15", day: "Monday", type: "Company" as const },
];

export const performanceData = [
  { id: "1", employee: "Sarah Johnson", department: "Engineering", overallScore: 92, goals: 95, teamwork: 88, communication: 90, rating: "Excellent" as const },
  { id: "2", employee: "Michael Chen", department: "Marketing", overallScore: 85, goals: 82, teamwork: 90, communication: 88, rating: "Good" as const },
  { id: "3", employee: "Emily Rodriguez", department: "Human Resources", overallScore: 78, goals: 75, teamwork: 85, communication: 80, rating: "Good" as const },
  { id: "4", employee: "David Kim", department: "Finance", overallScore: 88, goals: 90, teamwork: 82, communication: 86, rating: "Good" as const },
  { id: "5", employee: "Robert Williams", department: "Sales", overallScore: 95, goals: 98, teamwork: 90, communication: 92, rating: "Excellent" as const },
];

export const attendanceRecords = [
  { id: "1", employee: "Sarah Johnson", date: "2026-02-23", checkIn: "08:55", checkOut: "17:30", status: "Present" as const, department: "Engineering" },
  { id: "2", employee: "Michael Chen", date: "2026-02-23", checkIn: "09:10", checkOut: "18:00", status: "Late" as const, department: "Marketing" },
  { id: "3", employee: "Emily Rodriguez", date: "2026-02-23", checkIn: "08:45", checkOut: "17:15", status: "Present" as const, department: "Human Resources" },
  { id: "4", employee: "David Kim", date: "2026-02-23", checkIn: "-", checkOut: "-", status: "On Leave" as const, department: "Finance" },
  { id: "5", employee: "Jessica Thompson", date: "2026-02-23", checkIn: "09:00", checkOut: "17:45", status: "Present" as const, department: "Engineering" },
  { id: "6", employee: "Robert Williams", date: "2026-02-23", checkIn: "08:30", checkOut: "17:00", status: "Present" as const, department: "Sales" },
  { id: "7", employee: "Amanda Foster", date: "2026-02-23", checkIn: "-", checkOut: "-", status: "Absent" as const, department: "Design" },
  { id: "8", employee: "James Wilson", date: "2026-02-23", checkIn: "-", checkOut: "-", status: "Absent" as const, department: "Operations" },
];
