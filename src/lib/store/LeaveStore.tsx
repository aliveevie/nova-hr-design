import { createContext, useContext, useState, ReactNode } from "react";
import { LeaveRequest, LeaveBalance } from "@/types";
import { leaveRequests as initialLeaveRequests, leaveBalances as initialLeaveBalances } from "@/lib/mockData";

interface LeaveContextType {
  leaveRequests: LeaveRequest[];
  leaveBalances: LeaveBalance[];
  addLeaveRequest: (leave: Omit<LeaveRequest, "id">) => void;
  updateLeaveRequest: (id: string, leave: Partial<LeaveRequest>) => void;
  deleteLeaveRequest: (id: string) => void;
  getLeaveBalance: (employeeId: string) => LeaveBalance | undefined;
  updateLeaveBalance: (employeeId: string, balance: Partial<LeaveBalance>) => void;
}

const LeaveContext = createContext<LeaveContextType | undefined>(undefined);

export const LeaveProvider = ({ children }: { children: ReactNode }) => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(initialLeaveRequests);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>(initialLeaveBalances);

  const addLeaveRequest = (leave: Omit<LeaveRequest, "id">) => {
    const newLeave: LeaveRequest = {
      ...leave,
      id: String(leaveRequests.length + 1),
    };
    setLeaveRequests([...leaveRequests, newLeave]);
  };

  const updateLeaveRequest = (id: string, updates: Partial<LeaveRequest>) => {
    setLeaveRequests(leaveRequests.map((l) => (l.id === id ? { ...l, ...updates } : l)));
  };

  const deleteLeaveRequest = (id: string) => {
    setLeaveRequests(leaveRequests.filter((l) => l.id !== id));
  };

  const getLeaveBalance = (employeeId: string) => {
    let balance = leaveBalances.find((b) => b.employeeId === employeeId);
    // Auto-create balance if it doesn't exist
    if (!balance) {
      balance = {
        employeeId,
        annualLeave: 20, // Default annual leave
        sickLeave: 10, // Default sick leave
        maternityLeave: 0,
        casualLeave: 5, // Default casual leave
      };
      setLeaveBalances([...leaveBalances, balance]);
    }
    return balance;
  };

  const updateLeaveBalance = (employeeId: string, balance: Partial<LeaveBalance>) => {
    setLeaveBalances(
      leaveBalances.map((b) => (b.employeeId === employeeId ? { ...b, ...balance } : b))
    );
  };

  return (
    <LeaveContext.Provider
      value={{
        leaveRequests,
        leaveBalances,
        addLeaveRequest,
        updateLeaveRequest,
        deleteLeaveRequest,
        getLeaveBalance,
        updateLeaveBalance,
      }}
    >
      {children}
    </LeaveContext.Provider>
  );
};

export const useLeave = () => {
  const context = useContext(LeaveContext);
  if (context === undefined) {
    throw new Error("useLeave must be used within a LeaveProvider");
  }
  return context;
};

