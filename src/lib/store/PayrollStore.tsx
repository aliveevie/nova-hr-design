import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { PayrollRecord } from "@/types";
import { payrollApi } from "@/lib/api";

interface PayrollContextType {
  payrolls: PayrollRecord[];
  addPayroll: (payroll: Omit<PayrollRecord, "id" | "employee" | "department" | "netPay" | "status">) => Promise<void>;
  updatePayroll: (id: string, status: "Paid" | "Pending") => Promise<void>;
  getPayrollByEmployee: (employeeId: string) => PayrollRecord[];
  getPayrollByPeriod: (month: string, year: string) => PayrollRecord[];
  refreshPayrolls: () => Promise<void>;
}

const PayrollContext = createContext<PayrollContextType | undefined>(undefined);

export const PayrollProvider = ({ children }: { children: ReactNode }) => {
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);

  const refreshPayrolls = async () => {
    try {
      const response = await payrollApi.getAll();
      setPayrolls(response.payrolls);
    } catch (error) {
      console.error("Error fetching payrolls:", error);
    }
  };

  useEffect(() => {
    refreshPayrolls();
  }, []);

  const addPayroll = async (payroll: Omit<PayrollRecord, "id" | "employee" | "department" | "netPay" | "status">) => {
    try {
      const response = await payrollApi.create(payroll);
      setPayrolls([...payrolls, response.payroll]);
    } catch (error) {
      console.error("Error adding payroll:", error);
      throw error;
    }
  };

  const updatePayroll = async (id: string, status: "Paid" | "Pending") => {
    try {
      const response = await payrollApi.update(id, status);
      setPayrolls(payrolls.map((p) => (p.id === id ? response.payroll : p)));
    } catch (error) {
      console.error("Error updating payroll:", error);
      throw error;
    }
  };

  const getPayrollByEmployee = (employeeId: string) => {
    return payrolls.filter((p) => p.employeeId === employeeId);
  };

  const getPayrollByPeriod = (month: string, year: string) => {
    return payrolls.filter((p) => p.month === month && p.year === year);
  };

  return (
    <PayrollContext.Provider
      value={{ payrolls, addPayroll, updatePayroll, getPayrollByEmployee, getPayrollByPeriod, refreshPayrolls }}
    >
      {children}
    </PayrollContext.Provider>
  );
};

export const usePayroll = () => {
  const context = useContext(PayrollContext);
  if (context === undefined) {
    throw new Error("usePayroll must be used within a PayrollProvider");
  }
  return context;
};
