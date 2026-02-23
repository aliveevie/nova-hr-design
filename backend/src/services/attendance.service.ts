import { getDatabase, dbHelpers } from "../config/database.js";
import { randomUUID } from "crypto";

export const getAttendanceRecords = async (filters?: { employeeId?: string; date?: string }) => {
  await dbHelpers.read();
  const db = getDatabase();
  let records = [...db.data.attendance];

  if (filters?.employeeId) {
    records = records.filter((r) => r.employee_id === filters.employeeId);
  }

  if (filters?.date) {
    records = records.filter((r) => r.date === filters.date);
  }

  return records.sort((a, b) => 
    new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
  );
};

export const getAttendanceByEmployee = async (employeeId: string) => {
  return getAttendanceRecords({ employeeId });
};

export const getAttendanceByDate = async (date: string) => {
  return getAttendanceRecords({ date });
};

export const createAttendance = async (attendanceData: any) => {
  await dbHelpers.read();
  const db = getDatabase();
  
  // Get employee info
  const employee = db.data.employees.find((e) => e.id === attendanceData.employeeId);
  if (!employee) {
    throw new Error("Employee not found");
  }

  const id = randomUUID();
  const newRecord = {
    id,
    employee_id: attendanceData.employeeId,
    employee_name: employee.name,
    date: attendanceData.date,
    check_in: attendanceData.checkIn || null,
    check_out: attendanceData.checkOut || null,
    status: attendanceData.status,
    department: employee.department,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.data.attendance.push(newRecord);
  await dbHelpers.write();
  return newRecord;
};

export const updateAttendance = async (id: string, attendanceData: any) => {
  await dbHelpers.read();
  const db = getDatabase();
  const index = db.data.attendance.findIndex((a) => a.id === id);
  if (index === -1) {
    return null;
  }

  db.data.attendance[index] = {
    ...db.data.attendance[index],
    check_in: attendanceData.checkIn !== undefined ? attendanceData.checkIn : db.data.attendance[index].check_in,
    check_out: attendanceData.checkOut !== undefined ? attendanceData.checkOut : db.data.attendance[index].check_out,
    status: attendanceData.status || db.data.attendance[index].status,
    updated_at: new Date().toISOString(),
  };

  await dbHelpers.write();
  return db.data.attendance[index];
};

export const getMonthlySummary = async (month: string, year: string) => {
  await dbHelpers.read();
  const db = getDatabase();
  const startDate = `${year}-${month.padStart(2, "0")}-01`;
  const endDate = `${year}-${month.padStart(2, "0")}-31`;

  const records = db.data.attendance.filter(
    (r) => r.date >= startDate && r.date <= endDate
  );

  return {
    total: records.length,
    present: records.filter((r) => r.status === "Present").length,
    absent: records.filter((r) => r.status === "Absent").length,
    late: records.filter((r) => r.status === "Late").length,
  };
};
