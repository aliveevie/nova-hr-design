import { getDatabase, dbHelpers } from "../config/database.js";
import { randomUUID } from "crypto";

export const getDisciplines = async (filters?: { employeeId?: string }) => {
  await dbHelpers.read();
  const db = getDatabase();
  let disciplines = [...db.data.disciplines];

  if (filters?.employeeId) {
    disciplines = disciplines.filter((d) => d.employee_id === filters.employeeId);
  }

  return disciplines.sort((a, b) => 
    new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
  );
};

export const getDisciplineById = async (id: string) => {
  await dbHelpers.read();
  const db = getDatabase();
  return db.data.disciplines.find((d) => d.id === id);
};

export const createDiscipline = async (disciplineData: any) => {
  await dbHelpers.read();
  const db = getDatabase();
  const id = randomUUID();

  // Get employee info
  const employee = db.data.employees.find((e) => e.id === disciplineData.employeeId);
  if (!employee) {
    throw new Error("Employee not found");
  }

  const newDiscipline = {
    id,
    employee_id: disciplineData.employeeId,
    employee_name: employee.name,
    type: disciplineData.type,
    date: disciplineData.date,
    reason: disciplineData.reason,
    status: disciplineData.status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.data.disciplines.push(newDiscipline);
  await dbHelpers.write();
  return newDiscipline;
};

export const updateDiscipline = async (id: string, disciplineData: any) => {
  await dbHelpers.read();
  const db = getDatabase();
  const index = db.data.disciplines.findIndex((d) => d.id === id);
  if (index === -1) {
    return null;
  }

  db.data.disciplines[index] = {
    ...db.data.disciplines[index],
    type: disciplineData.type || db.data.disciplines[index].type,
    date: disciplineData.date || db.data.disciplines[index].date,
    reason: disciplineData.reason || db.data.disciplines[index].reason,
    status: disciplineData.status || db.data.disciplines[index].status,
    updated_at: new Date().toISOString(),
  };

  await dbHelpers.write();
  return db.data.disciplines[index];
};

export const deleteDiscipline = async (id: string) => {
  await dbHelpers.read();
  const db = getDatabase();
  db.data.disciplines = db.data.disciplines.filter((d) => d.id !== id);
  await dbHelpers.write();
  return true;
};
