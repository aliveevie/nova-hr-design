import { createContext, useContext, useState, ReactNode } from "react";
import { Training } from "@/types";
import { trainingRecords as initialTraining } from "@/lib/mockData";

interface TrainingContextType {
  trainings: Training[];
  addTraining: (training: Omit<Training, "id">) => void;
  updateTraining: (id: string, training: Partial<Training>) => void;
  deleteTraining: (id: string) => void;
  getTrainingByEmployee: (employeeId: string) => Training[];
}

const TrainingContext = createContext<TrainingContextType | undefined>(undefined);

export const TrainingProvider = ({ children }: { children: ReactNode }) => {
  const [trainings, setTrainings] = useState<Training[]>(initialTraining);

  const addTraining = (training: Omit<Training, "id">) => {
    const newTraining: Training = {
      ...training,
      id: String(trainings.length + 1),
    };
    setTrainings([...trainings, newTraining]);
  };

  const updateTraining = (id: string, updates: Partial<Training>) => {
    setTrainings(trainings.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const deleteTraining = (id: string) => {
    setTrainings(trainings.filter((t) => t.id !== id));
  };

  const getTrainingByEmployee = (employeeId: string) => {
    return trainings.filter((t) => t.employeeId === employeeId);
  };

  return (
    <TrainingContext.Provider
      value={{
        trainings,
        addTraining,
        updateTraining,
        deleteTraining,
        getTrainingByEmployee,
      }}
    >
      {children}
    </TrainingContext.Provider>
  );
};

export const useTraining = () => {
  const context = useContext(TrainingContext);
  if (context === undefined) {
    throw new Error("useTraining must be used within a TrainingProvider");
  }
  return context;
};

