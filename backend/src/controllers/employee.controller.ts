import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeDocuments,
} from "../services/employee.service.js";
import { employeeSchema } from "../utils/validators.js";
import { sendWelcomeEmail } from "../services/email.service.js";

export const getEmployeesController = async (req: AuthRequest, res: Response) => {
  try {
    const { department, status } = req.query;
    const filters: any = {};
    if (department) filters.department = department as string;
    if (status) filters.status = status as string;

    const employees = await getAllEmployees(filters);
    res.json({ employees });
  } catch (error) {
    console.error("Get employees error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getEmployeeController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const employee = await getEmployeeById(id);

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Get documents
    const documents = await getEmployeeDocuments(id);
    const employeeWithDocs = {
      ...employee,
      documents: documents.map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        uploadedDate: doc.uploaded_date,
      })),
      nextOfKin: employee.next_of_kin_name
        ? {
            name: employee.next_of_kin_name,
            relationship: employee.next_of_kin_relationship,
            phone: employee.next_of_kin_phone,
            address: employee.next_of_kin_address,
          }
        : undefined,
    };

    // Transform database fields to frontend format
    const transformed = {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      dateOfBirth: employee.date_of_birth,
      gender: employee.gender,
      address: employee.address,
      department: employee.department,
      jobTitle: employee.job_title,
      grade: employee.grade,
      level: employee.level,
      status: employee.status,
      joinDate: employee.join_date,
      salary: employee.salary,
      initials: employee.initials,
      nextOfKin: employeeWithDocs.nextOfKin,
      documents: employeeWithDocs.documents,
    };

    res.json({ employee: transformed });
  } catch (error) {
    console.error("Get employee error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const createEmployeeController = async (req: AuthRequest, res: Response) => {
  try {
    const validation = employeeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid data", details: validation.error.errors });
    }

    const employee = await createEmployee(validation.data);

    // Send welcome email
    sendWelcomeEmail(
      employee.email,
      employee.name,
      employee.job_title,
      employee.department
    ).catch((err) => console.error("Failed to send welcome email:", err));

    // Transform to frontend format
    const transformed = {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      dateOfBirth: employee.date_of_birth,
      gender: employee.gender,
      address: employee.address,
      department: employee.department,
      jobTitle: employee.job_title,
      grade: employee.grade,
      level: employee.level,
      status: employee.status,
      joinDate: employee.join_date,
      salary: employee.salary,
      initials: employee.initials,
      nextOfKin: employee.next_of_kin_name
        ? {
            name: employee.next_of_kin_name,
            relationship: employee.next_of_kin_relationship,
            phone: employee.next_of_kin_phone,
            address: employee.next_of_kin_address,
          }
        : undefined,
    };

    res.status(201).json({ employee: transformed });
  } catch (error) {
    console.error("Create employee error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateEmployeeController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const validation = employeeSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid data", details: validation.error.errors });
    }

    const existing = await getEmployeeById(id);
    if (!existing) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const updatedData = { ...existing, ...validation.data };
    const employee = await updateEmployee(id, updatedData);

    // Transform to frontend format
    const transformed = {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      dateOfBirth: employee.date_of_birth,
      gender: employee.gender,
      address: employee.address,
      department: employee.department,
      jobTitle: employee.job_title,
      grade: employee.grade,
      level: employee.level,
      status: employee.status,
      joinDate: employee.join_date,
      salary: employee.salary,
      initials: employee.initials,
      nextOfKin: employee.next_of_kin_name
        ? {
            name: employee.next_of_kin_name,
            relationship: employee.next_of_kin_relationship,
            phone: employee.next_of_kin_phone,
            address: employee.next_of_kin_address,
          }
        : undefined,
    };

    res.json({ employee: transformed });
  } catch (error) {
    console.error("Update employee error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteEmployeeController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const employee = await getEmployeeById(id);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    await deleteEmployee(id);
    res.json({ message: "Employee deactivated successfully" });
  } catch (error) {
    console.error("Delete employee error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

