import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { PerformanceRecord } from "@/types";
import { performanceApi } from "@/lib/api";

interface PerformanceContextType {
  performances: PerformanceRecord[];
  addPerformance: (performance: Omit<PerformanceRecord, "id" | "employee" | "department">) => Promise<void>;
  updatePerformance: (id: string, performance: Partial<PerformanceRecord>) => Promise<void>;
  getPerformanceByEmployee: (employeeId: string) => PerformanceRecord | undefined;
  refreshPerformances: () => Promise<void>;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

export const PerformanceProvider = ({ children }: { children: ReactNode }) => {
  const [performances, setPerformances] = useState<PerformanceRecord[]>([]);

  const refreshPerformances = async () => {
    try {
      const response = await performanceApi.getAll();
      setPerformances(response.performances);
    } catch (error) {
      console.error("Error fetching performances:", error);
    }
  };

  useEffect(() => {
    refreshPerformances();
  }, []);

  const addPerformance = async (performance: Omit<PerformanceRecord, "id" | "employee" | "department">) => {
    try {
      const response = await performanceApi.create(performance);
      setPerformances([...performances, response.performance]);
    } catch (error) {
      console.error("Error adding performance:", error);
      throw error;
    }
  };

  const updatePerformance = async (id: string, updates: Partial<PerformanceRecord>) => {
    try {
      const response = await performanceApi.update(id, updates);
      setPerformances(performances.map((p) => (p.id === id ? response.performance : p)));
    } catch (error) {
      console.error("Error updating performance:", error);
      throw error;
    }
  };

  const getPerformanceByEmployee = (employeeId: string) => {
    return performances.find((p) => p.employeeId === employeeId);
  };

  return (
    <PerformanceContext.Provider
      value={{ performances, addPerformance, updatePerformance, getPerformanceByEmployee, refreshPerformances }}
    >
      {children}
    </PerformanceContext.Provider>
  );
};

export const usePerformance = () => {
  const context = useContext(PerformanceContext);
  if (context === undefined) {
    throw new Error("usePerformance must be used within a PerformanceProvider");
  }
  return context;
};
