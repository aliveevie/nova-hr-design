import { createContext, useContext, useState, ReactNode } from "react";
import { Attendance } from "@/types";
import { attendanceRecords as initialAttendance } from "@/lib/mockData";

interface AttendanceContextType {
  attendanceRecords: Attendance[];
  addAttendance: (attendance: Omit<Attendance, "id">) => void;
  updateAttendance: (id: string, attendance: Partial<Attendance>) => void;
  deleteAttendance: (id: string) => void;
  getAttendanceByEmployee: (employeeId: string) => Attendance[];
  getAttendanceByDate: (date: string) => Attendance[];
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

export const AttendanceProvider = ({ children }: { children: ReactNode }) => {
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>(initialAttendance);

  const addAttendance = (attendance: Omit<Attendance, "id">) => {
    const newAttendance: Attendance = {
      ...attendance,
      id: String(attendanceRecords.length + 1),
    };
    setAttendanceRecords([...attendanceRecords, newAttendance]);
  };

  const updateAttendance = (id: string, updates: Partial<Attendance>) => {
    setAttendanceRecords(attendanceRecords.map((att) => (att.id === id ? { ...att, ...updates } : att)));
  };

  const deleteAttendance = (id: string) => {
    setAttendanceRecords(attendanceRecords.filter((att) => att.id !== id));
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

