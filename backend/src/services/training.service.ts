import { getDatabase, dbHelpers } from "../config/database.js";
import { randomUUID } from "crypto";

export const getTrainings = async (filters?: { employeeId?: string }) => {
  await dbHelpers.read();
  const db = getDatabase();
  let trainings = [...db.data.trainings];

  if (filters?.employeeId) {
    trainings = trainings.filter((t) => t.employee_id === filters.employeeId);
  }

  return trainings.sort((a, b) => 
    new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
  );
};

export const getTrainingById = async (id: string) => {
  await dbHelpers.read();
  const db = getDatabase();
  return db.data.trainings.find((t) => t.id === id);
};

export const createTraining = async (trainingData: any) => {
  await dbHelpers.read();
  const db = getDatabase();
  const id = randomUUID();

  // Get employee info
  const employee = db.data.employees.find((e) => e.id === trainingData.employeeId);
  if (!employee) {
    throw new Error("Employee not found");
  }

  const newTraining = {
    id,
    employee_id: trainingData.employeeId,
    employee_name: employee.name,
    title: trainingData.title,
    date: trainingData.date,
    status: trainingData.status,
    certification: trainingData.certification ? 1 : 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.data.trainings.push(newTraining);
  await dbHelpers.write();
  return newTraining;
};

export const updateTraining = async (id: string, trainingData: any) => {
  await dbHelpers.read();
  const db = getDatabase();
  const index = db.data.trainings.findIndex((t) => t.id === id);
  if (index === -1) {
    return null;
  }

  db.data.trainings[index] = {
    ...db.data.trainings[index],
    title: trainingData.title || db.data.trainings[index].title,
    date: trainingData.date || db.data.trainings[index].date,
    status: trainingData.status || db.data.trainings[index].status,
    certification: trainingData.certification !== undefined ? (trainingData.certification ? 1 : 0) : db.data.trainings[index].certification,
    updated_at: new Date().toISOString(),
  };

  await dbHelpers.write();
  return db.data.trainings[index];
};

export const deleteTraining = async (id: string) => {
  await dbHelpers.read();
  const db = getDatabase();
  db.data.trainings = db.data.trainings.filter((t) => t.id !== id);
  await dbHelpers.write();
  return true;
};
