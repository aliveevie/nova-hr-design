export type AllowedDocType = "job_profile" | "okr";

const JOB_PROFILE_EXT = [".doc", ".docx"];
const OKR_EXT = [".xlsx", ".xls", ".csv"];

const JOB_PROFILE_MIME = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const OKR_MIME = new Set([
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/csv",
  "text/plain",
]);

const hasExt = (fileName: string, extList: string[]) => {
  const lower = fileName.toLowerCase();
  return extList.some((e) => lower.endsWith(e));
};

const containsSuspiciousText = (text: string) => {
  const t = text.toLowerCase();
  return (
    t.includes("<script") ||
    t.includes("javascript:") ||
    t.includes("powershell") ||
    t.includes("cmd.exe") ||
    t.includes("wscript.shell")
  );
};

const containsMacroArtifactInZip = (buffer: Buffer) => {
  const txt = buffer.toString("latin1").toLowerCase();
  return (
    txt.includes("vbaproject.bin") ||
    txt.includes("vba/") ||
    txt.includes("activex") ||
    txt.includes("oleobject")
  );
};

export const validateDocumentUpload = (
  file: Express.Multer.File,
  expected: AllowedDocType
) => {
  const fileName = String(file.originalname || "");
  const mime = String(file.mimetype || "");
  const extOk =
    expected === "job_profile"
      ? hasExt(fileName, JOB_PROFILE_EXT)
      : hasExt(fileName, OKR_EXT);
  if (!extOk) {
    return {
      ok: false as const,
      error:
        expected === "job_profile"
          ? "Job profile accepts only .doc or .docx files."
          : "OKR accepts only .xlsx, .xls, or .csv files.",
    };
  }

  const mimeOk =
    expected === "job_profile" ? JOB_PROFILE_MIME.has(mime) : OKR_MIME.has(mime);
  if (!mimeOk) {
    return {
      ok: false as const,
      error:
        expected === "job_profile"
          ? "Invalid job profile file type."
          : "Invalid OKR file type.",
    };
  }

  const lower = fileName.toLowerCase();
  if (lower.endsWith(".docx") || lower.endsWith(".xlsx")) {
    if (containsMacroArtifactInZip(file.buffer)) {
      return {
        ok: false as const,
        error: "Macro-enabled or embedded executable content is not allowed.",
      };
    }
  }

  if (lower.endsWith(".csv")) {
    const text = file.buffer.toString("utf8");
    if (containsSuspiciousText(text)) {
      return {
        ok: false as const,
        error: "Potentially runnable code content detected in CSV file.",
      };
    }
  }

  return { ok: true as const };
};
