import { useEffect, useState } from "react";
import { useAuth } from "@/lib/store";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { employeeApi, leaveApi, payrollApi, performanceApi, trainingApi, disciplineApi } from "@/lib/api";
import { Employee, LeaveRequest, Payroll, Performance, Training, Discipline } from "@/types";
import { calculateLeaveDays } from "@/lib/utils/leaveUtils";
import { useHoliday } from "@/lib/store";
import { attendanceApi, OfficeLocationDto } from "@/lib/api/attendance.api";
import {
  Printer,
  Plus,
  LayoutDashboard,
  User,
  CalendarDays,
  Wallet,
  LineChart,
  GraduationCap,
  AlertCircle,
  KeyRound,
  Lock,
  Upload,
  Download,
} from "lucide-react";
import { format } from "date-fns";

const statusClass: Record<string, string> = {
  Approved: "bg-success/10 text-success border-0",
  Pending: "bg-warning/10 text-warning border-0",
  Rejected: "bg-destructive/10 text-destructive border-0",
  Paid: "bg-success/10 text-success border-0",
  "In Progress": "bg-warning/10 text-warning border-0",
  Completed: "bg-success/10 text-success border-0",
  Scheduled: "bg-muted/10 text-muted-foreground border-0",
  Active: "bg-destructive/10 text-destructive border-0",
  Resolved: "bg-success/10 text-success border-0",
};

const EmployeePortal = () => {
  const { user } = useAuth();
  const { holidays } = useHoliday();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<any>(null);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isNextOfKinDialogOpen, setIsNextOfKinDialogOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [activeSection, setActiveSection] = useState<
    "overview" | "profile" | "leave" | "payroll" | "performance" | "training" | "queries" | "account"
  >("overview");
  const [workDocs, setWorkDocs] = useState<{
    jobProfile: any | null;
    okrTemplate: any | null;
    okrSubmission: any | null;
  } | null>(null);
  const [ownOkrFile, setOwnOkrFile] = useState<File | null>(null);
  const [isUploadingOwnOkr, setIsUploadingOwnOkr] = useState(false);
  const [deviceId] = useState(() => {
    const key = "attendance_device_id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(key, created);
    return created;
  });
  const [attendanceStatus, setAttendanceStatus] = useState<{
    lastAction: "checked_in" | "checked_out" | "none" | null;
    insideZoneId: string | null;
    lastEvalAt: string | null;
    lastError: string | null;
    lastAccuracyM: number | null;
  }>({
    lastAction: null,
    insideZoneId: null,
    lastEvalAt: null,
    lastError: null,
    lastAccuracyM: null,
  });
  const [evaluatingAuto, setEvaluatingAuto] = useState(false);
  const [officeLocation, setOfficeLocation] = useState<OfficeLocationDto | null>(null);
  const [myAttendance, setMyAttendance] = useState<any[]>([]);

  // Leave form state
  const [leaveType, setLeaveType] = useState<LeaveRequest["type"]>("Annual Leave");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");

  // Next of kin form state
  const [nextOfKinName, setNextOfKinName] = useState("");
  const [nextOfKinRelationship, setNextOfKinRelationship] = useState("");
  const [nextOfKinPhone, setNextOfKinPhone] = useState("");
  const [nextOfKinAddress, setNextOfKinAddress] = useState("");

  useEffect(() => {
    if (user?.employeeId) {
      loadEmployeeData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const getGeo = async (): Promise<{ lat: number; lng: number; accuracyM: number }> => {
    if (!navigator.geolocation) throw new Error("Geolocation is not supported on this device.");
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracyM: Math.round(pos.coords.accuracy || 0),
          });
        },
        () => reject(new Error("Location permission denied. Please allow location access.")),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  };

  // Device registration is automatic on first in-office evaluation.

  const runAutoEvaluate = async () => {
    if (!user?.employeeId) return;
    try {
      setEvaluatingAuto(true);
      const geo = await getGeo();
      const result = await attendanceApi.autoEvaluate({
        deviceId,
        lat: geo.lat,
        lng: geo.lng,
        accuracyM: geo.accuracyM,
      });

      setAttendanceStatus({
        lastAction: result.action,
        insideZoneId: result.insideZoneId,
        lastEvalAt: new Date().toISOString(),
        lastError: null,
        lastAccuracyM: geo.accuracyM,
      });

      if (result.action === "checked_in") {
        toast({
          title: "Checked in",
          description: "Your attendance was checked in automatically.",
        });
      } else if (result.action === "checked_out") {
        toast({
          title: "Checked out",
          description: "Your attendance was checked out automatically.",
        });
      }

      // Refresh attendance list after changes
      try {
        const att = await attendanceApi.getByEmployee(user.employeeId);
        setMyAttendance(att.attendance || []);
      } catch {
        // ignore
      }
    } catch (e: any) {
      setAttendanceStatus((s) => ({
        ...s,
        lastEvalAt: new Date().toISOString(),
        lastError: e?.message || "Auto evaluation failed",
      }));
    } finally {
      setEvaluatingAuto(false);
    }
  };

  useEffect(() => {
    if (!user?.employeeId) return;
    if (activeSection !== "overview") return;
    let cancelled = false;
    let timer: number | undefined;

    const tick = async () => {
      if (cancelled) return;
      // Load office config once per session on overview.
      if (!officeLocation) {
        try {
          const res = await attendanceApi.getEmployeeOffice();
          if (!cancelled) setOfficeLocation(res.location);
        } catch {
          // ignore
        }
      }
      await runAutoEvaluate();
      if (cancelled) return;
      timer = window.setTimeout(tick, 60_000);
    };

    // Run once on entering overview.
    tick();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [activeSection, user?.employeeId, officeLocation]);

  const loadEmployeeData = async () => {
    if (!user?.employeeId) return;

    try {
      setLoading(true);
      
      // Load employee profile
      const empRes = await employeeApi.getById(user.employeeId);
      setEmployee(empRes.employee);
      if (empRes.employee.nextOfKin) {
        setNextOfKinName(empRes.employee.nextOfKin.name);
        setNextOfKinRelationship(empRes.employee.nextOfKin.relationship);
        setNextOfKinPhone(empRes.employee.nextOfKin.phone);
        setNextOfKinAddress(empRes.employee.nextOfKin.address);
      }

      // Load leave data
      const leaveRes = await leaveApi.getRequestsForEmployee(user.employeeId);
      setLeaveRequests(leaveRes.leaveRequests);
      const balanceRes = await leaveApi.getBalance(user.employeeId);
      setLeaveBalance(balanceRes.balance);

      // Load payroll
      const payrollRes = await payrollApi.getByEmployee(user.employeeId);
      setPayrolls(payrollRes.payrolls);

      // Load performance
      const perfRes = await performanceApi.getByEmployee(user.employeeId);
      setPerformances(perfRes.performances || []);

      // Load training
      const trainingRes = await trainingApi.getByEmployee(user.employeeId);
      setTrainings(trainingRes.trainings || []);

      // Load discipline/queries
      const discRes = await disciplineApi.getByEmployee(user.employeeId);
      setDisciplines(discRes.disciplines || []);

      const docsRes = await employeeApi.getWorkDocs(user.employeeId);
      setWorkDocs(docsRes);

      const officeRes = await attendanceApi.getEmployeeOffice();
      setOfficeLocation(officeRes.location);
      const attRes = await attendanceApi.getByEmployee(user.employeeId);
      setMyAttendance(attRes.attendance || []);
    } catch (error) {
      console.error("Error loading employee data:", error);
      toast({
        title: "Error",
        description: "Failed to load employee data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadOwnOkr = async () => {
    if (!user?.employeeId || !ownOkrFile) {
      toast({
        title: "Select file",
        description: "Upload your completed OKR file (.xlsx, .xls, .csv).",
        variant: "destructive",
      });
      return;
    }
    const name = ownOkrFile.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls") && !name.endsWith(".csv")) {
      toast({
        title: "Invalid file",
        description: "Only .xlsx, .xls, or .csv is allowed for OKR upload.",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsUploadingOwnOkr(true);
      await employeeApi.uploadOkrSubmission(user.employeeId, ownOkrFile);
      toast({ title: "Uploaded", description: "Your OKR submission was uploaded successfully." });
      setOwnOkrFile(null);
      await loadEmployeeData();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error?.message || "Failed to upload OKR submission",
        variant: "destructive",
      });
    } finally {
      setIsUploadingOwnOkr(false);
    }
  };

  const handleDownloadWorkDoc = async (kind: "job_profile" | "okr_admin" | "okr_employee", fallbackName: string) => {
    if (!user?.employeeId) return;
    try {
      const blob = await employeeApi.downloadWorkDoc(user.employeeId, kind);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fallbackName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error?.message || "Unable to download file.",
        variant: "destructive",
      });
    }
  };

  const handleSubmitLeave = async () => {
    if (!user?.employeeId || !fromDate || !toDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const days = calculateLeaveDays(fromDate, toDate, holidays);
      await leaveApi.createRequest({
        employeeId: user.employeeId,
        type: leaveType,
        from: fromDate,
        to: toDate,
        reason,
      });

      toast({
        title: "Success",
        description: "Leave request submitted successfully",
      });

      setIsLeaveDialogOpen(false);
      setFromDate("");
      setToDate("");
      setReason("");
      await loadEmployeeData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit leave request",
        variant: "destructive",
      });
    }
  };

  const handleUpdateNextOfKin = async () => {
    if (!user?.employeeId || !employee) return;

    try {
      await employeeApi.update(user.employeeId, {
        ...employee,
        nextOfKin: {
          name: nextOfKinName,
          relationship: nextOfKinRelationship,
          phone: nextOfKinPhone,
          address: nextOfKinAddress,
        },
      });

      toast({
        title: "Success",
        description: "Next of kin updated successfully",
      });

      setIsNextOfKinDialogOpen(false);
      await loadEmployeeData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update next of kin",
        variant: "destructive",
      });
    }
  };

  const handlePrintPayslip = (payroll: Payroll) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip - ${payroll.month} ${payroll.year}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .section { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f2f2f2; }
          .total { font-weight: bold; font-size: 1.2em; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>GalaxyITT HR System - NovaHR</h1>
          <h2>Payslip for ${payroll.month} ${payroll.year}</h2>
        </div>
        <div class="info">
          <div>
            <p><strong>Employee:</strong> ${payroll.employee}</p>
            <p><strong>Department:</strong> ${payroll.department}</p>
          </div>
          <div>
            <p><strong>Period:</strong> ${payroll.month} ${payroll.year}</p>
            <p><strong>Status:</strong> ${payroll.status}</p>
          </div>
        </div>
        <div class="section">
          <h3>Earnings</h3>
          <table>
            <tr><th>Item</th><th>Amount</th></tr>
            <tr><td>Basic Salary</td><td>₦${payroll.basicSalary.toLocaleString()}</td></tr>
            ${payroll.allowances.housing ? `<tr><td>Housing Allowance</td><td>₦${payroll.allowances.housing.toLocaleString()}</td></tr>` : ""}
            ${payroll.allowances.transport ? `<tr><td>Transport Allowance</td><td>₦${payroll.allowances.transport.toLocaleString()}</td></tr>` : ""}
            ${payroll.allowances.medical ? `<tr><td>Medical Allowance</td><td>₦${payroll.allowances.medical.toLocaleString()}</td></tr>` : ""}
            ${payroll.allowances.other ? `<tr><td>Other Allowance</td><td>₦${payroll.allowances.other.toLocaleString()}</td></tr>` : ""}
          </table>
        </div>
        <div class="section">
          <h3>Deductions</h3>
          <table>
            <tr><th>Item</th><th>Amount</th></tr>
            <tr><td>Tax</td><td>₦${payroll.deductions.tax.toLocaleString()}</td></tr>
            <tr><td>Pension</td><td>₦${payroll.deductions.pension.toLocaleString()}</td></tr>
            <tr><td>NHIA</td><td>₦${payroll.deductions.nhia.toLocaleString()}</td></tr>
            ${payroll.deductions.loans ? `<tr><td>Loans</td><td>₦${payroll.deductions.loans.toLocaleString()}</td></tr>` : ""}
          </table>
        </div>
        <div class="section">
          <h3 class="total">Net Pay: ₦${payroll.netPay.toLocaleString()}</h3>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user.employeeId) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your account is not linked to an employee record. Please contact HR.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:gap-8 min-h-[calc(100vh-5rem)]">
      <aside className="lg:w-56 shrink-0">
        <div className="lg:sticky lg:top-4 space-y-4 rounded-2xl border border-border/60 bg-card/80 p-3 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-sm font-bold text-[#0c0f14]">
              {user?.initials?.slice(0, 2) || "ME"}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Employee</p>
              <p className="truncate font-medium">{user.name}</p>
            </div>
          </div>
          <nav className="flex flex-row gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {(
              [
                ["overview", "Overview", LayoutDashboard],
                ["profile", "Profile", User],
                ["leave", "Leave", CalendarDays],
                ["payroll", "Payroll", Wallet],
                ["performance", "Performance", LineChart],
                ["training", "Training", GraduationCap],
                ["queries", "Queries", AlertCircle],
                ["account", "Account", KeyRound],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  activeSection === id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>
          <div className="hidden border-t border-border/60 pt-3 lg:block space-y-2 px-1">
            <Link
              to="/forgot-password"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Lock className="h-3.5 w-3.5" /> Forgot password
            </Link>
            <Link
              to="/change-password"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <KeyRound className="h-3.5 w-3.5" /> Change password
            </Link>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1 space-y-6">
        {activeSection === "overview" && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                Welcome back, {user.name}. Here is a snapshot of your HR activity.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pending leave</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{leaveRequests.filter((x) => x.status === "Pending").length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Annual Leave left</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{leaveBalance?.annualLeave ?? "—"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Latest net pay</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {payrolls[0] ? `₦${payrolls[0].netPay.toLocaleString()}` : "—"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Automatic Attendance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="space-y-1">
                    <p className="font-medium">Attendance is automatic</p>
                    <p className="text-xs text-muted-foreground">
                      Device: <span className="font-mono">{deviceId.slice(0, 8)}…</span>
                      {attendanceStatus.lastAccuracyM != null ? ` • GPS accuracy: ${attendanceStatus.lastAccuracyM}m` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last check: {attendanceStatus.lastEvalAt ? new Date(attendanceStatus.lastEvalAt).toLocaleString() : "—"}
                      {" • "}
                      Status: {attendanceStatus.insideZoneId ? "In office zone" : "Outside office zone"}
                    </p>
                    {officeLocation ? (
                      <p className="text-xs text-muted-foreground">
                        Office: <span className="font-medium">{officeLocation.name}</span> • Hours{" "}
                        {(officeLocation as any).openTime ?? "—"}-{(officeLocation as any).closeTime ?? "—"} • TZ{" "}
                        {(officeLocation as any).timeZone ?? "—"}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Office attendance is not configured yet by HR Admin.
                      </p>
                    )}
                    {attendanceStatus.lastError ? (
                      <p className="text-xs text-destructive">{attendanceStatus.lastError}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={runAutoEvaluate} disabled={evaluatingAuto}>
                      {evaluatingAuto ? "Checking..." : "Check now"}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Note: Your browser will ask for location permission. For best results, turn on high-accuracy GPS and keep your
                  connection active.
                </p>
                <div className="rounded-md border p-3">
                  <p className="text-sm font-medium mb-2">My attendance (recent)</p>
                  {myAttendance.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No attendance records yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {myAttendance.slice(0, 7).map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{r.date}</span>
                          <span>
                            {r.checkIn || "-"} → {r.checkOut || "-"} • <span className="font-medium">{r.status}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {activeSection === "profile" && (
          <Card>
            <CardHeader>
              <CardTitle>Profile &amp; Next of Kin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {employee && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{employee.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{employee.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{employee.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium">{employee.department}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Job Title</p>
                    <p className="font-medium">{employee.jobTitle}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Join Date</p>
                    <p className="font-medium">{employee.joinDate}</p>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Next of Kin</h3>
                  <Dialog open={isNextOfKinDialogOpen} onOpenChange={setIsNextOfKinDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        {employee?.nextOfKin ? "Update" : "Add"} Next of Kin
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{employee?.nextOfKin ? "Update" : "Add"} Next of Kin</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Name</Label>
                          <Input value={nextOfKinName} onChange={(e) => setNextOfKinName(e.target.value)} />
                        </div>
                        <div>
                          <Label>Relationship</Label>
                          <Input value={nextOfKinRelationship} onChange={(e) => setNextOfKinRelationship(e.target.value)} />
                        </div>
                        <div>
                          <Label>Phone</Label>
                          <Input value={nextOfKinPhone} onChange={(e) => setNextOfKinPhone(e.target.value)} />
                        </div>
                        <div>
                          <Label>Address</Label>
                          <Textarea value={nextOfKinAddress} onChange={(e) => setNextOfKinAddress(e.target.value)} />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsNextOfKinDialogOpen(false)}>Cancel</Button>
                          <Button onClick={handleUpdateNextOfKin}>Save</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                {employee?.nextOfKin ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{employee.nextOfKin.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Relationship</p>
                      <p className="font-medium">{employee.nextOfKin.relationship}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{employee.nextOfKin.phone}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">{employee.nextOfKin.address}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No next of kin information added yet.</p>
                )}
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Job Profile &amp; OKR</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border p-3 space-y-2">
                    <p className="font-medium">Job Profile</p>
                    {workDocs?.jobProfile ? (
                      <>
                        <p className="text-xs text-muted-foreground">Uploaded: {new Date(workDocs.jobProfile.uploadedDate).toLocaleString()}</p>
                        {workDocs.jobProfile.hasText && (
                          <p className="text-sm whitespace-pre-wrap rounded bg-muted p-2">{workDocs.jobProfile.textContent}</p>
                        )}
                        {workDocs.jobProfile.hasFile && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadWorkDoc("job_profile", workDocs.jobProfile.name || "job-profile")}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No job profile uploaded yet.</p>
                    )}
                  </div>
                  <div className="rounded-md border p-3 space-y-2">
                    <p className="font-medium">OKR Template from Admin</p>
                    {workDocs?.okrTemplate ? (
                      <>
                        <p className="text-xs text-muted-foreground">Uploaded: {new Date(workDocs.okrTemplate.uploadedDate).toLocaleString()}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadWorkDoc("okr_admin", workDocs.okrTemplate.name || "okr-template")}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Template
                        </Button>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No OKR template uploaded yet.</p>
                    )}
                  </div>
                </div>
                <div className="rounded-md border p-3 space-y-3">
                  <p className="font-medium">Upload Your Completed OKR</p>
                  <Input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setOwnOkrFile(e.target.files?.[0] || null)} />
                  <div className="flex gap-2">
                    <Button onClick={handleUploadOwnOkr} disabled={isUploadingOwnOkr}>
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploadingOwnOkr ? "Uploading..." : "Upload My OKR"}
                    </Button>
                    {workDocs?.okrSubmission?.hasFile && (
                      <Button
                        variant="outline"
                        onClick={() => handleDownloadWorkDoc("okr_employee", workDocs.okrSubmission.name || "my-okr")}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download My Last Submission
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeSection === "leave" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Leave Management</CardTitle>
                <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button><Plus className="h-4 w-4 mr-2" />Apply for Leave</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Apply for Leave</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Leave Type</Label>
                        <Select value={leaveType} onValueChange={(v: any) => setLeaveType(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                            <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                            <SelectItem value="Maternity Leave">Maternity Leave</SelectItem>
                            <SelectItem value="Casual Leave">Casual Leave</SelectItem>
                            <SelectItem value="Study Leave">Study Leave</SelectItem>
                            <SelectItem value="Paternity Leave">Paternity Leave</SelectItem>
                            <SelectItem value="Examination Leave">Examination Leave</SelectItem>
                            <SelectItem value="Voluntary/Unpaid Leave">Voluntary/Unpaid Leave</SelectItem>
                            <SelectItem value="Compassionate Leave">Compassionate Leave</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>From Date</Label>
                        <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                      </div>
                      <div>
                        <Label>To Date</Label>
                        <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                      </div>
                      <div>
                        <Label>Reason</Label>
                        <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
                      </div>
                      {leaveBalance && (
                        <div className="text-sm text-muted-foreground">
                          Available: {leaveType === "Annual Leave"
                            ? leaveBalance.annualLeave
                            : leaveType === "Sick Leave"
                            ? leaveBalance.sickLeave
                            : leaveType === "Maternity Leave"
                            ? leaveBalance.maternityLeave
                            : leaveType === "Casual Leave"
                            ? leaveBalance.casualLeave
                            : "N/A"}{" "}
                          days
                        </div>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsLeaveDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSubmitLeave}>Submit</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {leaveBalance && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Annual Leave</p>
                    <p className="text-2xl font-bold">{leaveBalance.annualLeave}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sick Leave</p>
                    <p className="text-2xl font-bold">{leaveBalance.sickLeave}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Maternity Leave</p>
                    <p className="text-2xl font-bold">{leaveBalance.maternityLeave}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Casual Leave</p>
                    <p className="text-2xl font-bold">{leaveBalance.casualLeave}</p>
                  </div>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell>{req.type}</TableCell>
                      <TableCell>{req.from}</TableCell>
                      <TableCell>{req.to}</TableCell>
                      <TableCell>{req.days}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusClass[req.status]}>
                          {req.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeSection === "payroll" && (
          <Card>
            <CardHeader>
              <CardTitle>Payroll &amp; Payslips</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Basic Salary</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrolls.map((payroll) => (
                    <TableRow key={payroll.id}>
                      <TableCell>{payroll.month}</TableCell>
                      <TableCell>{payroll.year}</TableCell>
                      <TableCell>₦{payroll.basicSalary.toLocaleString()}</TableCell>
                      <TableCell>₦{payroll.netPay.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusClass[payroll.status]}>
                          {payroll.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handlePrintPayslip(payroll)}>
                          <Printer className="h-4 w-4 mr-2" />Print
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeSection === "performance" && (
          <Card>
            <CardHeader>
              <CardTitle>Performance &amp; Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              {performances.length > 0 ? (
                <div className="space-y-4">
                  {performances.map((perf) => (
                    <Card key={perf.id}>
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Overall Score</p>
                            <p className="text-2xl font-bold">{perf.overallScore}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Rating</p>
                            <p className="text-lg font-semibold">{perf.rating}</p>
                          </div>
                          {perf.promotion && (
                            <div>
                              <p className="text-sm text-muted-foreground">Promotion</p>
                              <p className="font-medium">{perf.promotion.fromPosition} → {perf.promotion.toPosition}</p>
                              <p className="text-xs text-muted-foreground">{perf.promotion.date}</p>
                            </div>
                          )}
                          {perf.salaryIncrement && (
                            <div>
                              <p className="text-sm text-muted-foreground">Salary Increment</p>
                              <p className="font-medium">₦{perf.salaryIncrement.amount.toLocaleString()} ({perf.salaryIncrement.percentage}%)</p>
                              <p className="text-xs text-muted-foreground">{perf.salaryIncrement.date}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No performance records found.</p>
              )}
            </CardContent>
          </Card>
        )}

        {activeSection === "training" && (
          <Card>
            <CardHeader>
              <CardTitle>Training</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Certification</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainings.map((training) => (
                    <TableRow key={training.id}>
                      <TableCell>{training.title}</TableCell>
                      <TableCell>{training.date}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusClass[training.status]}>
                          {training.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{training.certification ? "Yes" : "No"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeSection === "queries" && (
          <Card>
            <CardHeader>
              <CardTitle>Queries &amp; Discipline</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {disciplines.map((disc) => (
                    <TableRow key={disc.id}>
                      <TableCell>{disc.type}</TableCell>
                      <TableCell>{disc.date}</TableCell>
                      <TableCell>{disc.reason}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusClass[disc.status]}>
                          {disc.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeSection === "account" && (
          <Card>
            <CardHeader>
              <CardTitle>Account security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Manage your password and recovery options.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild variant="default">
                  <Link to="/change-password">Change password</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/forgot-password">Forgot password</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EmployeePortal;
