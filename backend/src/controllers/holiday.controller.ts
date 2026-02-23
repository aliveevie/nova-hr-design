import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import {
  getHolidays,
  getHolidayById,
  createHoliday,
  updateHoliday,
  deleteHoliday,
} from "../services/holiday.service.js";
import { holidaySchema } from "../utils/validators.js";

export const getHolidaysController = async (req: AuthRequest, res: Response) => {
  try {
    const holidays = await getHolidays();
    const transformed = holidays.map((h: any) => ({
      id: h.id,
      name: h.name,
      date: h.date,
      day: h.day,
      type: h.type,
    }));

    res.json({ holidays: transformed });
  } catch (error) {
    console.error("Get holidays error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getHolidayController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const holiday = await getHolidayById(id);
    if (!holiday) {
      return res.status(404).json({ error: "Holiday not found" });
    }

    const transformed = {
      id: holiday.id,
      name: holiday.name,
      date: holiday.date,
      day: holiday.day,
      type: holiday.type,
    };

    res.json({ holiday: transformed });
  } catch (error) {
    console.error("Get holiday error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createHolidayController = async (req: AuthRequest, res: Response) => {
  try {
    const validation = holidaySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid data", details: validation.error.errors });
    }

    const holiday = await createHoliday(validation.data);

    const transformed = {
      id: holiday.id,
      name: holiday.name,
      date: holiday.date,
      day: holiday.day,
      type: holiday.type,
    };

    res.status(201).json({ holiday: transformed });
  } catch (error) {
    console.error("Create holiday error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateHolidayController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validation = holidaySchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid data", details: validation.error.errors });
    }

    const existing = await getHolidayById(id);
    if (!existing) {
      return res.status(404).json({ error: "Holiday not found" });
    }

    const holiday = await updateHoliday(id, { ...existing, ...validation.data });

    const transformed = {
      id: holiday.id,
      name: holiday.name,
      date: holiday.date,
      day: holiday.day,
      type: holiday.type,
    };

    res.json({ holiday: transformed });
  } catch (error) {
    console.error("Update holiday error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteHolidayController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const holiday = await getHolidayById(id);
    if (!holiday) {
      return res.status(404).json({ error: "Holiday not found" });
    }

    await deleteHoliday(id);
    res.json({ message: "Holiday deleted successfully" });
  } catch (error) {
    console.error("Delete holiday error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

