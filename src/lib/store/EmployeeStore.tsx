import { createContext, useContext, useState, ReactNode } from "react";
import { Employee } from "@/types";
import { employees as initialEmployees } from "@/lib/mockData";

interface EmployeeContextType {
  employees: Employee[];
  addEmployee: (employee: Omit<Employee, "id">) => void;
  updateEmployee: (id: string, employee: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  getEmployee: (id: string) => Employee | undefined;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export const EmployeeProvider = ({ children }: { children: ReactNode }) => {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);

  const addEmployee = (employee: Omit<Employee, "id">) => {
    const newEmployee: Employee = {
      ...employee,
      id: String(employees.length + 1),
      initials: employee.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
    };
    setEmployees([...employees, newEmployee]);
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    setEmployees(employees.map((emp) => (emp.id === id ? { ...emp, ...updates } : emp)));
  };

  const deleteEmployee = (id: string) => {
    // Soft delete - mark as inactive
    setEmployees(employees.map((emp) => (emp.id === id ? { ...emp, status: "Inactive" as const } : emp)));
  };

  const getEmployee = (id: string) => {
    return employees.find((emp) => emp.id === id);
  };

  return (
    <EmployeeContext.Provider value={{ employees, addEmployee, updateEmployee, deleteEmployee, getEmployee }}>
      {children}
    </EmployeeContext.Provider>
  );
};

export const useEmployees = () => {
  const context = useContext(EmployeeContext);
  if (context === undefined) {
    throw new Error("useEmployees must be used within an EmployeeProvider");
  }
  return context;
};

