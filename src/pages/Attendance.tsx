import { Clock, Edit, Calendar } from "lucide-react";
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
import { formatDate, getCurrentMonth, getCurrentYear } from "@/lib/utils/dateUtils";
import { attendanceApi, OfficeLocationDto } from "@/lib/api/attendance.api";

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
  const [officeForm, setOfficeForm] = useState({
    id: "" as string | "",
    name: "",
    centerLat: "",
    centerLng: "",
    radiusM: "60",
    maxAccuracyM: "50",
    exitGraceSeconds: "300",
    openTime: "",
    closeTime: "",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    enabled: true,
  });
  
  const { attendanceRecords, updateAttendance, getAttendanceByDate, refreshAttendance } = useAttendance();
  const { employees } = useEmployees();
  const { toast } = useToast();

  const todayRecords = getAttendanceByDate(selectedDate);
  const departments = Array.from(new Set(employees.map((e) => e.department))).filter(Boolean);

  const rows = useMemo(() => {
    const byEmp = new Map(todayRecords.map((r) => [r.employeeId, r]));
    const all = employees.map((e) => {
      const rec = byEmp.get(e.id);
      if (rec) return rec;
      return {
        id: `missing-${e.id}`,
        employeeId: e.id,
        employee: e.name,
        date: selectedDate,
        checkIn: "-",
        checkOut: "-",
        status: "Absent" as const,
        department: e.department,
      };
    });
    const deptFiltered =
      selectedDept === "all"
        ? all
        : all.filter((r) => String(r.department || "").toLowerCase() === selectedDept.toLowerCase());
    return deptFiltered;
  }, [employees, selectedDate, selectedDept, todayRecords]);

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
        if (!cancelled) setOfficeLocations(res.locations || []);
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
                placeholder="e.g. Africa/Lagos"
              />
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
                if (!officeForm.openTime || !officeForm.closeTime) {
                  toast({
                    title: "Office hours required",
                    description: "Set opening and closing time before saving.",
                    variant: "destructive",
                  });
                  return;
                }
                if (!officeForm.timeZone) {
                  toast({
                    title: "Time zone required",
                    description: "Set a time zone (e.g. Africa/Lagos) before saving.",
                    variant: "destructive",
                  });
                  return;
                }
                try {
                  setLoadingOffices(true);
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
                    openTime: officeForm.openTime,
                    closeTime: officeForm.closeTime,
                    timeZone: officeForm.timeZone,
                    enabled: officeForm.enabled,
                  });
                  const refreshed = await attendanceApi.offices.list();
                  setOfficeLocations(refreshed.locations || []);
                  setOfficeForm((s) => ({ ...s, id: "", name: "" }));
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
                {loadingOffices ? "Loading..." : "No office locations configured yet."}
              </p>
            ) : (
              <div className="space-y-2">
                {[officeLocations[0]].map((loc) => (
                  <div key={loc.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{loc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {loc.centerLat.toFixed(6)}, {loc.centerLng.toFixed(6)} • radius {loc.radiusM}m • max accuracy{" "}
                        {loc.maxAccuracyM}m • grace {loc.exitGraceSeconds}s • hours {(loc as any).openTime ?? "00:00"}-{(loc as any).closeTime ?? "23:59"}
                      </p>
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
                            openTime: (loc as any).openTime || "",
                            closeTime: (loc as any).closeTime || "",
                            timeZone: (loc as any).timeZone || (Intl.DateTimeFormat().resolvedOptions().timeZone || ""),
                            enabled: loc.enabled,
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
                ))}
              </div>
            )}
          </div>
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
            <Calendar className="h-5 w-5" />
            Monthly Summary - {formatDate(`${getCurrentYear()}-${getCurrentMonth()}-01`)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{summary.totalDays}</p>
              <p className="text-sm text-muted-foreground">Total Days</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-success">{summary.present}</p>
              <p className="text-sm text-muted-foreground">Present</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-warning">{summary.late}</p>
              <p className="text-sm text-muted-foreground">Late</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">{summary.absent}</p>
              <p className="text-sm text-muted-foreground">Absent</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-info">{summary.onLeave}</p>
              <p className="text-sm text-muted-foreground">On Leave</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance;
