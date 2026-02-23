import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Holiday } from "@/types";
import { holidayApi } from "@/lib/api";

interface HolidayContextType {
  holidays: Holiday[];
  addHoliday: (holiday: Omit<Holiday, "id">) => Promise<void>;
  updateHoliday: (id: string, holiday: Partial<Holiday>) => Promise<void>;
  deleteHoliday: (id: string) => Promise<void>;
  refreshHolidays: () => Promise<void>;
}

const HolidayContext = createContext<HolidayContextType | undefined>(undefined);

export const HolidayProvider = ({ children }: { children: ReactNode }) => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  const refreshHolidays = async () => {
    try {
      const response = await holidayApi.getAll();
      setHolidays(response.holidays);
    } catch (error) {
      console.error("Error fetching holidays:", error);
    }
  };

  useEffect(() => {
    refreshHolidays();
  }, []);

  const addHoliday = async (holiday: Omit<Holiday, "id">) => {
    try {
      const response = await holidayApi.create(holiday);
      setHolidays([...holidays, response.holiday]);
    } catch (error) {
      console.error("Error adding holiday:", error);
      throw error;
    }
  };

  const updateHoliday = async (id: string, updates: Partial<Holiday>) => {
    try {
      const response = await holidayApi.update(id, updates);
      setHolidays(holidays.map((h) => (h.id === id ? response.holiday : h)));
    } catch (error) {
      console.error("Error updating holiday:", error);
      throw error;
    }
  };

  const deleteHoliday = async (id: string) => {
    try {
      await holidayApi.delete(id);
      setHolidays(holidays.filter((h) => h.id !== id));
    } catch (error) {
      console.error("Error deleting holiday:", error);
      throw error;
    }
  };

  return (
    <HolidayContext.Provider
      value={{ holidays, addHoliday, updateHoliday, deleteHoliday, refreshHolidays }}
    >
      {children}
    </HolidayContext.Provider>
  );
};

export const useHoliday = () => {
  const context = useContext(HolidayContext);
  if (context === undefined) {
    throw new Error("useHoliday must be used within a HolidayProvider");
  }
  return context;
};
