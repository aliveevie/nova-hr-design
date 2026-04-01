import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware.js";
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeDocuments,
  bulkCreateEmployees,
} from "../services/employee.service.js";
import { employeeSchema } from "../utils/validators.js";
import { sendEmployeeWelcomeWithLogin } from "../services/email.service.js";
import { env } from "../config/env.js";
import { isAllowedImportFile, isAllowedImportMimeType, parseEmployeeImportFile } from "../services/employee-import.service.js";

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
    
    // If user is an Employee, they can only access their own record
    if (req.user?.role === "Employee" && req.user.employeeId !== id) {
      return res.status(403).json({ error: "Forbidden: You can only access your own data" });
    }
    
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
      language: employee.language,
      ninNumber: employee.nin_number,
      bvn: employee.bvn,
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

    const employee: any = await createEmployee(validation.data);

    const loginUrl = `${env.FRONTEND_URL}/login`;
    sendEmployeeWelcomeWithLogin(
      employee.email,
      employee.name,
      employee.job_title,
      employee.department,
      employee.tempPassword,
      loginUrl
    )
      .then((result) => {
        if (result.success) {
          console.log(`✅ Welcome email sent to ${employee.email}`);
        } else {
          console.error(`❌ Failed to send welcome email to ${employee.email}`);
        }
      })
      .catch((err) => {
        console.error(`❌ Error sending welcome email to ${employee.email}:`, err);
      });
    
    // Keep tempPassword in response for display to admin (will be shown once, then removed)
    const tempPassword = employee.tempPassword;

    // Transform to frontend format
    const transformed = {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      language: employee.language,
      ninNumber: employee.nin_number,
      bvn: employee.bvn,
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
      // Include tempPassword only for new employee creation
      tempPassword: tempPassword,
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
    
    // If user is an Employee, they can only update their own record
    if (req.user?.role === "Employee" && req.user.employeeId !== id) {
      return res.status(403).json({ error: "Forbidden: You can only modify your own data" });
    }
    
    const validation = employeeSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: "Invalid data", details: validation.error.errors });
    }

    const existing = await getEmployeeById(id);
    if (!existing) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Employees can only update next of kin, not other fields
    let updatedData;
    if (req.user?.role === "Employee") {
      // Only allow next of kin updates for employees
      updatedData = {
        ...existing,
        nextOfKin: validation.data.nextOfKin || (existing.next_of_kin_name ? {
          name: existing.next_of_kin_name,
          relationship: existing.next_of_kin_relationship,
          phone: existing.next_of_kin_phone,
          address: existing.next_of_kin_address,
        } : undefined)
      };
    } else {
      // HR/Admin can update all fields
      updatedData = { ...existing, ...validation.data };
    }
    
    const employee = await updateEmployee(id, updatedData);

    // Transform to frontend format
    const transformed = {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      language: employee.language,
      ninNumber: employee.nin_number,
      bvn: employee.bvn,
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

export const bulkUploadEmployeesController = async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    if (!isAllowedImportFile(file.originalname)) {
      return res.status(400).json({
        error: "Invalid file format. Allowed formats: .xlsx, .xls, .csv, .pdf, .docx, .doc",
      });
    }
    if (!isAllowedImportMimeType(file.mimetype)) {
      return res.status(400).json({
        error: "Invalid file type. Upload only valid Excel, PDF, or Word files.",
      });
    }

    let parsedRows: Record<string, unknown>[] = [];
    try {
      parsedRows = await parseEmployeeImportFile(file);
    } catch (parseError: any) {
      return res.status(400).json({ error: parseError.message || "Unable to parse uploaded file" });
    }
    if (!parsedRows.length) {
      return res.status(400).json({
        error: "No valid staff rows found in file. Ensure header row and tabular content are present.",
      });
    }

    const result = await bulkCreateEmployees(parsedRows);
    if (!result.success) {
      return res.status(400).json({
        error: "Bulk upload failed validation. No employees were created.",
        errors: result.errors,
      });
    }

    const loginUrl = `${env.FRONTEND_URL}/login`;
    result.createdEmployees.forEach((employee: any) => {
      sendEmployeeWelcomeWithLogin(
        employee.email,
        employee.name,
        employee.job_title,
        employee.department,
        employee.tempPassword,
        loginUrl
      )
        .then((emailResult) => {
          if (emailResult.success) {
            console.log(`✅ Welcome email sent to ${employee.email}`);
          } else {
            console.error(`❌ Failed to send welcome email to ${employee.email}`);
          }
        })
        .catch((err) => {
          console.error(`❌ Error sending welcome email to ${employee.email}:`, err);
        });
    });

    const transformed = result.createdEmployees.map((employee: any) => ({
      id: employee.id,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      language: employee.language,
      ninNumber: employee.nin_number,
      bvn: employee.bvn,
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
      tempPassword: employee.tempPassword,
    }));

    res.status(201).json({
      message: `${transformed.length} employees uploaded successfully`,
      count: transformed.length,
      employees: transformed,
    });
  } catch (error) {
    console.error("Bulk upload employees error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

