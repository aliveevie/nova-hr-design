import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { TrainingRecord } from "@/types";
import { trainingApi } from "@/lib/api";

interface TrainingContextType {
  trainings: TrainingRecord[];
  addTraining: (training: Omit<TrainingRecord, "id" | "employee">) => Promise<void>;
  updateTraining: (id: string, training: Partial<TrainingRecord>) => Promise<void>;
  deleteTraining: (id: string) => Promise<void>;
  getTrainingByEmployee: (employeeId: string) => TrainingRecord[];
  refreshTrainings: () => Promise<void>;
}

const TrainingContext = createContext<TrainingContextType | undefined>(undefined);

export const TrainingProvider = ({ children }: { children: ReactNode }) => {
  const [trainings, setTrainings] = useState<TrainingRecord[]>([]);

  const refreshTrainings = async () => {
    try {
      const response = await trainingApi.getAll();
      setTrainings(response.trainings);
    } catch (error) {
      console.error("Error fetching trainings:", error);
    }
  };

  useEffect(() => {
    refreshTrainings();
  }, []);

  const addTraining = async (training: Omit<TrainingRecord, "id" | "employee">) => {
    try {
      const response = await trainingApi.create(training);
      setTrainings([...trainings, response.training]);
    } catch (error) {
      console.error("Error adding training:", error);
      throw error;
    }
  };

  const updateTraining = async (id: string, updates: Partial<TrainingRecord>) => {
    try {
      const response = await trainingApi.update(id, updates);
      setTrainings(trainings.map((t) => (t.id === id ? response.training : t)));
    } catch (error) {
      console.error("Error updating training:", error);
      throw error;
    }
  };

  const deleteTraining = async (id: string) => {
    try {
      await trainingApi.delete(id);
      setTrainings(trainings.filter((t) => t.id !== id));
    } catch (error) {
      console.error("Error deleting training:", error);
      throw error;
    }
  };

  const getTrainingByEmployee = (employeeId: string) => {
    return trainings.filter((t) => t.employeeId === employeeId);
  };

  return (
    <TrainingContext.Provider
      value={{ trainings, addTraining, updateTraining, deleteTraining, getTrainingByEmployee, refreshTrainings }}
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
