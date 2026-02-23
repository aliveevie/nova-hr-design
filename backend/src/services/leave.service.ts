import { getDatabase, dbHelpers } from "../config/database.js";
import { randomUUID } from "crypto";

export const getLeaveRequests = async (filters?: { employeeId?: string; status?: string }) => {
  await dbHelpers.read();
  const db = getDatabase();
  let requests = [...db.data.leaveRequests];

  if (filters?.employeeId) {
    requests = requests.filter((r) => r.employee_id === filters.employeeId);
  }

  if (filters?.status) {
    requests = requests.filter((r) => r.status === filters.status);
  }

  return requests.sort((a, b) => 
    new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
};

export const getLeaveRequestById = async (id: string) => {
  await dbHelpers.read();
  const db = getDatabase();
  return db.data.leaveRequests.find((r) => r.id === id);
};

export const createLeaveRequest = async (leaveData: any) => {
  await dbHelpers.read();
  const db = getDatabase();
  const id = randomUUID();

  // Get employee info
  const employee = db.data.employees.find((e) => e.id === leaveData.employeeId);
  if (!employee) {
    throw new Error("Employee not found");
  }

  const newRequest = {
    id,
    employee_id: leaveData.employeeId,
    employee_name: employee.name,
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
  await dbHelpers.read();
  const db = getDatabase();
  const index = db.data.leaveRequests.findIndex((r) => r.id === id);
  if (index === -1) {
    return null;
  }

  db.data.leaveRequests[index].status = leaveData.status;
  db.data.leaveRequests[index].updated_at = new Date().toISOString();

  // Update leave balance if approved
  if (leaveData.status === "Approved") {
    const request = db.data.leaveRequests[index];
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
        balance[field] = (balance[field] as number) - request.days;
        balance.updated_at = new Date().toISOString();
      }
    }
  }

  await dbHelpers.write();
  return db.data.leaveRequests[index];
};

export const getLeaveBalance = async (employeeId: string) => {
  await dbHelpers.read();
  const db = getDatabase();
  let balance = db.data.leaveBalances.find((b) => b.employee_id === employeeId);

  // Auto-create if doesn't exist
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
