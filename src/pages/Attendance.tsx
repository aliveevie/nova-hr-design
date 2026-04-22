import { Clock, Edit, MapPin, Download, FileBarChart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAttendance, useEmployees } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { getCurrentMonth, getCurrentYear } from "@/lib/utils/dateUtils";
import { attendanceApi, OfficeLocationDto } from "@/lib/api/attendance.api";
import {
  exportAttendanceReport,
  REPORT_EXPORT_FORMAT_LABELS,
  type ReportExportFormat,
} from "@/lib/reportExport";

const statusClass: Record<string, string> = {
  Present: "bg-success/10 text-success border-0",
  Late: "bg-warning/10 text-warning border-0",
  Absent: "bg-destructive/10 text-destructive border-0",
  "On Leave": "bg-info/10 text-info border-0",
};

const Attendance = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedDept, setSelectedDept] = useState("all");
  const [editingRecord, setEditingRecord] = useState<string | null>(null);
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [status, setStatus] = useState<"Present" | "Late" | "Absent" | "On Leave">("Present");
  const [officeLocations, setOfficeLocations] = useState<OfficeLocationDto[]>([]);
  const [loadingOffices, setLoadingOffices] = useState(false);
  const [currentIp, setCurrentIp] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNowTick(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const [officeForm, setOfficeForm] = useState({
    id: "" as string | "",
    name: "",
    centerLat: "",
    centerLng: "",
    radiusM: "100",
    maxAccuracyM: "200",
    exitGraceSeconds: "300",
    enabled: true,
    // Comma/newline-separated list of office public IPs, CIDRs, or prefixes.
    allowedIps: "",
    // Comma/newline-separated list of office Wi-Fi SSIDs (e.g. "galaxy-itt").
    allowedSsids: "",
  });
  // Dedicated, independent form for office hours. Kept separate so admins can
  // update hours without risking accidental edits to geofence/IP/SSID.
  const [hoursForm, setHoursForm] = useState({
    id: "" as string | "",
    openTime: "",
    closeTime: "",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Lagos",
  });
  const [savingHours, setSavingHours] = useState(false);

  // --- Attendance report ---------------------------------------------------
  const todayIso = new Date().toISOString().slice(0, 10);
  const firstOfMonthIso = (() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  })();
  const [reportFrom, setReportFrom] = useState(firstOfMonthIso);
  const [reportTo, setReportTo] = useState(todayIso);
  const [reportDept, setReportDept] = useState<string>("all");
  const [reportLoading, setReportLoading] = useState(false);
  type ReportData = Awaited<ReturnType<typeof attendanceApi.getReport>>;
  const [report, setReport] = useState<ReportData | null>(null);
  const [reportExportFormat, setReportExportFormat] =
    useState<ReportExportFormat>("xlsx");
  
  const { attendanceRecords, updateAttendance, getAttendanceByDate, refreshAttendance } = useAttendance();
  const { employees } = useEmployees();
  const { toast } = useToast();

  const todayRecords = getAttendanceByDate(selectedDate);
  const departments = Array.from(new Set(employees.map((e) => e.department))).filter(Boolean);

  // Only show staff who actually checked in for the selected day. The admin
  // does not need a synthetic "Absent" row per employee — the stats cards at
  // the top already surface the absent headcount, and the report section
  // provides the full breakdown. This keeps the daily table focused on real
  // attendance events the admin can act on.
  const rows = useMemo(() => {
    const deptFiltered =
      selectedDept === "all"
        ? todayRecords
        : todayRecords.filter(
            (r) =>
              String(r.department || "").toLowerCase() ===
              selectedDept.toLowerCase()
          );
    return deptFiltered.filter(
      (r) => r.checkIn && r.checkIn !== "-" && r.status !== "Absent"
    );
  }, [selectedDept, todayRecords]);

  const stats = useMemo(() => {
    const byEmp = new Map(todayRecords.map((r) => [r.employeeId, r]));
    let present = 0;
    let late = 0;
    let onLeave = 0;
    let absent = 0;
    for (const e of employees) {
      const rec = byEmp.get(e.id);
      const st = rec?.status ?? "Absent";
      if (st === "Present") present++;
      else if (st === "Late") late++;
      else if (st === "On Leave") onLeave++;
      else absent++;
    }
    return { present, late, onLeave, absent };
  }, [employees, todayRecords]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingOffices(true);
        const res = await attendanceApi.offices.list();
        if (!cancelled) {
          setOfficeLocations(res.locations || []);
          setCurrentIp(res.currentIp ?? null);
          const first = res.locations?.[0];
          if (first) {
            setHoursForm((s) => ({
              id: first.id,
              openTime: (first as any).openTime || s.openTime || "",
              closeTime: (first as any).closeTime || s.closeTime || "",
              timeZone:
                (first as any).timeZone || s.timeZone || "Africa/Lagos",
            }));
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          toast({
            title: "Could not load office locations",
            description: "Please refresh and try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoadingOffices(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const handleCheckIn = async (employeeId: string) => {
    try {
      await attendanceApi.checkIn(employeeId);
      await refreshAttendance();
      toast({ title: "Checked in", description: "Attendance check-in recorded." });
    } catch (e: any) {
      toast({
        title: "Check-in failed",
        description: e?.message || "Could not check in.",
        variant: "destructive",
      });
    }
  };

  const handleCheckOut = async (employeeId: string) => {
    try {
      await attendanceApi.checkOut(employeeId);
      await refreshAttendance();
      toast({ title: "Checked out", description: "Attendance check-out recorded." });
    } catch (e: any) {
      toast({
        title: "Check-out failed",
        description: e?.message || "Could not check out.",
        variant: "destructive",
      });
    }
  };

  const handleManualOverride = (recordId: string) => {
    const record = attendanceRecords.find(r => r.id === recordId);
    if (!record) return;

    updateAttendance(recordId, {
      checkIn: checkInTime || record.checkIn,
      checkOut: checkOutTime || record.checkOut,
      status,
    });
    
    setEditingRecord(null);
    setCheckInTime("");
    setCheckOutTime("");
    setStatus("Present");
    
    toast({
      title: "Attendance updated",
      description: "Manual override applied",
    });
  };

  const monthlySummary = () => {
    const month = getCurrentMonth();
    const year = getCurrentYear();
    const monthRecords = attendanceRecords.filter(r => {
      const recordDate = new Date(r.date);
      return recordDate.getMonth() + 1 === parseInt(month) && 
             String(recordDate.getFullYear()) === year;
    });

    return {
      totalDays: monthRecords.length,
      present: monthRecords.filter(r => r.status === "Present").length,
      late: monthRecords.filter(r => r.status === "Late").length,
      absent: monthRecords.filter(r => r.status === "Absent").length,
      onLeave: monthRecords.filter(r => r.status === "On Leave").length,
    };
  };

  const summary = monthlySummary();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground">Daily attendance tracking</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["Present", stats.present, "bg-success/10 text-success"],
          ["Late", stats.late, "bg-warning/10 text-warning"],
          ["Absent", stats.absent, "bg-destructive/10 text-destructive"],
          ["On Leave", stats.onLeave, "bg-info/10 text-info"]
        ].map(([label, count, cls]) => (
          <Card key={label} className="shadow-sm">
            <CardContent className={`p-5 text-center rounded-lg`}>
              <p className={`text-3xl font-bold ${cls.split(" ")[1]}`}>{count}</p>
              <p className="text-sm text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Office Locations (Geofence)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Employees can only auto-check-in/out from registered devices when GPS accuracy is within the configured limit.
            Use 20–50m for mobile-only offices and 150–300m if staff also use laptops (Wi-Fi geolocation is much less precise).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={officeForm.name}
                onChange={(e) => setOfficeForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="HQ - Reception"
              />
            </div>
            <div className="space-y-2">
              <Label>Latitude</Label>
              <Input
                value={officeForm.centerLat}
                onChange={(e) => setOfficeForm((s) => ({ ...s, centerLat: e.target.value }))}
                placeholder="9.0765"
              />
            </div>
            <div className="space-y-2">
              <Label>Longitude</Label>
              <Input
                value={officeForm.centerLng}
                onChange={(e) => setOfficeForm((s) => ({ ...s, centerLng: e.target.value }))}
                placeholder="7.3986"
              />
            </div>
            <div className="space-y-2">
              <Label>Radius (m)</Label>
              <Input
                value={officeForm.radiusM}
                onChange={(e) => setOfficeForm((s) => ({ ...s, radiusM: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Max GPS accuracy (m)</Label>
              <Input
                value={officeForm.maxAccuracyM}
                onChange={(e) => setOfficeForm((s) => ({ ...s, maxAccuracyM: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Exit grace (seconds)</Label>
              <Input
                value={officeForm.exitGraceSeconds}
                onChange={(e) => setOfficeForm((s) => ({ ...s, exitGraceSeconds: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-3">
              <div className="flex items-center justify-between gap-2">
                <Label>Office network IPs (recommended)</Label>
                {currentIp ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setOfficeForm((s) => {
                        const existing = s.allowedIps
                          .split(/[\s,]+/)
                          .map((x) => x.trim())
                          .filter(Boolean);
                        if (existing.includes(currentIp!)) return s;
                        return {
                          ...s,
                          allowedIps: [...existing, currentIp!].join(", "),
                        };
                      });
                    }}
                  >
                    Add my current IP ({currentIp})
                  </Button>
                ) : null}
              </div>
              <Input
                value={officeForm.allowedIps}
                onChange={(e) =>
                  setOfficeForm((s) => ({ ...s, allowedIps: e.target.value }))
                }
                placeholder="e.g. 102.89.40.12, 102.89.40.0/24, 102.89.40.*"
              />
              <p className="text-xs text-muted-foreground">
                Staff connecting from any of these IPs will be auto-checked-in even when
                browser GPS is unreliable. Supports exact IPs, CIDR ranges, and
                <span className="font-mono"> prefix.*</span> patterns. This signal is
                identical across every browser and device.
              </p>
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label>Office Wi-Fi names (SSIDs)</Label>
              <Input
                value={officeForm.allowedSsids}
                onChange={(e) =>
                  setOfficeForm((s) => ({ ...s, allowedSsids: e.target.value }))
                }
                placeholder="e.g. galaxy-itt, galaxy-itt-5G, galaxy-guest"
              />
              <p className="text-xs text-muted-foreground">
                Publish the Wi-Fi network names your office uses. Employees pick
                theirs with one tap in their portal — matching is case-insensitive
                and works identically across every browser, phone, and laptop.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!navigator.geolocation) {
                  toast({
                    title: "Geolocation unavailable",
                    description: "Your browser does not support geolocation.",
                    variant: "destructive",
                  });
                  return;
                }
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setOfficeForm((s) => ({
                      ...s,
                      centerLat: String(pos.coords.latitude),
                      centerLng: String(pos.coords.longitude),
                    }));
                    toast({ title: "Location captured", description: "Latitude/longitude filled from your device." });
                  },
                  () => {
                    toast({
                      title: "Permission denied",
                      description: "Allow location access to capture coordinates.",
                      variant: "destructive",
                    });
                  },
                  { enableHighAccuracy: true, timeout: 15000 }
                );
              }}
            >
              Use my current location
            </Button>
            <Button
              type="button"
              disabled={loadingOffices}
              onClick={async () => {
                const centerLat = Number(officeForm.centerLat);
                const centerLng = Number(officeForm.centerLng);
                const radiusM = Number(officeForm.radiusM);
                const maxAccuracyM = Number(officeForm.maxAccuracyM);
                const exitGraceSeconds = Number(officeForm.exitGraceSeconds);
                if (!officeForm.name.trim() || !Number.isFinite(centerLat) || !Number.isFinite(centerLng)) {
                  toast({
                    title: "Missing data",
                    description: "Name, latitude and longitude are required.",
                    variant: "destructive",
                  });
                  return;
                }
                try {
                  setLoadingOffices(true);
                  const allowedIps = officeForm.allowedIps
                    .split(/[\s,]+/)
                    .map((x) => x.trim())
                    .filter(Boolean);
                  const allowedSsids = officeForm.allowedSsids
                    .split(/[,\n]+/)
                    .map((x) => x.trim())
                    .filter(Boolean);
                  const existingHours = officeLocations.find(
                    (x) => x.id === (officeForm.id || "")
                  );
                  const res = await attendanceApi.offices.upsert({
                    id: officeForm.id || undefined,
                    name: officeForm.name.trim(),
                    centerLat,
                    centerLng,
                    radiusM,
                    maxAccuracyM,
                    entryBufferM: 0,
                    exitBufferM: 0,
                    exitGraceSeconds,
                    // Preserve existing hours when updating location-only fields.
                    // New offices get safe defaults; hours are edited in the
                    // dedicated "Office hours" card below.
                    openTime:
                      existingHours?.openTime || hoursForm.openTime || "00:00",
                    closeTime:
                      existingHours?.closeTime || hoursForm.closeTime || "23:59",
                    timeZone:
                      existingHours?.timeZone ||
                      hoursForm.timeZone ||
                      "Africa/Lagos",
                    enabled: officeForm.enabled,
                    allowedIps,
                    allowedSsids,
                  });
                  const refreshed = await attendanceApi.offices.list();
                  setOfficeLocations(refreshed.locations || []);
                  setCurrentIp(refreshed.currentIp ?? currentIp);
                  setOfficeForm((s) => ({
                    ...s,
                    id: "",
                    name: "",
                    allowedIps: "",
                    allowedSsids: "",
                  }));
                  toast({ title: "Saved", description: `Office location “${res.location.name}” saved.` });
                } catch (e: any) {
                  toast({
                    title: "Save failed",
                    description: e?.message || "Could not save office location.",
                    variant: "destructive",
                  });
                } finally {
                  setLoadingOffices(false);
                }
              }}
            >
              {officeLocations.length > 0 ? "Update office location" : "Save office location"}
            </Button>
          </div>
          <div className="space-y-2">
            {officeLocations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {loadingOffices ? "Loading..." : "No office location configured yet. Use the form above to add one."}
              </p>
            ) : (
              (() => {
                const loc = officeLocations[0];
                const tz = (loc as any).timeZone || undefined;
                let tzNow = "—";
                try {
                  tzNow = nowTick.toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                    timeZone: tz,
                  });
                } catch {
                  tzNow = nowTick.toLocaleTimeString();
                }
                return (
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-md border p-3">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium truncate">{loc.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="font-mono">
                          {loc.centerLat.toFixed(6)}, {loc.centerLng.toFixed(6)}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Hours {(loc as any).openTime ?? "00:00"}–{(loc as any).closeTime ?? "23:59"}
                        {tz ? ` • ${tz}` : ""} • now <span className="font-mono font-medium">{tzNow}</span>
                      </p>
                      {(loc as any).allowedIps && (loc as any).allowedIps.length > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Office network:{" "}
                          <span className="font-mono">
                            {((loc as any).allowedIps as string[]).join(", ")}
                          </span>
                          {currentIp && ((loc as any).allowedIps as string[]).includes(currentIp) ? (
                            <span className="text-success"> • you are on it now</span>
                          ) : null}
                        </p>
                      ) : currentIp ? (
                        <p className="text-xs text-warning">
                          No office IPs set. Your current IP is{" "}
                          <span className="font-mono">{currentIp}</span> — click
                          "Add my current IP" above to make check-in work reliably across
                          all browsers.
                        </p>
                      ) : null}
                      {(loc as any).allowedSsids && (loc as any).allowedSsids.length > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Office Wi-Fi:{" "}
                          <span className="font-mono">
                            {((loc as any).allowedSsids as string[]).join(", ")}
                          </span>
                        </p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setOfficeForm({
                            id: loc.id,
                            name: loc.name,
                            centerLat: String(loc.centerLat),
                            centerLng: String(loc.centerLng),
                            radiusM: String(loc.radiusM),
                            maxAccuracyM: String(loc.maxAccuracyM),
                            exitGraceSeconds: String(loc.exitGraceSeconds),
                            enabled: loc.enabled,
                            allowedIps: ((loc as any).allowedIps || []).join(", "),
                            allowedSsids: ((loc as any).allowedSsids || []).join(", "),
                          })
                        }
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                          try {
                            await attendanceApi.offices.delete(loc.id);
                            const refreshed = await attendanceApi.offices.list();
                            setOfficeLocations(refreshed.locations || []);
                            toast({ title: "Deleted", description: "Office location removed." });
                          } catch (e: any) {
                            toast({
                              title: "Delete failed",
                              description: e?.message || "Could not delete office location.",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Office hours
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Set the daily working window per office location. Employees are
            automatically checked in during this window and checked out at the
            close time.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {officeLocations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Save an office location above first, then set its hours here.
            </p>
          ) : (
            <>
              {officeLocations.length > 1 ? (
                <div className="space-y-2">
                  <Label>Office location</Label>
                  <Select
                    value={hoursForm.id}
                    onValueChange={(v) => {
                      const loc = officeLocations.find((x) => x.id === v);
                      setHoursForm({
                        id: v,
                        openTime: (loc as any)?.openTime || "",
                        closeTime: (loc as any)?.closeTime || "",
                        timeZone: (loc as any)?.timeZone || "Africa/Lagos",
                      });
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-96">
                      <SelectValue placeholder="Select an office" />
                    </SelectTrigger>
                    <SelectContent>
                      {officeLocations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Office:{" "}
                  <span className="font-medium text-foreground">
                    {officeLocations[0].name}
                  </span>
                </p>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Open time</Label>
                  <Input
                    type="time"
                    value={hoursForm.openTime}
                    onChange={(e) =>
                      setHoursForm((s) => ({ ...s, openTime: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Close time</Label>
                  <Input
                    type="time"
                    value={hoursForm.closeTime}
                    onChange={(e) =>
                      setHoursForm((s) => ({ ...s, closeTime: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time zone</Label>
                  <Input
                    value={hoursForm.timeZone}
                    onChange={(e) =>
                      setHoursForm((s) => ({ ...s, timeZone: e.target.value }))
                    }
                    placeholder="e.g. Africa/Lagos"
                  />
                </div>
              </div>

              <Button
                type="button"
                disabled={savingHours}
                onClick={async () => {
                  if (!hoursForm.id) {
                    toast({
                      title: "Select an office",
                      description: "Pick which office these hours apply to.",
                      variant: "destructive",
                    });
                    return;
                  }
                  if (!hoursForm.openTime || !hoursForm.closeTime) {
                    toast({
                      title: "Hours required",
                      description: "Set both open and close time.",
                      variant: "destructive",
                    });
                    return;
                  }
                  if (!hoursForm.timeZone) {
                    toast({
                      title: "Time zone required",
                      description: "Enter a valid IANA time zone.",
                      variant: "destructive",
                    });
                    return;
                  }
                  try {
                    setSavingHours(true);
                    await attendanceApi.offices.updateHours(hoursForm.id, {
                      openTime: hoursForm.openTime,
                      closeTime: hoursForm.closeTime,
                      timeZone: hoursForm.timeZone,
                    });
                    const refreshed = await attendanceApi.offices.list();
                    setOfficeLocations(refreshed.locations || []);
                    toast({ title: "Hours updated" });
                  } catch (e: any) {
                    toast({
                      title: "Update failed",
                      description: e?.message || "Could not update hours.",
                      variant: "destructive",
                    });
                  } finally {
                    setSavingHours(false);
                  }
                }}
              >
                {savingHours ? "Saving…" : "Save hours"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-48"
              />
            </div>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept.toLowerCase()}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-sm text-muted-foreground py-8"
                    >
                      No staff have checked in yet for {selectedDate}.
                    </TableCell>
                  </TableRow>
                ) : null}
                {rows.map((r) => {
                  const hasCheckedIn = r.checkIn !== "-";
                  const hasCheckedOut = r.checkOut !== "-";
                  const isMissing = String(r.id).startsWith("missing-");
                  
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.employee}</TableCell>
                      <TableCell>{r.department}</TableCell>
                      <TableCell>{r.checkIn}</TableCell>
                      <TableCell>{r.checkOut}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusClass[r.status]}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!hasCheckedIn && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCheckIn(r.employeeId)}
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Check In
                            </Button>
                          )}
                          {hasCheckedIn && !hasCheckedOut && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCheckOut(r.employeeId)}
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Check Out
                            </Button>
                          )}
                          <Dialog open={!isMissing && editingRecord === r.id} onOpenChange={(open) => {
                            if (!open) {
                              setEditingRecord(null);
                              setCheckInTime("");
                              setCheckOutTime("");
                              setStatus("Present");
                            } else {
                              if (isMissing) return;
                              setEditingRecord(r.id);
                              setCheckInTime(r.checkIn);
                              setCheckOutTime(r.checkOut);
                              setStatus(r.status);
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={isMissing}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Manual Override - {r.employee}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label>Check In</Label>
                                  <Input
                                    type="time"
                                    value={checkInTime}
                                    onChange={(e) => setCheckInTime(e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Check Out</Label>
                                  <Input
                                    type="time"
                                    value={checkOutTime}
                                    onChange={(e) => setCheckOutTime(e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Status</Label>
                                  <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Present">Present</SelectItem>
                                      <SelectItem value="Late">Late</SelectItem>
                                      <SelectItem value="Absent">Absent</SelectItem>
                                      <SelectItem value="On Leave">On Leave</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button onClick={() => handleManualOverride(r.id)} className="w-full">
                                  Update Attendance
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
          <p className="text-sm text-muted-foreground">
            Run a report over any date range, then pick the file type you need
            (Excel, PDF, or CSV) and download summary, line-level detail, or a
            single Excel workbook with both sheets.
          </p>
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
                onClick={async () => {
                  if (!reportFrom || !reportTo) return;
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
                      description: e?.message || "Could not load report.",
                      variant: "destructive",
                    });
                  } finally {
                    setReportLoading(false);
                  }
                }}
                className="w-full"
              >
                {reportLoading ? "Loading…" : "Run report"}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              {
                label: "Today",
                from: todayIso,
                to: todayIso,
              },
              {
                label: "This week",
                from: (() => {
                  const d = new Date();
                  const day = (d.getDay() + 6) % 7; // Monday = 0
                  d.setDate(d.getDate() - day);
                  return d.toISOString().slice(0, 10);
                })(),
                to: todayIso,
              },
              {
                label: "This month",
                from: firstOfMonthIso,
                to: todayIso,
              },
              {
                label: "Last 30 days",
                from: (() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 29);
                  return d.toISOString().slice(0, 10);
                })(),
                to: todayIso,
              },
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
                <div className="text-center rounded-md border p-3">
                  <p className="text-2xl font-bold">
                    {report.totals.present +
                      report.totals.late +
                      report.totals.absent +
                      report.totals.onLeave}
                  </p>
                  <p className="text-sm text-muted-foreground">Records</p>
                </div>
                <div className="text-center rounded-md border p-3">
                  <p className="text-2xl font-bold text-success">
                    {report.totals.present}
                  </p>
                  <p className="text-sm text-muted-foreground">Present</p>
                </div>
                <div className="text-center rounded-md border p-3">
                  <p className="text-2xl font-bold text-warning">
                    {report.totals.late}
                  </p>
                  <p className="text-sm text-muted-foreground">Late</p>
                </div>
                <div className="text-center rounded-md border p-3">
                  <p className="text-2xl font-bold text-destructive">
                    {report.totals.absent}
                  </p>
                  <p className="text-sm text-muted-foreground">Absent</p>
                </div>
                <div className="text-center rounded-md border p-3">
                  <p className="text-2xl font-bold text-info">
                    {report.totals.onLeave}
                  </p>
                  <p className="text-sm text-muted-foreground">On Leave</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
                <div className="space-y-2 w-full sm:w-56">
                  <Label>Export file type</Label>
                  <Select
                    value={reportExportFormat}
                    onValueChange={(v) =>
                      setReportExportFormat(v as ReportExportFormat)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(REPORT_EXPORT_FORMAT_LABELS) as ReportExportFormat[]).map(
                        (key) => (
                          <SelectItem key={key} value={key}>
                            {REPORT_EXPORT_FORMAT_LABELS[key]}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const r = exportAttendanceReport(
                        report,
                        "summary",
                        reportExportFormat
                      );
                      if (!r.ok) {
                        toast({
                          title: "Export",
                          description: r.message,
                          variant: "destructive",
                        });
                        return;
                      }
                      toast({
                        title: "Download started",
                        description: `Summary (${REPORT_EXPORT_FORMAT_LABELS[reportExportFormat]}).`,
                      });
                    }}
                  >
                    <Download className="h-3 w-3 mr-1" /> Summary
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const r = exportAttendanceReport(
                        report,
                        "detail",
                        reportExportFormat
                      );
                      if (!r.ok) {
                        toast({
                          title: "Export",
                          description: r.message,
                          variant: "destructive",
                        });
                        return;
                      }
                      toast({
                        title: "Download started",
                        description: `Detail (${REPORT_EXPORT_FORMAT_LABELS[reportExportFormat]}).`,
                      });
                    }}
                  >
                    <Download className="h-3 w-3 mr-1" /> Detail
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={reportExportFormat !== "xlsx"}
                    title={
                      reportExportFormat !== "xlsx"
                        ? "Switch export type to Excel to download one workbook with both tables."
                        : undefined
                    }
                    onClick={() => {
                      const r = exportAttendanceReport(
                        report,
                        "workbook",
                        reportExportFormat
                      );
                      if (!r.ok) {
                        toast({
                          title: "Export",
                          description: r.message,
                          variant: "destructive",
                        });
                        return;
                      }
                      toast({
                        title: "Download started",
                        description: "Excel workbook with Summary and Detail sheets.",
                      });
                    }}
                  >
                    <Download className="h-3 w-3 mr-1" /> Both (one Excel)
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Days</TableHead>
                      <TableHead className="text-right">Present</TableHead>
                      <TableHead className="text-right">Late</TableHead>
                      <TableHead className="text-right">Absent</TableHead>
                      <TableHead className="text-right">On Leave</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.byEmployee.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-sm text-muted-foreground py-8"
                        >
                          No employees found for this filter.
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {report.byEmployee.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.name}</TableCell>
                        <TableCell>{e.department || "—"}</TableCell>
                        <TableCell className="text-right">
                          {e.daysTracked}
                        </TableCell>
                        <TableCell className="text-right text-success">
                          {e.present}
                        </TableCell>
                        <TableCell className="text-right text-warning">
                          {e.late}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          {e.absent}
                        </TableCell>
                        <TableCell className="text-right text-info">
                          {e.onLeave}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Choose a range and click “Run report” to generate the summary.
            </p>
          )}

          {/* Fallback legacy summary (kept hidden once report has rendered). */}
          {!report && summary ? (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 pt-2 opacity-70">
              <div className="text-center">
                <p className="text-2xl font-bold">{summary.totalDays}</p>
                <p className="text-sm text-muted-foreground">This month</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-success">
                  {summary.present}
                </p>
                <p className="text-sm text-muted-foreground">Present</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-warning">
                  {summary.late}
                </p>
                <p className="text-sm text-muted-foreground">Late</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-destructive">
                  {summary.absent}
                </p>
                <p className="text-sm text-muted-foreground">Absent</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-info">
                  {summary.onLeave}
                </p>
                <p className="text-sm text-muted-foreground">On Leave</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance;
