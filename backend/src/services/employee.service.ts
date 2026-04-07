import { getDatabase, dbHelpers } from "../config/database.js";
import { randomUUID } from "crypto";
import { hashPassword } from "../utils/password.util.js";
import { employeeSchema } from "../utils/validators.js";
import { getSql, isSupabaseEnabled } from "../config/supabase.js";

const makeInitials = (name: string) =>
  name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const mapEmployeeInputToDb = (employeeData: any) => ({
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
  initials: makeInitials(employeeData.name),
  next_of_kin_name: employeeData.nextOfKin?.name || null,
  next_of_kin_relationship: employeeData.nextOfKin?.relationship || null,
  next_of_kin_phone: employeeData.nextOfKin?.phone || null,
  next_of_kin_address: employeeData.nextOfKin?.address || null,
});

export type EmployeeListScope = {
  /** When set, only employees owned by this HR Admin user id */
  hrAdminUserId?: string;
};

/** Managers assign new staff to primary HR Admin (Mariya); HR Admins own their own records. */
export const resolveAdminOwnerForCreate = async (
  role: string,
  userId: string
): Promise<string> => {
  if (role === "HR Admin") return userId;
  const primary = await getUserIdByEmail("mabubakar@galaxyitt.com.ng");
  return primary || userId;
};

export const getUserIdByEmail = async (email: string): Promise<string | null> => {
  const normalized = email.trim().toLowerCase();
  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const rows = await sql`select id from users where lower(email) = ${normalized} limit 1`;
    return rows[0]?.id ?? null;
  }
  await dbHelpers.read();
  const db = getDatabase();
  const u = db.data.users.find(
    (x: any) => String(x.email || "").toLowerCase() === normalized
  );
  return u?.id ?? null;
};

/** Employees an HR Admin may manage (strict ownership). */
export const getOwnedEmployeeIdsForHrAdmin = async (
  hrAdminUserId: string
): Promise<string[]> => {
  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const rows: any[] =
      await sql`select id from employees where admin_owner_id = ${hrAdminUserId}`;
    return rows.map((r) => r.id as string);
  }
  await dbHelpers.read();
  const db = getDatabase();
  return db.data.employees
    .filter((e: any) => e.admin_owner_id === hrAdminUserId)
    .map((e: any) => e.id);
};

export const hrAdminOwnsEmployee = async (
  employeeId: string,
  hrAdminUserId: string
): Promise<boolean> => {
  const emp = await getEmployeeById(employeeId);
  if (!emp) return false;
  return (emp as any).admin_owner_id === hrAdminUserId;
};

export const getAllEmployees = async (
  filters?: {
    department?: string;
    status?: string;
  },
  scope?: EmployeeListScope
) => {
  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const owner = scope?.hrAdminUserId;

    if (owner) {
      if (filters?.department && filters?.status) {
        return sql`
          select * from employees
          where admin_owner_id = ${owner}
            and department = ${filters.department}
            and status = ${filters.status}
          order by created_at desc
        `;
      }
      if (filters?.department) {
        return sql`
          select * from employees
          where admin_owner_id = ${owner} and department = ${filters.department}
          order by created_at desc
        `;
      }
      if (filters?.status) {
        return sql`
          select * from employees
          where admin_owner_id = ${owner} and status = ${filters.status}
          order by created_at desc
        `;
      }
      return sql`
        select * from employees where admin_owner_id = ${owner} order by created_at desc
      `;
    }

    if (filters?.department && filters?.status) {
      return sql`select * from employees where department = ${filters.department} and status = ${filters.status} order by created_at desc`;
    } else if (filters?.department) {
      return sql`select * from employees where department = ${filters.department} order by created_at desc`;
    } else if (filters?.status) {
      return sql`select * from employees where status = ${filters.status} order by created_at desc`;
    }
    return sql`select * from employees order by created_at desc`;
  }

  await dbHelpers.read();
  const db = getDatabase();
  let employees = [...db.data.employees];

  if (scope?.hrAdminUserId) {
    employees = employees.filter(
      (e: any) => e.admin_owner_id === scope.hrAdminUserId
    );
  }

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
  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const rows = await sql`select * from employees where id = ${id} limit 1`;
    return rows[0] || null;
  }

  await dbHelpers.read();
  const db = getDatabase();
  return db.data.employees.find((e) => e.id === id);
};

export type CreateEmployeeOptions = {
  adminOwnerId: string;
  createdViaInviteId?: string;
};

export const createEmployee = async (
  employeeData: any,
  options: CreateEmployeeOptions
) => {
  const tempPassword =
    Math.random().toString(36).slice(-12) +
    Math.random().toString(36).slice(-12).toUpperCase() +
    "!@#";
  const hashedPassword = await hashPassword(tempPassword);

  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const employeeId = randomUUID();
    const userId = randomUUID();
    const mapped = mapEmployeeInputToDb(employeeData);
    const inviteId = options.createdViaInviteId ?? null;

    const [employee] = await sql`
      insert into employees (
        id, name, email, phone, language, nin_number, bvn,
        date_of_birth, gender, address, department, job_title,
        grade, level, status, join_date, salary, initials,
        next_of_kin_name, next_of_kin_relationship, next_of_kin_phone, next_of_kin_address,
        admin_owner_id, created_via_invite_id
      ) values (
        ${employeeId}, ${mapped.name}, ${mapped.email}, ${mapped.phone},
        ${mapped.language}, ${mapped.nin_number}, ${mapped.bvn},
        ${mapped.date_of_birth}, ${mapped.gender}, ${mapped.address},
        ${mapped.department}, ${mapped.job_title}, ${mapped.grade}, ${mapped.level},
        ${mapped.status}, ${mapped.join_date}, ${mapped.salary}, ${mapped.initials},
        ${mapped.next_of_kin_name}, ${mapped.next_of_kin_relationship},
        ${mapped.next_of_kin_phone}, ${mapped.next_of_kin_address},
        ${options.adminOwnerId}, ${inviteId}
      ) returning *
    `;

    await sql`
      insert into leave_balances (id, employee_id, annual_leave, sick_leave, maternity_leave, casual_leave)
      values (${randomUUID()}, ${employeeId}, 20, 10, 0, 5)
    `;

    await sql`
      insert into users (id, name, email, password, role, employee_id, initials)
      values (${userId}, ${mapped.name}, ${mapped.email}, ${hashedPassword}, 'Employee', ${employeeId}, ${mapped.initials})
    `;

    return { ...employee, tempPassword };
  }

  const mappedLocal = mapEmployeeInputToDb(employeeData);
  const emailLower = String(mappedLocal.email || "").trim().toLowerCase();

  await dbHelpers.read();
  const db = getDatabase();
  const dupEmp = (db.data.employees || []).find(
    (x: any) => String(x.email || "").toLowerCase() === emailLower
  );
  if (dupEmp) {
    throw Object.assign(new Error("duplicate email"), {
      code: "23505",
      constraint_name: "employees_email_key",
    });
  }
  const dupUser = (db.data.users || []).find(
    (x: any) => String(x.email || "").toLowerCase() === emailLower
  );
  if (dupUser) {
    throw Object.assign(new Error("duplicate email"), {
      code: "23505",
      constraint_name: "users_email_key",
    });
  }

  const id = randomUUID();

  const newEmployee = {
    id,
    ...mappedLocal,
    admin_owner_id: options.adminOwnerId,
    created_via_invite_id: options.createdViaInviteId ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.data.employees.push(newEmployee);

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

  db.data.users.push({
    id: randomUUID(),
    name: employeeData.name,
    email: mappedLocal.email,
    password: hashedPassword,
    role: "Employee",
    employeeId: id,
    initials: makeInitials(employeeData.name),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  await dbHelpers.write();
  return { ...newEmployee, tempPassword };
};

export const updateEmployee = async (id: string, employeeData: any) => {
  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const existing = await getEmployeeById(id);
    if (!existing) return null;

    const merged = mapEmployeeInputToDb({
      ...existing,
      ...employeeData,
      nextOfKin: employeeData.nextOfKin ?? {
        name: existing.next_of_kin_name,
        relationship: existing.next_of_kin_relationship,
        phone: existing.next_of_kin_phone,
        address: existing.next_of_kin_address,
      },
    });

    const [updated] = await sql`
      update employees set
        name = ${merged.name}, email = ${merged.email}, phone = ${merged.phone},
        language = ${merged.language}, nin_number = ${merged.nin_number}, bvn = ${merged.bvn},
        date_of_birth = ${merged.date_of_birth}, gender = ${merged.gender}, address = ${merged.address},
        department = ${merged.department}, job_title = ${merged.job_title},
        grade = ${merged.grade}, level = ${merged.level},
        status = ${merged.status}, join_date = ${merged.join_date}, salary = ${merged.salary},
        initials = ${merged.initials},
        next_of_kin_name = ${merged.next_of_kin_name},
        next_of_kin_relationship = ${merged.next_of_kin_relationship},
        next_of_kin_phone = ${merged.next_of_kin_phone},
        next_of_kin_address = ${merged.next_of_kin_address}
      where id = ${id}
      returning *
    `;
    return updated;
  }

  await dbHelpers.read();
  const db = getDatabase();
  const index = db.data.employees.findIndex((e) => e.id === id);
  if (index === -1) return null;

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
    next_of_kin_name:
      employeeData.nextOfKin?.name !== undefined
        ? employeeData.nextOfKin.name
        : existing.next_of_kin_name,
    next_of_kin_relationship:
      employeeData.nextOfKin?.relationship !== undefined
        ? employeeData.nextOfKin.relationship
        : existing.next_of_kin_relationship,
    next_of_kin_phone:
      employeeData.nextOfKin?.phone !== undefined
        ? employeeData.nextOfKin.phone
        : existing.next_of_kin_phone,
    next_of_kin_address:
      employeeData.nextOfKin?.address !== undefined
        ? employeeData.nextOfKin.address
        : existing.next_of_kin_address,
    updated_at: new Date().toISOString(),
  };

  await dbHelpers.write();
  return db.data.employees[index];
};

export const deleteEmployee = async (id: string) => {
  if (isSupabaseEnabled) {
    const sql = getSql()!;
    await sql`update employees set status = 'Inactive' where id = ${id}`;
    return true;
  }

  await dbHelpers.read();
  const db = getDatabase();
  const index = db.data.employees.findIndex((e) => e.id === id);
  if (index !== -1) {
    db.data.employees[index].status = "Inactive";
    db.data.employees[index].updated_at = new Date().toISOString();
    await dbHelpers.write();
  }
  return true;
};

export const getEmployeeDocuments = async (employeeId: string) => {
  if (isSupabaseEnabled) {
    const sql = getSql()!;
    return sql`select * from employee_documents where employee_id = ${employeeId} order by uploaded_date desc`;
  }

  await dbHelpers.read();
  const db = getDatabase();
  return db.data.employeeDocuments
    .filter((d) => d.employee_id === employeeId)
    .sort((a, b) => new Date(b.uploaded_date).getTime() - new Date(a.uploaded_date).getTime());
};

export const bulkCreateEmployees = async (
  rows: Record<string, unknown>[],
  adminOwnerId: string
) => {
  let existingEmployees: any[] = [];
  let existingUsers: any[] = [];

  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const [empData, userData] = await Promise.all([
      sql`select email, nin_number, bvn from employees`,
      sql`select email from users`,
    ]);
    existingEmployees = empData;
    existingUsers = userData;
  } else {
    await dbHelpers.read();
    const db = getDatabase();
    existingEmployees = db.data.employees;
    existingUsers = db.data.users;
  }

  const errors: Array<{ row: number; field: string; message: string; rawValue?: unknown }> = [];
  const validRows: any[] = [];

  const existingEmails = new Set(
    [
      ...existingEmployees.map((e) => String(e.email || "").toLowerCase()),
      ...existingUsers.map((u) => String(u.email || "").toLowerCase()),
    ].filter(Boolean)
  );
  const existingNins = new Set(existingEmployees.map((e) => String(e.nin_number || "")).filter(Boolean));
  const existingBvns = new Set(existingEmployees.map((e) => String(e.bvn || "")).filter(Boolean));

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
    const employee = await createEmployee(row, { adminOwnerId });
    createdEmployees.push(employee);
  }

  return { success: true as const, errors: [], createdEmployees };
};
