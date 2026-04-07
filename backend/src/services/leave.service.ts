import { getDatabase, dbHelpers } from "../config/database.js";
import { randomUUID } from "crypto";
import { getEmployeeById, getOwnedEmployeeIdsForHrAdmin } from "./employee.service.js";
import { getSql, isSupabaseEnabled } from "../config/supabase.js";

export type LeaveRequestFilters = {
  employeeId?: string;
  status?: string;
  /** HR Admin user id OR primary HR id for Manager — only employees with matching admin_owner_id */
  scopeAdminOwnerId?: string;
};

export const getLeaveRequests = async (filters?: LeaveRequestFilters) => {
  if (isSupabaseEnabled) {
    const sql = getSql()!;

    if (filters?.employeeId) {
      if (filters.status) {
        return sql`
          select * from leave_requests
          where employee_id = ${filters.employeeId} and status = ${filters.status}
          order by created_at desc
        `;
      }
      return sql`
        select * from leave_requests
        where employee_id = ${filters.employeeId}
        order by created_at desc
      `;
    }

    if (filters?.scopeAdminOwnerId) {
      if (filters.status) {
        return sql`
          select lr.* from leave_requests lr
          inner join employees e on e.id = lr.employee_id
          where e.admin_owner_id = ${filters.scopeAdminOwnerId}
            and lr.status = ${filters.status}
          order by lr.created_at desc
        `;
      }
      return sql`
        select lr.* from leave_requests lr
        inner join employees e on e.id = lr.employee_id
        where e.admin_owner_id = ${filters.scopeAdminOwnerId}
        order by lr.created_at desc
      `;
    }

    // Do not list all requests without employee or admin scope (avoids leaking data)
    return [];
  }

  await dbHelpers.read();
  const db = getDatabase();
  let requests = [...db.data.leaveRequests];

  if (filters?.employeeId) {
    requests = requests.filter((r) => r.employee_id === filters.employeeId);
  }

  if (filters?.status) {
    requests = requests.filter((r) => r.status === filters.status);
  }

  if (filters?.scopeAdminOwnerId) {
    const ids = await getOwnedEmployeeIdsForHrAdmin(filters.scopeAdminOwnerId);
    const set = new Set(ids);
    requests = requests.filter((r) => r.employee_id && set.has(r.employee_id));
  }

  return requests.sort(
    (a, b) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
};

export const getLeaveRequestById = async (id: string) => {
  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const rows = await sql`select * from leave_requests where id = ${id} limit 1`;
    return rows[0] || null;
  }

  await dbHelpers.read();
  const db = getDatabase();
  return db.data.leaveRequests.find((r) => r.id === id);
};

export const createLeaveRequest = async (leaveData: any) => {
  const employee = await getEmployeeById(leaveData.employeeId);
  if (!employee) {
    throw new Error("Employee not found");
  }

  const employeeName = (employee as { name?: string }).name ?? "Employee";
  const id = randomUUID();

  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const [row] = await sql`
      insert into leave_requests (
        id, employee_id, employee_name, type, from_date, to_date, days, status, reason
      ) values (
        ${id},
        ${leaveData.employeeId},
        ${employeeName},
        ${leaveData.type},
        ${leaveData.from},
        ${leaveData.to},
        ${leaveData.days},
        'Pending',
        ${leaveData.reason ?? null}
      )
      returning *
    `;
    return row;
  }

  await dbHelpers.read();
  const db = getDatabase();

  const newRequest = {
    id,
    employee_id: leaveData.employeeId,
    employee_name: employeeName,
    type: leaveData.type,
    from_date: leaveData.from,
    to_date: leaveData.to,
    days: leaveData.days,
    status: "Pending",
    reason: leaveData.reason || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.data.leaveRequests.push(newRequest);
  await dbHelpers.write();
  return newRequest;
};

export const updateLeaveRequest = async (id: string, leaveData: any) => {
  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const existingRows = await sql`select * from leave_requests where id = ${id} limit 1`;
    const existing = existingRows[0] as Record<string, unknown> | undefined;
    if (!existing) return null;

    const [row] = await sql`
      update leave_requests
      set status = ${leaveData.status}, updated_at = now()
      where id = ${id}
      returning *
    `;

    if (leaveData.status === "Approved") {
      const days = Number(existing.days) || 0;
      const employeeId = String(existing.employee_id);
      const leaveType = String(existing.type);
      await decrementLeaveBalancePostgres(employeeId, leaveType, days);
    }

    return row;
  }

  await dbHelpers.read();
  const db = getDatabase();
  const index = db.data.leaveRequests.findIndex((r) => r.id === id);
  if (index === -1) {
    return null;
  }

  db.data.leaveRequests[index].status = leaveData.status;
  db.data.leaveRequests[index].updated_at = new Date().toISOString();

  if (leaveData.status === "Approved") {
    const request = db.data.leaveRequests[index];
    const days = Number(request.days) || 0;

    const balanceIndex = db.data.leaveBalances.findIndex(
      (b) => b.employee_id === request.employee_id
    );

    if (balanceIndex !== -1) {
      const balance = db.data.leaveBalances[balanceIndex];
      const fieldMap: Record<string, keyof typeof balance> = {
        "Annual Leave": "annual_leave",
        "Sick Leave": "sick_leave",
        "Maternity Leave": "maternity_leave",
        "Casual Leave": "casual_leave",
      };

      const field = fieldMap[request.type];
      if (field && typeof balance[field] === "number") {
        balance[field] = (balance[field] as number) - days;
        balance.updated_at = new Date().toISOString();
      }
    }
  }

  await dbHelpers.write();
  return db.data.leaveRequests[index];
};

/** Whitelist columns for approved leave — never interpolate user input as identifiers */
async function decrementLeaveBalancePostgres(
  employeeId: string,
  leaveType: string,
  days: number
) {
  const sql = getSql()!;
  const d = Math.max(0, Number(days) || 0);
  if (d === 0) return;

  switch (leaveType) {
    case "Annual Leave":
      await sql`
        update leave_balances
        set annual_leave = greatest(0, annual_leave - ${d}), updated_at = now()
        where employee_id = ${employeeId}
      `;
      break;
    case "Sick Leave":
      await sql`
        update leave_balances
        set sick_leave = greatest(0, sick_leave - ${d}), updated_at = now()
        where employee_id = ${employeeId}
      `;
      break;
    case "Maternity Leave":
      await sql`
        update leave_balances
        set maternity_leave = greatest(0, maternity_leave - ${d}), updated_at = now()
        where employee_id = ${employeeId}
      `;
      break;
    case "Casual Leave":
      await sql`
        update leave_balances
        set casual_leave = greatest(0, casual_leave - ${d}), updated_at = now()
        where employee_id = ${employeeId}
      `;
      break;
    default:
      break;
  }
}

export const getLeaveBalance = async (employeeId: string) => {
  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const rows = await sql`
      select employee_id, annual_leave, sick_leave, maternity_leave, casual_leave
      from leave_balances
      where employee_id = ${employeeId}
      limit 1
    `;
    if (rows[0]) {
      const b = rows[0] as {
        employee_id: string;
        annual_leave: number;
        sick_leave: number;
        maternity_leave: number;
        casual_leave: number;
      };
      return {
        employeeId: b.employee_id,
        annualLeave: b.annual_leave,
        sickLeave: b.sick_leave,
        maternityLeave: b.maternity_leave,
        casualLeave: b.casual_leave,
      };
    }

    const emp = await getEmployeeById(employeeId);
    if (!emp) {
      throw new Error("Employee not found");
    }

    const lbId = randomUUID();
    await sql`
      insert into leave_balances (id, employee_id, annual_leave, sick_leave, maternity_leave, casual_leave)
      values (${lbId}, ${employeeId}, 20, 10, 0, 5)
    `;
    return {
      employeeId,
      annualLeave: 20,
      sickLeave: 10,
      maternityLeave: 0,
      casualLeave: 5,
    };
  }

  await dbHelpers.read();
  const db = getDatabase();
  let balance = db.data.leaveBalances.find((b) => b.employee_id === employeeId);

  if (!balance) {
    balance = {
      id: randomUUID(),
      employee_id: employeeId,
      annual_leave: 20,
      sick_leave: 10,
      maternity_leave: 0,
      casual_leave: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.data.leaveBalances.push(balance);
    await dbHelpers.write();
  }

  return {
    employeeId: balance.employee_id,
    annualLeave: balance.annual_leave,
    sickLeave: balance.sick_leave,
    maternityLeave: balance.maternity_leave,
    casualLeave: balance.casual_leave,
  };
};
