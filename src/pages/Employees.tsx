import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Eye, Edit, Trash2, Upload, Download, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useEmployees } from "@/lib/store";
import { EmployeeForm } from "@/components/forms/EmployeeForm";
import { Employee } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { employeeApi, EmployeeWorkDoc } from "@/lib/api/employee.api";

const statusClass: Record<string, string> = {
  Active: "bg-success/10 text-success border-0",
  "On Leave": "bg-warning/10 text-warning border-0",
  Inactive: "bg-muted text-muted-foreground border-0",
};

const Employees = () => {
  const [search, setSearch] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<Array<{ row: number; field: string; message: string; rawValue?: unknown }>>([]);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>();
  const [docsDialogEmployee, setDocsDialogEmployee] = useState<Employee | null>(null);
  const [jobProfileFile, setJobProfileFile] = useState<File | null>(null);
  const [okrTemplateFile, setOkrTemplateFile] = useState<File | null>(null);
  const [jobProfileText, setJobProfileText] = useState("");
  const [isSavingDocs, setIsSavingDocs] = useState(false);
  const [workDocs, setWorkDocs] = useState<{
    jobProfile: EmployeeWorkDoc | null;
    okrTemplate: EmployeeWorkDoc | null;
    okrSubmission: EmployeeWorkDoc | null;
  } | null>(null);
  const { employees, addEmployee, bulkUploadEmployees, updateEmployee, deleteEmployee } = useEmployees();
  const { toast } = useToast();

  const filtered = employees.filter(
    (e) => e.name.toLowerCase().includes(search.toLowerCase()) || 
           e.department.toLowerCase().includes(search.toLowerCase()) ||
           e.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (data: Omit<Employee, "id" | "initials">) => {
    try {
      await addEmployee(data);
      setIsAddDialogOpen(false);
      toast({
        title: "Success",
        description: "Employee added successfully. Login credentials have been sent to their email.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add employee",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = (data: Omit<Employee, "id" | "initials">) => {
    if (editingEmployee) {
      updateEmployee(editingEmployee.id, data);
      setEditingEmployee(undefined);
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteEmployee(id);
    toast({
      title: "Success",
      description: "Employee deactivated successfully",
    });
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      toast({
        title: "No file selected",
        description: "Please select an Excel, PDF, or Word file.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadErrors([]);
      const result = await bulkUploadEmployees(bulkFile);
      setBulkFile(null);
      setIsBulkDialogOpen(false);
      toast({
        title: "Upload successful",
        description: `${result.count} staff records imported and welcome emails queued.`,
      });
    } catch (error: any) {
      const details = error?.details;
      const rowErrors = Array.isArray(details?.errors) ? details.errors : [];
      setUploadErrors(rowErrors);
      toast({
        title: "Upload failed",
        description: error?.message || "Bulk upload failed",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };


  const handleDownloadUploadTemplate = () => {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Language",
      "NIN Number",
      "BVN",
      "Department",
      "Job Title",
      "Grade",
      "Level",
      "Status",
      "Join Date",
      "Salary",
      "Date of Birth",
      "Gender",
      "Address",
    ];

    const sampleRow = [
      "Jane Doe",
      "jane.doe@company.com",
      "08012345678",
      "English",
      "12345678901",
      "22345678901",
      "Engineering",
      "Software Engineer",
      "G7",
      "L3",
      "Active",
      "2026-03-01",
      "750000",
      "1995-08-14",
      "Female",
      "Lagos, Nigeria",
    ];

    const csv = [headers, sampleRow]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "staff-upload-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadStaffData = () => {
    const headers = [
      "Name",
      "Email",
      "Phone",
      "Language",
      "NIN Number",
      "BVN",
      "Department",
      "Job Title",
      "Grade",
      "Level",
      "Status",
      "Join Date",
      "Salary",
      "Date of Birth",
      "Gender",
      "Address",
    ];
    const rows = employees.map((emp) => [
      emp.name,
      emp.email,
      emp.phone || "",
      emp.language || "",
      emp.ninNumber || "",
      emp.bvn || "",
      emp.department,
      emp.jobTitle,
      emp.grade || "",
      emp.level || "",
      emp.status,
      emp.joinDate,
      String(emp.salary ?? ""),
      emp.dateOfBirth || "",
      emp.gender || "",
      emp.address || "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "staff-data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const isAllowedJobProfileFile = (file: File) => {
    const name = file.name.toLowerCase();
    return name.endsWith(".doc") || name.endsWith(".docx");
  };

  const isAllowedOkrFile = (file: File) => {
    const name = file.name.toLowerCase();
    return name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv");
  };

  const openDocsDialog = async (emp: Employee) => {
    setDocsDialogEmployee(emp);
    setJobProfileFile(null);
    setOkrTemplateFile(null);
    setJobProfileText("");
    try {
      const docs = await employeeApi.getWorkDocs(emp.id);
      setWorkDocs(docs);
      if (docs.jobProfile?.hasText && docs.jobProfile.textContent) {
        setJobProfileText(docs.jobProfile.textContent);
      }
    } catch (error) {
      setWorkDocs(null);
    }
  };

  const handleSaveWorkDocs = async () => {
    if (!docsDialogEmployee) return;
    if (!jobProfileFile && !jobProfileText.trim() && !okrTemplateFile) {
      toast({
        title: "No update provided",
        description: "Upload/write Job Profile and/or upload OKR template.",
        variant: "destructive",
      });
      return;
    }
    if (jobProfileFile && !isAllowedJobProfileFile(jobProfileFile)) {
      toast({ title: "Invalid Job Profile file", description: "Use only .doc or .docx", variant: "destructive" });
      return;
    }
    if (okrTemplateFile && !isAllowedOkrFile(okrTemplateFile)) {
      toast({ title: "Invalid OKR file", description: "Use only .xlsx, .xls or .csv", variant: "destructive" });
      return;
    }

    try {
      setIsSavingDocs(true);
      if (jobProfileFile || jobProfileText.trim()) {
        await employeeApi.uploadJobProfile(docsDialogEmployee.id, {
          file: jobProfileFile || undefined,
          textContent: jobProfileText.trim() || undefined,
        });
      }
      if (okrTemplateFile) {
        await employeeApi.uploadOkrTemplate(docsDialogEmployee.id, okrTemplateFile);
      }
      const docs = await employeeApi.getWorkDocs(docsDialogEmployee.id);
      setWorkDocs(docs);
      toast({ title: "Saved", description: "Job profile / OKR documents updated." });
    } catch (error: any) {
      toast({
        title: "Failed to save work docs",
        description: error?.message || "Please check the file format and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingDocs(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">Manage your team members</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload Staff
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Bulk Upload Employees</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Allowed formats: .xlsx, .xls, .csv, .pdf, .docx, .doc
                </p>
                <div className="rounded-md border p-3 space-y-2 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Before upload, ensure:</p>
                  <p>- Required columns: Name, Email, Department, Job Title, Status, Join Date, Salary</p>
                  <p>- Status must be: Active, On Leave, or Inactive</p>
                  <p>- Join Date format: YYYY-MM-DD (example: 2026-03-01)</p>
                  <p>- Salary must be a positive number (no commas or symbols)</p>
                  <p>- Email, NIN Number, and BVN should be unique (no duplicates)</p>
                  <p>- Header row should match template labels for best results</p>
                </div>
                <div className="flex justify-start">
                  <Button type="button" variant="outline" onClick={handleDownloadUploadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Upload Template
                  </Button>
                </div>
                <Input
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf,.docx,.doc"
                  onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                />
                {uploadErrors.length > 0 && (
                  <div className="border rounded-md p-3 space-y-2 max-h-60 overflow-y-auto">
                    <p className="text-sm font-medium">Validation Issues</p>
                    {uploadErrors.map((err, idx) => (
                      <p key={`${err.row}-${err.field}-${idx}`} className="text-xs text-destructive">
                        Row {err.row} - {err.field}: {err.message}
                      </p>
                    ))}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)} disabled={isUploading}>
                    Cancel
                  </Button>
                  <Button onClick={handleBulkUpload} disabled={isUploading}>
                    {isUploading ? "Uploading..." : "Upload and Process"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={handleDownloadStaffData}>
            <Download className="h-4 w-4 mr-2" />
            Download Staff Data
          </Button>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Employee</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
              </DialogHeader>
              <EmployeeForm onSubmit={handleAdd} onCancel={() => setIsAddDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-lg">All Employees ({filtered.length})</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{emp.initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell>{emp.jobTitle}</TableCell>
                    <TableCell><Badge variant="secondary" className={statusClass[emp.status]}>{emp.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/employees/${emp.id}`}><Eye className="h-4 w-4" /></Link>
                        </Button>
                        <Dialog open={editingEmployee?.id === emp.id} onOpenChange={(open) => !open && setEditingEmployee(undefined)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setEditingEmployee(emp)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Edit Employee</DialogTitle>
                            </DialogHeader>
                            <EmployeeForm employee={emp} onSubmit={handleUpdate} onCancel={() => setEditingEmployee(undefined)} />
                          </DialogContent>
                        </Dialog>
                        <Dialog open={docsDialogEmployee?.id === emp.id} onOpenChange={(open) => !open && setDocsDialogEmployee(null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => openDocsDialog(emp)}>
                              <FileText className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Work Docs: {emp.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="rounded-md border p-3 space-y-2">
                                <p className="font-medium">Job Profile</p>
                                <p className="text-xs text-muted-foreground">Upload only .doc/.docx or write text below.</p>
                                <Input type="file" accept=".doc,.docx" onChange={(e) => setJobProfileFile(e.target.files?.[0] || null)} />
                                <Textarea
                                  placeholder="Or paste/write job profile text"
                                  value={jobProfileText}
                                  onChange={(e) => setJobProfileText(e.target.value)}
                                  rows={8}
                                />
                                {workDocs?.jobProfile?.uploadedDate && (
                                  <p className="text-xs text-muted-foreground">Latest: {new Date(workDocs.jobProfile.uploadedDate).toLocaleString()}</p>
                                )}
                              </div>

                              <div className="rounded-md border p-3 space-y-2">
                                <p className="font-medium">OKR Template</p>
                                <p className="text-xs text-muted-foreground">Upload only .xlsx/.xls/.csv (no macro-enabled files).</p>
                                <Input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setOkrTemplateFile(e.target.files?.[0] || null)} />
                                {workDocs?.okrTemplate?.uploadedDate && (
                                  <p className="text-xs text-muted-foreground">Latest: {new Date(workDocs.okrTemplate.uploadedDate).toLocaleString()}</p>
                                )}
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setDocsDialogEmployee(null)}>Close</Button>
                                <Button onClick={handleSaveWorkDocs} disabled={isSavingDocs}>
                                  {isSavingDocs ? "Saving..." : "Save"}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deactivate Employee</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to deactivate {emp.name}? This action can be reversed later.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(emp.id)}>Deactivate</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Employees;
