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
  resolveAdminOwnerForCreate,
  hrAdminOwnsEmployee,
} from "../services/employee.service.js";
import { employeeSchema } from "../utils/validators.js";
import { sendWelcomeEmailForNewEmployeeRow } from "../services/email.service.js";
import { isAllowedImportFile, isAllowedImportMimeType, parseEmployeeImportFile } from "../services/employee-import.service.js";
import { validateDocumentUpload } from "../utils/document-upload-validation.util.js";
import { saveEmployeeDocument, getLatestEmployeeDocumentByKind } from "../services/employee-document.service.js";
import { canUserAccessEmployee } from "../utils/ownership-access.util.js";

export const getEmployeesController = async (req: AuthRequest, res: Response) => {
  try {
    const { department, status } = req.query;
    const filters: any = {};
    if (department) filters.department = department as string;
    if (status) filters.status = status as string;

    const scope =
      req.user?.role === "HR Admin"
        ? { hrAdminUserId: req.user.userId }
        : undefined;
    const employees = await getAllEmployees(filters, scope);
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

    if (req.user?.role === "HR Admin") {
      const ok = await hrAdminOwnsEmployee(id, req.user.userId);
      if (!ok) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    // Get documents
    const documents = await getEmployeeDocuments(id);
    const employeeWithDocs = {
      ...employee,
      documents: documents.map((doc: any) => ({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        kind: doc.doc_kind || doc.type,
        mimeType: doc.mime_type || null,
        hasFile: !!doc.content_base64,
        hasText: !!doc.text_content,
        textContent: doc.text_content || null,
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

    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const adminOwnerId = await resolveAdminOwnerForCreate(
      req.user.role,
      req.user.userId
    );
    const employee: any = await createEmployee(validation.data, {
      adminOwnerId,
    });

    sendWelcomeEmailForNewEmployeeRow(employee, employee.tempPassword)
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

    if (req.user?.role === "HR Admin") {
      const ok = await hrAdminOwnsEmployee(id, req.user.userId);
      if (!ok) {
        return res.status(403).json({ error: "Forbidden" });
      }
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

    if (req.user?.role === "HR Admin") {
      const ok = await hrAdminOwnsEmployee(id, req.user.userId);
      if (!ok) {
        return res.status(403).json({ error: "Forbidden" });
      }
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

    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const adminOwnerId = await resolveAdminOwnerForCreate(
      req.user.role,
      req.user.userId
    );
    const result = await bulkCreateEmployees(parsedRows, adminOwnerId);
    if (!result.success) {
      return res.status(400).json({
        error: "Bulk upload failed validation. No employees were created.",
        errors: result.errors,
      });
    }

    result.createdEmployees.forEach((employee: any) => {
      sendWelcomeEmailForNewEmployeeRow(employee, employee.tempPassword)
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

export const uploadEmployeeJobProfileController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const employee = await getEmployeeById(id);
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    if (req.user.role !== "HR Admin" && req.user.role !== "Manager") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const allowed = await canUserAccessEmployee(req, id);
    if (!allowed) return res.status(403).json({ error: "Forbidden" });

    const textContent =
      typeof req.body?.textContent === "string" ? req.body.textContent.trim() : "";
    const file = req.file;
    if (!file && !textContent) {
      return res.status(400).json({ error: "Upload a .doc/.docx file or provide job profile text." });
    }

    if (file) {
      const check = validateDocumentUpload(file, "job_profile");
      if (!check.ok) return res.status(400).json({ error: check.error });
    }

    const doc = await saveEmployeeDocument({
      employeeId: id,
      kind: "job_profile",
      name: file?.originalname || "job-profile.txt",
      mimeType: file?.mimetype || "text/plain",
      sizeBytes: file?.size || Buffer.byteLength(textContent, "utf8"),
      contentBase64: file ? file.buffer.toString("base64") : null,
      textContent: textContent || null,
      uploadedByUserId: req.user.userId,
      isEmployeeSubmission: false,
    });
    res.status(201).json({ document: doc });
  } catch (error) {
    console.error("uploadEmployeeJobProfileController:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const uploadEmployeeOkrTemplateController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (req.user.role !== "HR Admin" && req.user.role !== "Manager") return res.status(403).json({ error: "Forbidden" });
    const employee = await getEmployeeById(id);
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    const allowed = await canUserAccessEmployee(req, id);
    if (!allowed) return res.status(403).json({ error: "Forbidden" });

    const file = req.file;
    if (!file) return res.status(400).json({ error: "Upload an OKR file (.xlsx, .xls, .csv)." });
    const check = validateDocumentUpload(file, "okr");
    if (!check.ok) return res.status(400).json({ error: check.error });

    const doc = await saveEmployeeDocument({
      employeeId: id,
      kind: "okr_admin",
      name: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      contentBase64: file.buffer.toString("base64"),
      uploadedByUserId: req.user.userId,
      isEmployeeSubmission: false,
    });
    res.status(201).json({ document: doc });
  } catch (error) {
    console.error("uploadEmployeeOkrTemplateController:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const uploadEmployeeOkrSubmissionController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    if (req.user.role !== "Employee" || req.user.employeeId !== id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const employee = await getEmployeeById(id);
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    const file = req.file;
    if (!file) return res.status(400).json({ error: "Upload your OKR file (.xlsx, .xls, .csv)." });
    const check = validateDocumentUpload(file, "okr");
    if (!check.ok) return res.status(400).json({ error: check.error });

    const doc = await saveEmployeeDocument({
      employeeId: id,
      kind: "okr_employee",
      name: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      contentBase64: file.buffer.toString("base64"),
      uploadedByUserId: req.user.userId,
      isEmployeeSubmission: true,
    });
    res.status(201).json({ document: doc });
  } catch (error) {
    console.error("uploadEmployeeOkrSubmissionController:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getEmployeeWorkDocsController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const allowed = await canUserAccessEmployee(req, id);
    if (!allowed) return res.status(403).json({ error: "Forbidden" });

    const [jobProfile, okrTemplate, okrSubmission] = await Promise.all([
      getLatestEmployeeDocumentByKind(id, "job_profile"),
      getLatestEmployeeDocumentByKind(id, "okr_admin"),
      getLatestEmployeeDocumentByKind(id, "okr_employee"),
    ]);

    const compact = (d: any) =>
      d
        ? {
            id: d.id,
            name: d.name,
            kind: d.doc_kind || d.type,
            mimeType: d.mime_type || "application/octet-stream",
            uploadedDate: d.uploaded_date,
            hasFile: !!d.content_base64,
            hasText: !!d.text_content,
            textContent: d.text_content || null,
          }
        : null;

    res.json({
      jobProfile: compact(jobProfile),
      okrTemplate: compact(okrTemplate),
      okrSubmission: compact(okrSubmission),
    });
  } catch (error) {
    console.error("getEmployeeWorkDocsController:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const downloadEmployeeWorkDocController = async (req: AuthRequest, res: Response) => {
  try {
    const { id, kind } = req.params as { id: string; kind: "job_profile" | "okr_admin" | "okr_employee" };
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const allowed = await canUserAccessEmployee(req, id);
    if (!allowed) return res.status(403).json({ error: "Forbidden" });

    if (!["job_profile", "okr_admin", "okr_employee"].includes(kind)) {
      return res.status(400).json({ error: "Invalid document kind" });
    }
    const doc = await getLatestEmployeeDocumentByKind(id, kind as any);
    if (!doc || !doc.content_base64) return res.status(404).json({ error: "Document not found" });

    const bytes = Buffer.from(String(doc.content_base64), "base64");
    res.setHeader("Content-Type", String(doc.mime_type || "application/octet-stream"));
    res.setHeader("Content-Disposition", `attachment; filename=\"${String(doc.name || "document")}\"`);
    res.send(bytes);
  } catch (error) {
    console.error("downloadEmployeeWorkDocController:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

