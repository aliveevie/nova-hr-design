import { getDatabase, dbHelpers } from "../config/database.js";
import { randomUUID } from "crypto";
import { hashPassword } from "../utils/password.util.js";

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
