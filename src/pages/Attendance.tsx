import { Clock, Download, FileBarChart, Play, Square, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useEmployees } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import {
  attendanceApi,
  DailyAttendanceResponse,
  OfficeSettingsDto,
} from "@/lib/api/attendance.api";
import {
  exportAttendanceReport,
  REPORT_EXPORT_FORMAT_LABELS,
  type ReportExportFormat,
} from "@/lib/reportExport";
import { FingerprintAttendancePanel } from "@/components/FingerprintAttendancePanel";

const statusClass: Record<string, string> = {
  Present: "bg-success/10 text-success border-0",
  Late: "bg-warning/10 text-warning border-0",
  Absent: "bg-destructive/10 text-destructive border-0",
  "On Leave": "bg-info/10 text-info border-0",
  Yet: "bg-muted text-muted-foreground border-0",
};

const Attendance = () => {
  const todayIso = new Date().toISOString().slice(0, 10);
  const firstOfMonthIso = (() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  })();

  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [selectedDept, setSelectedDept] = useState("all");
  const [daily, setDaily] = useState<DailyAttendanceResponse | null>(null);
  const [loadingDaily, setLoadingDaily] = useState(true);
  const [office, setOffice] = useState<OfficeSettingsDto | null>(null);
  const [savingOffice, setSavingOffice] = useState(false);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [nowTick, setNowTick] = useState(() => new Date());

  const [officeForm, setOfficeForm] = useState({
    id: "" as string | "",
    name: "",
    openTime: "09:00",
    closeTime: "17:00",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Lagos",
    autoStartEnabled: true,
  });

  const [reportFrom, setReportFrom] = useState(firstOfMonthIso);
  const [reportTo, setReportTo] = useState(todayIso);
  const [reportDept, setReportDept] = useState("all");
  const [reportLoading, setReportLoading] = useState(false);
  type ReportData = Awaited<ReturnType<typeof attendanceApi.getReport>>;
  const [report, setReport] = useState<ReportData | null>(null);
  const [reportExportFormat, setReportExportFormat] = useState<ReportExportFormat>("xlsx");

  const { employees } = useEmployees();
  const { toast } = useToast();

  const departments = useMemo(
    () => Array.from(new Set(employees.map((e) => e.department))).filter(Boolean),
    [employees]
  );

  useEffect(() => {
    const t = window.setInterval(() => setNowTick(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const loadDaily = useCallback(async () => {
    try {
      setLoadingDaily(true);
      const data = await attendanceApi.getDaily(selectedDate, selectedDept);
      setDaily(data);
    } catch (e: any) {
      toast({
        title: "Could not load attendance",
        description: e?.message || "Please refresh and try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingDaily(false);
    }
  }, [selectedDate, selectedDept, toast]);

  const loadOffice = useCallback(async () => {
    try {
      const res = await attendanceApi.offices.list();
      const loc = res.locations?.[0] ?? null;
      setOffice(loc);
      if (loc) {
        setOfficeForm({
          id: loc.id,
          name: loc.name,
          openTime: loc.openTime || "09:00",
          closeTime: loc.closeTime || "17:00",
          timeZone: loc.timeZone || "Africa/Lagos",
          autoStartEnabled: loc.autoStartEnabled !== false,
        });
      }
    } catch {
      /* office optional on first visit */
    }
  }, []);

  useEffect(() => {
    loadDaily();
  }, [loadDaily]);

  useEffect(() => {
    loadOffice();
  }, [loadOffice]);

  // Refresh session state every minute when viewing today
  useEffect(() => {
    if (selectedDate !== todayIso) return;
    const t = window.setInterval(() => loadDaily(), 60_000);
    return () => window.clearInterval(t);
  }, [selectedDate, todayIso, loadDaily]);

  const stats = daily?.stats ?? { present: 0, late: 0, absent: 0, onLeave: 0, yet: 0 };
  const session = daily?.session;
  const rows = daily?.employees ?? [];

  const officeNow = (() => {
    const tz = officeForm.timeZone || session?.timeZone;
    try {
      return nowTick.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: tz,
      });
    } catch {
      return nowTick.toLocaleTimeString();
    }
  })();

  const saveOfficeSettings = async () => {
    if (!officeForm.name.trim()) {
      toast({ title: "Office name required", variant: "destructive" });
      return;
    }
    try {
      setSavingOffice(true);
      const res = await attendanceApi.offices.saveSettings({
        id: officeForm.id || undefined,
        name: officeForm.name.trim(),
        openTime: officeForm.openTime,
        closeTime: officeForm.closeTime,
        timeZone: officeForm.timeZone,
        autoStartEnabled: officeForm.autoStartEnabled,
      });
      setOffice(res.location);
      setOfficeForm((s) => ({ ...s, id: res.location.id }));
      await loadDaily();
      toast({ title: "Office settings saved" });
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e?.message || "Could not save settings.",
        variant: "destructive",
      });
    } finally {
      setSavingOffice(false);
    }
  };

  const startSession = async () => {
    try {
      setSessionBusy(true);
      await attendanceApi.session.start();
      await loadDaily();
      toast({ title: "Attendance started", description: "Staff can check in now." });
    } catch (e: any) {
      toast({
        title: "Could not start",
        description: e?.message || "Save office settings first.",
        variant: "destructive",
      });
    } finally {
      setSessionBusy(false);
    }
  };

  const stopSession = async () => {
    try {
      setSessionBusy(true);
      await attendanceApi.session.stop();
      await loadDaily();
      toast({ title: "Manual session stopped" });
    } catch (e: any) {
      toast({
        title: "Could not stop",
        description: e?.message,
        variant: "destructive",
      });
    } finally {
      setSessionBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground">Daily attendance tracking for your team</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          ["Scanned today", rows.length, "text-foreground"],
          ["Present", stats.present, "text-success"],
          ["Late", stats.late, "text-warning"],
        ].map(([label, count, cls]) => (
          <Card key={label as string} className="shadow-sm">
            <CardContent className="p-5 text-center">
              <p className={`text-3xl font-bold ${cls}`}>{count}</p>
              <p className="text-sm text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Attendance session
          </CardTitle>
          <CardDescription>
            Start manually or enable auto-start at your office open time. Attendance closes at close time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant={session?.isOpen ? "default" : "secondary"}
              className={session?.isOpen ? "bg-success text-success-foreground" : ""}
            >
              {session?.isOpen
                ? session.mode === "manual"
                  ? "Open — started by admin"
                  : "Open — auto (office hours)"
                : "Closed"}
            </Badge>
            {session?.message && (
              <span className="text-sm text-muted-foreground">{session.message}</span>
            )}
            {session?.timeZone && (
              <span className="text-sm font-mono text-muted-foreground ml-auto">
                {officeNow} · {session.timeZone}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={startSession} disabled={sessionBusy || session?.isOpen}>
              <Play className="h-4 w-4 mr-2" />
              Start attendance
            </Button>
            <Button variant="outline" onClick={stopSession} disabled={sessionBusy}>
              <Square className="h-4 w-4 mr-2" />
              Stop manual session
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 pt-2 border-t">
            <div className="space-y-2">
              <Label>Office name</Label>
              <Input
                value={officeForm.name}
                onChange={(e) => setOfficeForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="HQ — Main office"
              />
            </div>
            <div className="space-y-2">
              <Label>Open time</Label>
              <Input
                type="time"
                value={officeForm.openTime}
                onChange={(e) => setOfficeForm((s) => ({ ...s, openTime: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Close time</Label>
              <Input
                type="time"
                value={officeForm.closeTime}
                onChange={(e) => setOfficeForm((s) => ({ ...s, closeTime: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Time zone</Label>
              <Input
                value={officeForm.timeZone}
                onChange={(e) => setOfficeForm((s) => ({ ...s, timeZone: e.target.value }))}
                placeholder="Africa/Lagos"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="auto-start"
                checked={officeForm.autoStartEnabled}
                onCheckedChange={(v) => setOfficeForm((s) => ({ ...s, autoStartEnabled: v }))}
              />
              <Label htmlFor="auto-start" className="cursor-pointer">
                Auto-start at open time ({officeForm.openTime})
              </Label>
            </div>
            <Button onClick={saveOfficeSettings} disabled={savingOffice}>
              {savingOffice ? "Saving…" : "Save office settings"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <FingerprintAttendancePanel onScanComplete={() => loadDaily()} />

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Fingerprint check-ins
            </CardTitle>
            <div className="flex flex-wrap gap-3">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-44"
              />
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept.toLowerCase()}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <CardDescription>
            Only staff who scanned their finger on this date appear here. Admins cannot check anyone in
            or out manually — attendance is scanner-only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Check in</TableHead>
                  <TableHead>Check out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingDaily ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No fingerprint check-ins for {selectedDate}. Staff appear here only after a
                      successful scanner capture.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.attendanceId || r.employeeId}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell>{r.department || "—"}</TableCell>
                      <TableCell>{r.checkIn || "—"}</TableCell>
                      <TableCell>{r.checkOut || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusClass[r.status] || ""}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground capitalize">
                        {r.source || "fingerprint"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileBarChart className="h-5 w-5" />
            Attendance reports
          </CardTitle>
          <CardDescription>
            Run a report over any date range and export to Excel, PDF, or CSV.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <Label>From</Label>
              <Input
                type="date"
                value={reportFrom}
                max={reportTo}
                onChange={(e) => setReportFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input
                type="date"
                value={reportTo}
                min={reportFrom}
                onChange={(e) => setReportTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={reportDept} onValueChange={setReportDept}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                disabled={reportLoading}
                className="w-full"
                onClick={async () => {
                  try {
                    setReportLoading(true);
                    const data = await attendanceApi.getReport({
                      from: reportFrom,
                      to: reportTo,
                      department: reportDept,
                    });
                    setReport(data);
                  } catch (e: any) {
                    toast({
                      title: "Report failed",
                      description: e?.message,
                      variant: "destructive",
                    });
                  } finally {
                    setReportLoading(false);
                  }
                }}
              >
                {reportLoading ? "Loading…" : "Run report"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { label: "Today", from: todayIso, to: todayIso },
              {
                label: "This week",
                from: (() => {
                  const d = new Date();
                  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
                  return d.toISOString().slice(0, 10);
                })(),
                to: todayIso,
              },
              { label: "This month", from: firstOfMonthIso, to: todayIso },
            ].map((q) => (
              <Button
                key={q.label}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setReportFrom(q.from);
                  setReportTo(q.to);
                }}
              >
                {q.label}
              </Button>
            ))}
          </div>

          {report ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  ["Records", report.totals.present + report.totals.late + report.totals.absent + report.totals.onLeave, ""],
                  ["Present", report.totals.present, "text-success"],
                  ["Late", report.totals.late, "text-warning"],
                  ["Absent", report.totals.absent, "text-destructive"],
                  ["On Leave", report.totals.onLeave, "text-info"],
                ].map(([label, count, cls]) => (
                  <div key={label as string} className="text-center rounded-md border p-3">
                    <p className={`text-2xl font-bold ${cls}`}>{count}</p>
                    <p className="text-sm text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 items-end">
                <Select
                  value={reportExportFormat}
                  onValueChange={(v) => setReportExportFormat(v as ReportExportFormat)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(REPORT_EXPORT_FORMAT_LABELS) as ReportExportFormat[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {REPORT_EXPORT_FORMAT_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(["summary", "detail", "workbook"] as const).map((kind) => (
                  <Button
                    key={kind}
                    size="sm"
                    variant="outline"
                    disabled={kind === "workbook" && reportExportFormat !== "xlsx"}
                    onClick={() => {
                      const r = exportAttendanceReport(report, kind, reportExportFormat);
                      if (!r.ok) {
                        toast({ title: "Export", description: r.message, variant: "destructive" });
                        return;
                      }
                      toast({ title: "Download started" });
                    }}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    {kind === "workbook" ? "Both (Excel)" : kind}
                  </Button>
                ))}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Present</TableHead>
                    <TableHead className="text-right">Late</TableHead>
                    <TableHead className="text-right">Absent</TableHead>
                    <TableHead className="text-right">On Leave</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.byEmployee.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell>{e.department || "—"}</TableCell>
                      <TableCell className="text-right text-success">{e.present}</TableCell>
                      <TableCell className="text-right text-warning">{e.late}</TableCell>
                      <TableCell className="text-right text-destructive">{e.absent}</TableCell>
                      <TableCell className="text-right text-info">{e.onLeave}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Choose a range and click Run report.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance;
