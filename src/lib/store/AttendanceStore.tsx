import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { AttendanceRecord } from "@/types";
import { attendanceApi } from "@/lib/api";

interface AttendanceContextType {
  attendanceRecords: AttendanceRecord[];
  addAttendance: (attendance: Omit<AttendanceRecord, "id">) => Promise<void>;
  updateAttendance: (id: string, attendance: Partial<AttendanceRecord>) => Promise<void>;
  deleteAttendance: (id: string) => Promise<void>;
  getAttendanceByEmployee: (employeeId: string) => AttendanceRecord[];
  getAttendanceByDate: (date: string) => AttendanceRecord[];
  refreshAttendance: () => Promise<void>;
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const AttendanceProvider = ({ children }: { children: ReactNode }) => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  const refreshAttendance = async () => {
    try {
      const response = await attendanceApi.getAll();
      setAttendanceRecords(response.attendance);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    }
  };

  useEffect(() => {
    refreshAttendance();
  }, []);

  const addAttendance = async (attendance: Omit<AttendanceRecord, "id">) => {
    try {
      const response = await attendanceApi.update("", attendance);
      await refreshAttendance();
    } catch (error) {
      console.error("Error adding attendance:", error);
      throw error;
    }
  };

  const updateAttendance = async (id: string, updates: Partial<AttendanceRecord>) => {
    try {
      await attendanceApi.update(id, updates);
      await refreshAttendance();
    } catch (error) {
      console.error("Error updating attendance:", error);
      throw error;
    }
  };

  const deleteAttendance = async (id: string) => {
    try {
      setAttendanceRecords(attendanceRecords.filter((att) => att.id !== id));
    } catch (error) {
      console.error("Error deleting attendance:", error);
      throw error;
    }
  };

  const getAttendanceByEmployee = (employeeId: string) => {
    return attendanceRecords.filter((att) => att.employeeId === employeeId);
  };

  const getAttendanceByDate = (date: string) => {
    return attendanceRecords.filter((att) => att.date === date);
  };

  return (
    <AttendanceContext.Provider
      value={{
        attendanceRecords,
        addAttendance,
        updateAttendance,
        deleteAttendance,
        getAttendanceByEmployee,
        getAttendanceByDate,
        refreshAttendance,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
};

export const useAttendance = () => {
  const context = useContext(AttendanceContext);
  if (context === undefined) {
    throw new Error("useAttendance must be used within an AttendanceProvider");
  }
  return context;
};
