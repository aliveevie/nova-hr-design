import { createContext, useContext, useState, ReactNode } from "react";
import { Performance } from "@/types";
import { performanceData as initialPerformance } from "@/lib/mockData";

interface PerformanceContextType {
  performances: Performance[];
  addPerformance: (performance: Omit<Performance, "id">) => void;
  updatePerformance: (id: string, performance: Partial<Performance>) => void;
  deletePerformance: (id: string) => void;
  getPerformanceByEmployee: (employeeId: string) => Performance | undefined;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);

export const PerformanceProvider = ({ children }: { children: ReactNode }) => {
  const [performances, setPerformances] = useState<Performance[]>(initialPerformance);

  const addPerformance = (performance: Omit<Performance, "id">) => {
    const newPerformance: Performance = {
      ...performance,
      id: String(performances.length + 1),
    };
    setPerformances([...performances, newPerformance]);
  };

  const updatePerformance = (id: string, updates: Partial<Performance>) => {
    setPerformances(performances.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deletePerformance = (id: string) => {
    setPerformances(performances.filter((p) => p.id !== id));
  };

  const getPerformanceByEmployee = (employeeId: string) => {
    return performances.find((p) => p.employeeId === employeeId);
  };

  return (
    <PerformanceContext.Provider
      value={{
        performances,
        addPerformance,
        updatePerformance,
        deletePerformance,
        getPerformanceByEmployee,
      }}
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

