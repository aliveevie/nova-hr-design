-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('HR Admin', 'Manager', 'Employee')),
  initials TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  date_of_birth TEXT,
  gender TEXT CHECK(gender IN ('Male', 'Female', 'Other')),
  address TEXT,
  department TEXT NOT NULL,
  job_title TEXT NOT NULL,
  grade TEXT,
  level TEXT,
  status TEXT NOT NULL CHECK(status IN ('Active', 'On Leave', 'Inactive')),
  join_date TEXT NOT NULL,
  salary REAL NOT NULL,
  initials TEXT NOT NULL,
  next_of_kin_name TEXT,
  next_of_kin_relationship TEXT,
  next_of_kin_phone TEXT,
  next_of_kin_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Applicants table
CREATE TABLE IF NOT EXISTS applicants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  position TEXT NOT NULL,
  applied_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('Applied', 'Shortlisted', 'Interviewed', 'Offered', 'Hired', 'Rejected')),
  initials TEXT NOT NULL,
  interview_notes TEXT,
  onboarding_document_submission INTEGER DEFAULT 0,
  onboarding_account_creation INTEGER DEFAULT 0,
  onboarding_equipment_assignment INTEGER DEFAULT 0,
  onboarding_orientation_completion INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  date TEXT NOT NULL,
  check_in TEXT,
  check_out TEXT,
  status TEXT NOT NULL CHECK(status IN ('Present', 'Late', 'Absent', 'On Leave')),
  department TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('Annual Leave', 'Sick Leave', 'Maternity Leave', 'Casual Leave')),
  from_date TEXT NOT NULL,
  to_date TEXT NOT NULL,
  days INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('Approved', 'Pending', 'Rejected')),
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Leave balances table
CREATE TABLE IF NOT EXISTS leave_balances (
  id TEXT PRIMARY KEY,
  employee_id TEXT UNIQUE NOT NULL,
  annual_leave INTEGER DEFAULT 20,
  sick_leave INTEGER DEFAULT 10,
  maternity_leave INTEGER DEFAULT 0,
  casual_leave INTEGER DEFAULT 5,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Payrolls table
CREATE TABLE IF NOT EXISTS payrolls (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  department TEXT NOT NULL,
  basic_salary REAL NOT NULL,
  allowance_housing REAL DEFAULT 0,
  allowance_transport REAL DEFAULT 0,
  allowance_medical REAL DEFAULT 0,
  allowance_other REAL DEFAULT 0,
  deduction_tax REAL NOT NULL,
  deduction_pension REAL NOT NULL,
  deduction_nhia REAL NOT NULL,
  deduction_loans REAL DEFAULT 0,
  net_pay REAL NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('Paid', 'Pending')),
  month TEXT NOT NULL,
  year TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Performances table
CREATE TABLE IF NOT EXISTS performances (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  department TEXT NOT NULL,
  overall_score INTEGER NOT NULL,
  goals INTEGER NOT NULL,
  teamwork INTEGER NOT NULL,
  communication INTEGER NOT NULL,
  rating TEXT NOT NULL CHECK(rating IN ('Excellent', 'Good', 'Average', 'Poor')),
  review_date TEXT,
  promotion_date TEXT,
  promotion_from_position TEXT,
  promotion_to_position TEXT,
  salary_increment_date TEXT,
  salary_increment_amount REAL,
  salary_increment_percentage REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Trainings table
CREATE TABLE IF NOT EXISTS trainings (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('Completed', 'In Progress', 'Scheduled')),
  certification INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Disciplines table
CREATE TABLE IF NOT EXISTS disciplines (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('Verbal Warning', 'Written Warning', 'Final Warning', 'Query')),
  date TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('Active', 'Resolved')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Holidays table
CREATE TABLE IF NOT EXISTS holidays (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  day TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('National', 'Company')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Employee documents table
CREATE TABLE IF NOT EXISTS employee_documents (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  uploaded_date TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_payrolls_employee_id ON payrolls(employee_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_month_year ON payrolls(month, year);

