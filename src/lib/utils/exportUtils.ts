// Export utilities for PDF, Excel, and CSV

export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers.map((header) => {
        const value = row[header];
        return typeof value === "string" && value.includes(",")
          ? `"${value}"`
          : value;
      }).join(",")
    ),
  ].join("\n");
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToExcel = async (data: any[], filename: string) => {
  // For now, we'll use CSV format as Excel-compatible
  // In production, you'd use a library like xlsx
  exportToCSV(data, filename);
};

export const exportToPDF = async (data: any[], filename: string, title: string) => {
  // Mock PDF export - in production, use jsPDF
  const content = `
    ${title}
    ${"=".repeat(50)}
    ${JSON.stringify(data, null, 2)}
  `;
  
  const blob = new Blob([content], { type: "text/plain" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.txt`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

