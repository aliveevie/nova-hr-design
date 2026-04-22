import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/** File types the admin can choose for attendance report downloads. */
export type ReportExportFormat = "xlsx" | "pdf" | "csv";

export type ExportableAttendanceReport = {
  from: string;
  to: string;
  totals: { present: number; late: number; absent: number; onLeave: number };
  byEmployee: Array<{
    id: string;
    name: string;
    department: string;
    present: number;
    late: number;
    absent: number;
    onLeave: number;
    daysTracked: number;
  }>;
  records: Array<{
    date: string;
    employeeId: string;
    employeeName: string;
    department: string;
    checkIn: string | null;
    checkOut: string | null;
    status: string;
  }>;
};

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadCsv(filename: string, rows: string[][]) {
  const escape = (v: string) => {
    const s = String(v ?? "");
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = rows.map((row) => row.map(escape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

function sheetFromAoA(headers: string[], body: (string | number)[][]) {
  const aoa = [headers, ...body.map((r) => r.map((c) => (c == null ? "" : String(c))))];
  return XLSX.utils.aoa_to_sheet(aoa);
}

function downloadXlsxSingleSheet(
  filename: string,
  sheetName: string,
  headers: string[],
  body: (string | number)[][]
) {
  const wb = XLSX.utils.book_new();
  const ws = sheetFromAoA(headers, body);
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

function downloadXlsxWorkbook(
  filename: string,
  sheets: { name: string; headers: string[]; body: (string | number)[][] }[]
) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = sheetFromAoA(s.headers, s.body);
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

function downloadPdfTable(title: string, filename: string, headers: string[], body: (string | number)[][]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(11);
  doc.text(title, 14, 12);
  autoTable(doc, {
    startY: 16,
    head: [headers],
    body: body.map((row) => row.map((c) => (c == null ? "" : String(c)))),
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [66, 66, 66] },
    margin: { left: 14, right: 14 },
  });
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

const summaryHeaders = ["Employee", "Department", "Days tracked", "Present", "Late", "Absent", "On Leave"];
const detailHeaders = ["Date", "Employee", "Department", "Check In", "Check Out", "Status"];

function summaryBody(report: ExportableAttendanceReport): (string | number)[][] {
  return report.byEmployee.map((e) => [
    e.name,
    e.department,
    e.daysTracked,
    e.present,
    e.late,
    e.absent,
    e.onLeave,
  ]);
}

function detailBody(report: ExportableAttendanceReport): (string | number)[][] {
  return report.records.map((r) => [
    r.date,
    r.employeeName,
    r.department,
    r.checkIn ?? "",
    r.checkOut ?? "",
    r.status,
  ]);
}

export type ReportExportKind = "summary" | "detail" | "workbook";

/**
 * Exports the current report using the admin-selected format.
 * `workbook` is Excel-only (one .xlsx with Summary + Detail sheets).
 */
export function exportAttendanceReport(
  report: ExportableAttendanceReport,
  kind: ReportExportKind,
  format: ReportExportFormat
): { ok: true } | { ok: false; message: string } {
  const base = `attendance_${report.from}_${report.to}`;

  if (kind === "workbook") {
    if (format !== "xlsx") {
      return {
        ok: false,
        message: "A combined workbook is only available when “Excel” is selected.",
      };
    }
    downloadXlsxWorkbook(`${base}_workbook.xlsx`, [
      { name: "Summary", headers: summaryHeaders, body: summaryBody(report) },
      { name: "Detail", headers: detailHeaders, body: detailBody(report) },
    ]);
    return { ok: true };
  }

  if (kind === "summary") {
    const headers = summaryHeaders;
    const body = summaryBody(report);
    const title = `Attendance summary · ${report.from} → ${report.to}`;
    if (format === "csv") {
      downloadCsv(`${base}_summary.csv`, [headers, ...body.map((r) => r.map(String))]);
      return { ok: true };
    }
    if (format === "xlsx") {
      downloadXlsxSingleSheet(`${base}_summary.xlsx`, "Summary", headers, body);
      return { ok: true };
    }
    downloadPdfTable(title, `${base}_summary.pdf`, headers, body);
    return { ok: true };
  }

  const headers = detailHeaders;
  const body = detailBody(report);
  const title = `Attendance detail · ${report.from} → ${report.to}`;
  if (format === "csv") {
    downloadCsv(`${base}_detail.csv`, [headers, ...body.map((r) => r.map(String))]);
    return { ok: true };
  }
  if (format === "xlsx") {
    downloadXlsxSingleSheet(`${base}_detail.xlsx`, "Detail", headers, body);
    return { ok: true };
  }
  downloadPdfTable(title, `${base}_detail.pdf`, headers, body);
  return { ok: true };
}

export const REPORT_EXPORT_FORMAT_LABELS: Record<ReportExportFormat, string> = {
  xlsx: "Excel (.xlsx)",
  pdf: "PDF (.pdf)",
  csv: "CSV (.csv)",
};
