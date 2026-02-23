import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { LeaveRequest, LeaveBalance } from "@/types";
import { leaveApi } from "@/lib/api";

interface LeaveContextType {
  leaveRequests: LeaveRequest[];
  leaveBalances: LeaveBalance[];
  addLeaveRequest: (leave: Omit<LeaveRequest, "id" | "employee" | "days" | "status">) => Promise<void>;
  updateLeaveRequest: (id: string, status: "Approved" | "Rejected" | "Pending") => Promise<void>;
  deleteLeaveRequest: (id: string) => Promise<void>;
  getLeaveBalance: (employeeId: string) => Promise<LeaveBalance | undefined>;
  refreshLeaveRequests: () => Promise<void>;
}

const LeaveContext = createContext<LeaveContextType | undefined>(undefined);

export const LeaveProvider = ({ children }: { children: ReactNode }) => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);

  const refreshLeaveRequests = async () => {
    try {
      const response = await leaveApi.getRequests();
      setLeaveRequests(response.leaveRequests);
    } catch (error) {
      console.error("Error fetching leave requests:", error);
    }
  };

  useEffect(() => {
    refreshLeaveRequests();
  }, []);

  const addLeaveRequest = async (leave: Omit<LeaveRequest, "id" | "employee" | "days" | "status">) => {
    try {
      const response = await leaveApi.createRequest(leave);
      setLeaveRequests([...leaveRequests, response.leaveRequest]);
    } catch (error) {
      console.error("Error adding leave request:", error);
      throw error;
    }
  };

  const updateLeaveRequest = async (id: string, status: "Approved" | "Rejected" | "Pending") => {
    try {
      const response = await leaveApi.updateRequest(id, status);
      setLeaveRequests(leaveRequests.map((l) => (l.id === id ? response.leaveRequest : l)));
    } catch (error) {
      console.error("Error updating leave request:", error);
      throw error;
    }
  };

  const deleteLeaveRequest = async (id: string) => {
    try {
      setLeaveRequests(leaveRequests.filter((l) => l.id !== id));
    } catch (error) {
      console.error("Error deleting leave request:", error);
      throw error;
    }
  };

  const getLeaveBalance = async (employeeId: string) => {
    try {
      const response = await leaveApi.getBalance(employeeId);
      const balance = response.balance;
      setLeaveBalances(leaveBalances.filter((b) => b.employeeId !== employeeId).concat([balance]));
      return balance;
    } catch (error) {
      console.error("Error fetching leave balance:", error);
      return undefined;
    }
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
        refreshLeaveRequests,
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
