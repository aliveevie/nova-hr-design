import path from "path";
import XLSX from "xlsx";
import mammoth from "mammoth";

const headerMap: Record<string, string> = {
  name: "name",
  fullname: "name",
  "full name": "name",
  email: "email",
  "email address": "email",
  phone: "phone",
  "phone number": "phone",
  language: "language",
  nin: "ninNumber",
  "nin number": "ninNumber",
  ninnumber: "ninNumber",
  bvn: "bvn",
  "bvn number": "bvn",
  department: "department",
  "job title": "jobTitle",
  jobtitle: "jobTitle",
  grade: "grade",
  level: "level",
  status: "status",
  "join date": "joinDate",
  joindate: "joinDate",
  salary: "salary",
  "date of birth": "dateOfBirth",
  dateofbirth: "dateOfBirth",
  gender: "gender",
  address: "address",
};

const allowedExtensions = new Set([".xlsx", ".xls", ".csv", ".pdf", ".docx", ".doc"]);
const allowedMimeTypes = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/octet-stream",
]);

export const isAllowedImportFile = (filename: string): boolean => {
  const ext = path.extname(filename).toLowerCase();
  return allowedExtensions.has(ext);
};

export const isAllowedImportMimeType = (mimeType: string): boolean => {
  return allowedMimeTypes.has(mimeType);
};

const normalizeHeader = (header: string): string => {
  const key = header.trim().toLowerCase().replace(/\s+/g, " ");
  return headerMap[key] || headerMap[key.replace(/\s/g, "")] || key;
};

const normalizeCellValue = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  return String(value).trim();
};

const normalizeRow = (row: Record<string, unknown>): Record<string, unknown> => {
  const normalized: Record<string, unknown> = {};
  Object.entries(row).forEach(([rawHeader, value]) => {
    const header = normalizeHeader(rawHeader);
    normalized[header] = normalizeCellValue(value);
  });
  if (normalized.salary !== undefined && normalized.salary !== "") {
    normalized.salary = Number(normalized.salary);
  }
  return normalized;
};

const tableArrayToObjects = (table: Array<Array<string>>): Record<string, unknown>[] => {
  if (!table.length) return [];
  const headers = table[0].map((h) => h.trim());
  const rows: Record<string, unknown>[] = [];
  for (let i = 1; i < table.length; i += 1) {
    const cells = table[i];
    const row: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      row[header] = cells[idx] ?? "";
    });
    rows.push(row);
  }
  return rows;
};

const parseDelimitedText = (raw: string): Record<string, unknown>[] => {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^--\s*\d+\s+of\s+\d+\s*--$/.test(line));

  if (lines.length < 2) {
    return [];
  }

  const delimiter = lines[0].includes("|")
    ? "|"
    : lines[0].includes("\t")
    ? "\t"
    : ",";

  const headers = lines[0].split(delimiter).map((h) => h.trim());
  const expectedCommas = Math.max(headers.length - 1, 0);
  const mergedLines: string[] = [];
  let buffer = "";

  const countDelims = (line: string) => {
    if (!line) return 0;
    if (delimiter === "|") return (line.match(/\|/g) || []).length;
    if (delimiter === "\t") return (line.match(/\t/g) || []).length;
    return (line.match(/,/g) || []).length;
  };

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!buffer) {
      buffer = line;
    } else {
      buffer = `${buffer} ${line}`;
    }

    if (expectedCommas === 0 || countDelims(buffer) >= expectedCommas) {
      mergedLines.push(buffer);
      buffer = "";
    }
  }

  if (buffer) {
    mergedLines.push(buffer);
  }

  const rows: Record<string, unknown>[] = [];

  for (let i = 0; i < mergedLines.length; i += 1) {
    const values = mergedLines[i].split(delimiter).map((v) => v.trim());
    const row: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });
    rows.push(row);
  }

  return rows;
};

export const parseEmployeeImportFile = async (
  file: Express.Multer.File
): Promise<Record<string, unknown>[]> => {
  try {
    const ext = path.extname(file.originalname).toLowerCase();

    if (ext === ".xlsx" || ext === ".xls" || ext === ".csv") {
      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) return [];
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], {
        defval: "",
      });
      return data.map(normalizeRow);
    }

    if (ext === ".pdf") {
      // Lazy import to avoid loading PDF runtime polyfills during cold start
      // for non-upload routes in serverless environments.
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: file.buffer });
      try {
        const tableResult = await parser.getTable();
        const merged = tableResult.mergedTables || [];
        if (merged.length > 0) {
          const objects = merged.flatMap((table) => tableArrayToObjects(table));
          return objects.map(normalizeRow);
        }

        const parsedText = await parser.getText();
        return parseDelimitedText(parsedText.text || "").map(normalizeRow);
      } finally {
        await parser.destroy();
      }
    }

    if (ext === ".docx") {
      const parsed = await mammoth.extractRawText({ buffer: file.buffer });
      return parseDelimitedText(parsed.value).map(normalizeRow);
    }

    if (ext === ".doc") {
      // Older .doc parsing support is limited; parse as delimited plain text if possible.
      const fallbackText = file.buffer.toString("utf8");
      return parseDelimitedText(fallbackText).map(normalizeRow);
    }

    return [];
  } catch (error) {
    throw new Error("Unable to parse file. Ensure the document uses tabular staff data with headers.");
  }
};

