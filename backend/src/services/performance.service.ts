import { getDatabase, dbHelpers } from "../config/database.js";
import { randomUUID } from "crypto";

export const getPerformances = async (filters?: { employeeId?: string }) => {
  await dbHelpers.read();
  const db = getDatabase();
  let performances = [...db.data.performances];

  if (filters?.employeeId) {
    performances = performances.filter((p) => p.employee_id === filters.employeeId);
  }

  return performances.sort((a, b) => {
    const dateA = a.review_date ? new Date(a.review_date).getTime() : 0;
    const dateB = b.review_date ? new Date(b.review_date).getTime() : 0;
    if (dateB !== dateA) return dateB - dateA;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });
};

export const getPerformanceById = async (id: string) => {
  await dbHelpers.read();
  const db = getDatabase();
  return db.data.performances.find((p) => p.id === id);
};

export const createPerformance = async (performanceData: any) => {
  await dbHelpers.read();
  const db = getDatabase();
  const id = randomUUID();

  // Get employee info
  const employee = db.data.employees.find((e) => e.id === performanceData.employeeId);
  if (!employee) {
    throw new Error("Employee not found");
  }

  const newPerformance = {
    id,
    employee_id: performanceData.employeeId,
    employee_name: employee.name,
    department: employee.department,
    overall_score: performanceData.overallScore,
    goals: performanceData.goals,
    teamwork: performanceData.teamwork,
    communication: performanceData.communication,
    rating: performanceData.rating,
    review_date: performanceData.reviewDate || null,
    promotion_date: performanceData.promotion?.date || null,
    promotion_from_position: performanceData.promotion?.fromPosition || null,
    promotion_to_position: performanceData.promotion?.toPosition || null,
    salary_increment_date: performanceData.salaryIncrement?.date || null,
    salary_increment_amount: performanceData.salaryIncrement?.amount || null,
    salary_increment_percentage: performanceData.salaryIncrement?.percentage || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.data.performances.push(newPerformance);
  await dbHelpers.write();
  return newPerformance;
};

export const updatePerformance = async (id: string, performanceData: any) => {
  await dbHelpers.read();
  const db = getDatabase();
  const index = db.data.performances.findIndex((p) => p.id === id);
  if (index === -1) {
    return null;
  }

  db.data.performances[index] = {
    ...db.data.performances[index],
    overall_score: performanceData.overallScore !== undefined ? performanceData.overallScore : db.data.performances[index].overall_score,
    goals: performanceData.goals !== undefined ? performanceData.goals : db.data.performances[index].goals,
    teamwork: performanceData.teamwork !== undefined ? performanceData.teamwork : db.data.performances[index].teamwork,
    communication: performanceData.communication !== undefined ? performanceData.communication : db.data.performances[index].communication,
    rating: performanceData.rating || db.data.performances[index].rating,
    review_date: performanceData.reviewDate !== undefined ? performanceData.reviewDate : db.data.performances[index].review_date,
    updated_at: new Date().toISOString(),
  };

  await dbHelpers.write();
  return db.data.performances[index];
};
