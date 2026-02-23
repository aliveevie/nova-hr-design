import { createContext, useContext, useState, ReactNode } from "react";
import { Discipline } from "@/types";
import { disciplineRecords as initialDiscipline } from "@/lib/mockData";

interface DisciplineContextType {
  disciplines: Discipline[];
  addDiscipline: (discipline: Omit<Discipline, "id">) => void;
  updateDiscipline: (id: string, discipline: Partial<Discipline>) => void;
  deleteDiscipline: (id: string) => void;
  getDisciplineByEmployee: (employeeId: string) => Discipline[];
}

const DisciplineContext = createContext<DisciplineContextType | undefined>(undefined);

export const DisciplineProvider = ({ children }: { children: ReactNode }) => {
  const [disciplines, setDisciplines] = useState<Discipline[]>(initialDiscipline);

  const addDiscipline = (discipline: Omit<Discipline, "id">) => {
    const newDiscipline: Discipline = {
      ...discipline,
      id: String(disciplines.length + 1),
    };
    setDisciplines([...disciplines, newDiscipline]);
  };

  const updateDiscipline = (id: string, updates: Partial<Discipline>) => {
    setDisciplines(disciplines.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  };

  const deleteDiscipline = (id: string) => {
    setDisciplines(disciplines.filter((d) => d.id !== id));
  };

  const getDisciplineByEmployee = (employeeId: string) => {
    return disciplines.filter((d) => d.employeeId === employeeId);
  };

  return (
    <DisciplineContext.Provider
      value={{
        disciplines,
        addDiscipline,
        updateDiscipline,
        deleteDiscipline,
        getDisciplineByEmployee,
      }}
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

