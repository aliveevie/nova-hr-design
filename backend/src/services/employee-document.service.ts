import { randomUUID } from "crypto";
import { getSql, isSupabaseEnabled } from "../config/supabase.js";
import { getDatabase, dbHelpers } from "../config/database.js";

export type EmployeeDocKind = "job_profile" | "okr_admin" | "okr_employee";

export type EmployeeDocumentInput = {
  employeeId: string;
  kind: EmployeeDocKind;
  name: string;
  mimeType: string;
  sizeBytes: number;
  contentBase64?: string | null;
  textContent?: string | null;
  uploadedByUserId?: string | null;
  isEmployeeSubmission?: boolean;
};

export const saveEmployeeDocument = async (doc: EmployeeDocumentInput) => {
  const id = randomUUID();
  const now = new Date().toISOString();

  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const rows = await sql`
      insert into employee_documents (
        id, employee_id, name, type, uploaded_date, doc_kind, mime_type, size_bytes,
        content_base64, text_content, uploaded_by_user_id, is_employee_submission
      ) values (
        ${id}, ${doc.employeeId}, ${doc.name}, ${doc.kind}, ${now}, ${doc.kind}, ${doc.mimeType}, ${doc.sizeBytes},
        ${doc.contentBase64 ?? null}, ${doc.textContent ?? null}, ${doc.uploadedByUserId ?? null}, ${doc.isEmployeeSubmission ?? false}
      )
      returning *
    `;
    return rows[0];
  }

  await dbHelpers.read();
  const db = getDatabase();
  const row = {
    id,
    employee_id: doc.employeeId,
    name: doc.name,
    type: doc.kind,
    doc_kind: doc.kind,
    mime_type: doc.mimeType,
    size_bytes: doc.sizeBytes,
    content_base64: doc.contentBase64 ?? null,
    text_content: doc.textContent ?? null,
    uploaded_by_user_id: doc.uploadedByUserId ?? null,
    is_employee_submission: doc.isEmployeeSubmission ?? false,
    uploaded_date: now,
  };
  if (!db.data.employeeDocuments) db.data.employeeDocuments = [];
  (db.data.employeeDocuments as any[]).push(row);
  await dbHelpers.write();
  return row;
};

export const getLatestEmployeeDocumentByKind = async (
  employeeId: string,
  kind: EmployeeDocKind
) => {
  if (isSupabaseEnabled) {
    const sql = getSql()!;
    const rows = await sql`
      select * from employee_documents
      where employee_id = ${employeeId} and doc_kind = ${kind}
      order by uploaded_date desc
      limit 1
    `;
    return rows[0] || null;
  }
  await dbHelpers.read();
  const db = getDatabase();
  return ((db.data.employeeDocuments || []) as any[])
    .filter((d) => d.employee_id === employeeId && (d.doc_kind || d.type) === kind)
    .sort((a, b) => new Date(b.uploaded_date).getTime() - new Date(a.uploaded_date).getTime())[0] || null;
};
