import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { DisciplineRecord } from "@/types";
import { disciplineApi } from "@/lib/api";

interface DisciplineContextType {
  disciplines: DisciplineRecord[];
  addDiscipline: (discipline: Omit<DisciplineRecord, "id" | "employee">) => Promise<void>;
  updateDiscipline: (id: string, discipline: Partial<DisciplineRecord>) => Promise<void>;
  deleteDiscipline: (id: string) => Promise<void>;
  getDisciplineByEmployee: (employeeId: string) => DisciplineRecord[];
  refreshDisciplines: () => Promise<void>;
}

const DisciplineContext = createContext<DisciplineContextType | undefined>(undefined);

export const DisciplineProvider = ({ children }: { children: ReactNode }) => {
  const [disciplines, setDisciplines] = useState<DisciplineRecord[]>([]);

  const refreshDisciplines = async () => {
    try {
      const response = await disciplineApi.getAll();
      setDisciplines(response.disciplines);
    } catch (error) {
      console.error("Error fetching disciplines:", error);
    }
  };

  useEffect(() => {
    refreshDisciplines();
  }, []);

  const addDiscipline = async (discipline: Omit<DisciplineRecord, "id" | "employee">) => {
    try {
      const response = await disciplineApi.create(discipline);
      setDisciplines([...disciplines, response.discipline]);
    } catch (error) {
      console.error("Error adding discipline:", error);
      throw error;
    }
  };

  const updateDiscipline = async (id: string, updates: Partial<DisciplineRecord>) => {
    try {
      const response = await disciplineApi.update(id, updates);
      setDisciplines(disciplines.map((d) => (d.id === id ? response.discipline : d)));
    } catch (error) {
      console.error("Error updating discipline:", error);
      throw error;
    }
  };

  const deleteDiscipline = async (id: string) => {
    try {
      await disciplineApi.delete(id);
      setDisciplines(disciplines.filter((d) => d.id !== id));
    } catch (error) {
      console.error("Error deleting discipline:", error);
      throw error;
    }
  };

  const getDisciplineByEmployee = (employeeId: string) => {
    return disciplines.filter((d) => d.employeeId === employeeId);
  };

  return (
    <DisciplineContext.Provider
      value={{ disciplines, addDiscipline, updateDiscipline, deleteDiscipline, getDisciplineByEmployee, refreshDisciplines }}
    >
      {children}
    </DisciplineContext.Provider>
  );
};

export const useDiscipline = () => {
  const context = useContext(DisciplineContext);
  if (context === undefined) {
    throw new Error("useDiscipline must be used within a DisciplineProvider");
  }
  return context;
};
