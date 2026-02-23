import { createContext, useContext, useState, ReactNode } from "react";
import { Holiday } from "@/types";
import { holidaysList as initialHolidays } from "@/lib/mockData";

interface HolidayContextType {
  holidays: Holiday[];
  addHoliday: (holiday: Omit<Holiday, "id" | "day">) => void;
  updateHoliday: (id: string, holiday: Partial<Holiday>) => void;
  deleteHoliday: (id: string) => void;
  getHolidayByDate: (date: string) => Holiday | undefined;
}

const HolidayContext = createContext<HolidayContextType | undefined>(undefined);

const getDayName = (dateString: string): string => {
  const date = new Date(dateString);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[date.getDay()];
};

export const HolidayProvider = ({ children }: { children: ReactNode }) => {
  const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays);

  const addHoliday = (holiday: Omit<Holiday, "id" | "day">) => {
    const newHoliday: Holiday = {
      ...holiday,
      id: String(holidays.length + 1),
      day: getDayName(holiday.date),
    };
    setHolidays([...holidays, newHoliday]);
  };

  const updateHoliday = (id: string, updates: Partial<Holiday>) => {
    setHolidays(
      holidays.map((h) => {
        if (h.id === id) {
          const updated = { ...h, ...updates };
          if (updates.date) {
            updated.day = getDayName(updates.date);
          }
          return updated;
        }
        return h;
      })
    );
  };

  const deleteHoliday = (id: string) => {
    setHolidays(holidays.filter((h) => h.id !== id));
  };

  const getHolidayByDate = (date: string) => {
    return holidays.find((h) => h.date === date);
  };

  return (
    <HolidayContext.Provider
      value={{
        holidays,
        addHoliday,
        updateHoliday,
        deleteHoliday,
        getHolidayByDate,
      }}
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

