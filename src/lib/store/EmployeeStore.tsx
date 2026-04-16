import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Employee } from "@/types";
import { employeeApi } from "@/lib/api";
import { useAuth } from "./AuthStore";

interface EmployeeContextType {
  employees: Employee[];
  addEmployee: (employee: Omit<Employee, "id" | "initials">) => Promise<void>;
  bulkUploadEmployees: (file: File) => Promise<{
    message: string;
    count: number;
    employees: Employee[];
    errors?: Array<{ row: number; field: string; message: string; rawValue?: unknown }>;
  }>;
  updateEmployee: (id: string, employee: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;
  getEmployee: (id: string) => Employee | undefined;
  refreshEmployees: () => Promise<void>;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export const EmployeeProvider = ({ children }: { children: ReactNode }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const { isAuthenticated, user } = useAuth();

  const refreshEmployees = async () => {
    try {
      const response = await employeeApi.getAll();
      setEmployees(response.employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  useEffect(() => {
    // Avoid firing protected /employees calls before auth token validation completes.
    if (!isAuthenticated) return;
    if (!user) return;
    if (user.role !== "HR Admin" && user.role !== "Manager") return;
    refreshEmployees();
  }, [isAuthenticated, user?.role]);

  const addEmployee = async (employee: Omit<Employee, "id" | "initials">) => {
    try {
      const response = await employeeApi.create(employee);
      setEmployees([...employees, response.employee]);
      // Return response with tempPassword if available
      return response.employee;
    } catch (error) {
      console.error("Error adding employee:", error);
      throw error;
    }
  };

  const bulkUploadEmployees = async (file: File) => {
    try {
      const response = await employeeApi.bulkUpload(file);
      await refreshEmployees();
      return response;
    } catch (error) {
      console.error("Error bulk uploading employees:", error);
      throw error;
    }
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    try {
      const response = await employeeApi.update(id, updates);
      setEmployees(employees.map((emp) => (emp.id === id ? response.employee : emp)));
    } catch (error) {
      console.error("Error updating employee:", error);
      throw error;
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      await employeeApi.delete(id);
      // Soft delete - mark as inactive
      setEmployees(employees.map((emp) => (emp.id === id ? { ...emp, status: "Inactive" as const } : emp)));
    } catch (error) {
      console.error("Error deleting employee:", error);
      throw error;
    }
  };

  const getEmployee = (id: string) => {
    return employees.find((emp) => emp.id === id);
  };

  return (
    <EmployeeContext.Provider
      value={{
        employees,
        addEmployee,
        bulkUploadEmployees,
        updateEmployee,
        deleteEmployee,
        getEmployee,
        refreshEmployees,
      }}
    >
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
