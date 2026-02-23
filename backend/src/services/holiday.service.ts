import { getDatabase, dbHelpers } from "../config/database.js";
import { randomUUID } from "crypto";

export const getHolidays = async () => {
  await dbHelpers.read();
  const db = getDatabase();
  return db.data.holidays.sort((a, b) => 
    new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime()
  );
};

export const getHolidayById = async (id: string) => {
  await dbHelpers.read();
  const db = getDatabase();
  return db.data.holidays.find((h) => h.id === id);
};

export const createHoliday = async (holidayData: any) => {
  await dbHelpers.read();
  const db = getDatabase();
  const id = randomUUID();

  const newHoliday = {
    id,
    name: holidayData.name,
    date: holidayData.date,
    day: holidayData.day,
    type: holidayData.type,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.data.holidays.push(newHoliday);
  await dbHelpers.write();
  return newHoliday;
};

export const updateHoliday = async (id: string, holidayData: any) => {
  await dbHelpers.read();
  const db = getDatabase();
  const index = db.data.holidays.findIndex((h) => h.id === id);
  if (index === -1) {
    return null;
  }

  db.data.holidays[index] = {
    ...db.data.holidays[index],
    name: holidayData.name || db.data.holidays[index].name,
    date: holidayData.date || db.data.holidays[index].date,
    day: holidayData.day || db.data.holidays[index].day,
    type: holidayData.type || db.data.holidays[index].type,
    updated_at: new Date().toISOString(),
  };

  await dbHelpers.write();
  return db.data.holidays[index];
};

export const deleteHoliday = async (id: string) => {
  await dbHelpers.read();
  const db = getDatabase();
  db.data.holidays = db.data.holidays.filter((h) => h.id !== id);
  await dbHelpers.write();
  return true;
};
