import { createContext, useContext, useState, ReactNode } from "react";
import { Payroll } from "@/types";
import { payrollData as initialPayroll } from "@/lib/mockData";

interface PayrollContextType {
  payrolls: Payroll[];
  addPayroll: (payroll: Omit<Payroll, "id">) => void;
  updatePayroll: (id: string, payroll: Partial<Payroll>) => void;
  deletePayroll: (id: string) => void;
  getPayrollByEmployee: (employeeId: string) => Payroll[];
  getPayrollByPeriod: (month: string, year: string) => Payroll[];
}

const PayrollContext = createContext<PayrollContextType | undefined>(undefined);

export const PayrollProvider = ({ children }: { children: ReactNode }) => {
  const [payrolls, setPayrolls] = useState<Payroll[]>(initialPayroll);

  const addPayroll = (payroll: Omit<Payroll, "id">) => {
    const newPayroll: Payroll = {
      ...payroll,
      id: String(payrolls.length + 1),
    };
    setPayrolls([...payrolls, newPayroll]);
  };

  const updatePayroll = (id: string, updates: Partial<Payroll>) => {
    setPayrolls(payrolls.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deletePayroll = (id: string) => {
    setPayrolls(payrolls.filter((p) => p.id !== id));
  };

  const getPayrollByEmployee = (employeeId: string) => {
    return payrolls.filter((p) => p.employeeId === employeeId);
  };

  const getPayrollByPeriod = (month: string, year: string) => {
    return payrolls.filter((p) => p.month === month && p.year === year);
  };

  return (
    <PayrollContext.Provider
      value={{
        payrolls,
        addPayroll,
        updatePayroll,
        deletePayroll,
        getPayrollByEmployee,
        getPayrollByPeriod,
      }}
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

