import { getDatabase, dbHelpers } from "../config/database.js";
import { randomUUID } from "crypto";
import { hashPassword } from "../utils/password.util.js";
import { employeeSchema } from "../utils/validators.js";

export const getAllEmployees = async (filters?: {
  department?: string;
  status?: string;
}) => {
  await dbHelpers.read();
  const db = getDatabase();
  let employees = [...db.data.employees];

  if (filters?.department) {
    employees = employees.filter((e) => e.department === filters.department);
  }

  if (filters?.status) {
    employees = employees.filter((e) => e.status === filters.status);
  }

  return employees.sort((a, b) => 
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
};

export const getEmployeeById = async (id: string) => {
  await dbHelpers.read();
  const db = getDatabase();
  return db.data.employees.find((e) => e.id === id);
};

export const createEmployee = async (employeeData: any) => {
  await dbHelpers.read();
  const db = getDatabase();
  const id = randomUUID();
  const initials = employeeData.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const newEmployee = {
    id,
    name: employeeData.name,
    email: employeeData.email,
    phone: employeeData.phone || null,
    language: employeeData.language || null,
    nin_number: employeeData.ninNumber || null,
    bvn: employeeData.bvn || null,
    date_of_birth: employeeData.dateOfBirth || null,
    gender: employeeData.gender || null,
    address: employeeData.address || null,
    department: employeeData.department,
    job_title: employeeData.jobTitle,
    grade: employeeData.grade || null,
    level: employeeData.level || null,
    status: employeeData.status,
    join_date: employeeData.joinDate,
    salary: employeeData.salary,
    initials,
    next_of_kin_name: employeeData.nextOfKin?.name || null,
    next_of_kin_relationship: employeeData.nextOfKin?.relationship || null,
    next_of_kin_phone: employeeData.nextOfKin?.phone || null,
    next_of_kin_address: employeeData.nextOfKin?.address || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.data.employees.push(newEmployee);

  // Create leave balance
  db.data.leaveBalances.push({
    id: randomUUID(),
    employee_id: id,
    annual_leave: 20,
    sick_leave: 10,
    maternity_leave: 0,
    casual_leave: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  // Generate temporary password for employee login
  const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12).toUpperCase() + "!@#";
  const hashedPassword = await hashPassword(tempPassword);
  
  // Create user account for employee
  const userId = randomUUID();
  const userInitials = employeeData.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  
  db.data.users.push({
    id: userId,
    name: employeeData.name,
    email: employeeData.email,
    password: hashedPassword,
    role: "Employee",
    employeeId: id,
    initials: userInitials,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  await dbHelpers.write();
  
  // Return employee with temporary password for email
  return { ...newEmployee, tempPassword };
};

export const updateEmployee = async (id: string, employeeData: any) => {
  await dbHelpers.read();
  const db = getDatabase();
  const index = db.data.employees.findIndex((e) => e.id === id);
  if (index === -1) {
    return null;
  }

  const existing = db.data.employees[index];
  db.data.employees[index] = {
    ...existing,
    name: employeeData.name || existing.name,
    email: employeeData.email || existing.email,
    phone: employeeData.phone !== undefined ? employeeData.phone : existing.phone,
    language: employeeData.language !== undefined ? employeeData.language : existing.language,
    nin_number: employeeData.ninNumber !== undefined ? employeeData.ninNumber : existing.nin_number,
    bvn: employeeData.bvn !== undefined ? employeeData.bvn : existing.bvn,
    date_of_birth: employeeData.dateOfBirth !== undefined ? employeeData.dateOfBirth : existing.date_of_birth,
    gender: employeeData.gender !== undefined ? employeeData.gender : existing.gender,
    address: employeeData.address !== undefined ? employeeData.address : existing.address,
    department: employeeData.department || existing.department,
    job_title: employeeData.jobTitle || existing.job_title,
    grade: employeeData.grade !== undefined ? employeeData.grade : existing.grade,
    level: employeeData.level !== undefined ? employeeData.level : existing.level,
    status: employeeData.status || existing.status,
    join_date: employeeData.joinDate || existing.join_date,
    salary: employeeData.salary !== undefined ? employeeData.salary : existing.salary,
    next_of_kin_name: employeeData.nextOfKin?.name !== undefined ? employeeData.nextOfKin.name : existing.next_of_kin_name,
    next_of_kin_relationship: employeeData.nextOfKin?.relationship !== undefined ? employeeData.nextOfKin.relationship : existing.next_of_kin_relationship,
    next_of_kin_phone: employeeData.nextOfKin?.phone !== undefined ? employeeData.nextOfKin.phone : existing.next_of_kin_phone,
    next_of_kin_address: employeeData.nextOfKin?.address !== undefined ? employeeData.nextOfKin.address : existing.next_of_kin_address,
    updated_at: new Date().toISOString(),
  };

  await dbHelpers.write();
  return db.data.employees[index];
};

export const deleteEmployee = async (id: string) => {
  await dbHelpers.read();
  const db = getDatabase();
  const index = db.data.employees.findIndex((e) => e.id === id);
  if (index !== -1) {
    // Soft delete
    db.data.employees[index].status = "Inactive";
    db.data.employees[index].updated_at = new Date().toISOString();
    await dbHelpers.write();
  }
  return true;
};

export const getEmployeeDocuments = async (employeeId: string) => {
  await dbHelpers.read();
  const db = getDatabase();
  return db.data.employeeDocuments
    .filter((d) => d.employee_id === employeeId)
    .sort((a, b) => new Date(b.uploaded_date).getTime() - new Date(a.uploaded_date).getTime());
};

export const bulkCreateEmployees = async (rows: Record<string, unknown>[]) => {
  await dbHelpers.read();
  const db = getDatabase();

  const errors: Array<{ row: number; field: string; message: string; rawValue?: unknown }> = [];
  const validRows: any[] = [];

  const existingEmails = new Set(
    [...db.data.employees.map((e) => String(e.email || "").toLowerCase()), ...db.data.users.map((u) => String(u.email || "").toLowerCase())]
      .filter(Boolean)
  );
  const existingNins = new Set(db.data.employees.map((e) => String(e.nin_number || "")).filter(Boolean));
  const existingBvns = new Set(db.data.employees.map((e) => String(e.bvn || "")).filter(Boolean));

  const seenEmails = new Set<string>();
  const seenNins = new Set<string>();
  const seenBvns = new Set<string>();

  rows.forEach((rawRow, index) => {
    const rowNumber = index + 2;
    const row = rawRow as any;
    const candidate = {
      name: row.name,
      email: row.email,
      phone: row.phone || undefined,
      language: row.language || undefined,
      ninNumber: row.ninNumber || undefined,
      bvn: row.bvn || undefined,
      dateOfBirth: row.dateOfBirth || undefined,
      gender: row.gender || undefined,
      address: row.address || undefined,
      department: row.department,
      jobTitle: row.jobTitle,
      grade: row.grade || undefined,
      level: row.level || undefined,
      status: row.status,
      joinDate: row.joinDate,
      salary: row.salary,
    };

    const validation = employeeSchema.safeParse(candidate);
    if (!validation.success) {
      validation.error.errors.forEach((err) => {
        errors.push({
          row: rowNumber,
          field: err.path.join(".") || "row",
          message: err.message,
          rawValue: err.path.length ? row[err.path[0] as string] : row,
        });
      });
      return;
    }

    const normalizedEmail = String(candidate.email).toLowerCase().trim();
    if (existingEmails.has(normalizedEmail)) {
      errors.push({ row: rowNumber, field: "email", message: "Email already exists", rawValue: candidate.email });
    }
    if (seenEmails.has(normalizedEmail)) {
      errors.push({ row: rowNumber, field: "email", message: "Duplicate email in uploaded file", rawValue: candidate.email });
    }
    seenEmails.add(normalizedEmail);

    if (candidate.ninNumber) {
      const nin = String(candidate.ninNumber).trim();
      if (existingNins.has(nin)) {
        errors.push({ row: rowNumber, field: "ninNumber", message: "NIN already exists", rawValue: candidate.ninNumber });
      }
      if (seenNins.has(nin)) {
        errors.push({ row: rowNumber, field: "ninNumber", message: "Duplicate NIN in uploaded file", rawValue: candidate.ninNumber });
      }
      seenNins.add(nin);
    }

    if (candidate.bvn) {
      const bvn = String(candidate.bvn).trim();
      if (existingBvns.has(bvn)) {
        errors.push({ row: rowNumber, field: "bvn", message: "BVN already exists", rawValue: candidate.bvn });
      }
      if (seenBvns.has(bvn)) {
        errors.push({ row: rowNumber, field: "bvn", message: "Duplicate BVN in uploaded file", rawValue: candidate.bvn });
      }
      seenBvns.add(bvn);
    }

    validRows.push(validation.data);
  });

  if (errors.length > 0) {
    return { success: false as const, errors, createdEmployees: [] };
  }

  const createdEmployees = [];
  for (const row of validRows) {
    const employee = await createEmployee(row);
    createdEmployees.push(employee);
  }

  return { success: true as const, errors: [], createdEmployees };
};
