import { Clock, Edit, Calendar } from "lucide-react";
import { useState } from "react";
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
  
  const { attendanceRecords, addAttendance, updateAttendance, getAttendanceByDate } = useAttendance();
  const { employees } = useEmployees();
  const { toast } = useToast();

  const todayRecords = getAttendanceByDate(selectedDate);
  const filteredRecords = selectedDept === "all" 
    ? todayRecords 
    : todayRecords.filter(r => r.department.toLowerCase() === selectedDept.toLowerCase());

  const present = todayRecords.filter((r) => r.status === "Present").length;
  const late = todayRecords.filter((r) => r.status === "Late").length;
  const absent = todayRecords.filter((r) => r.status === "Absent").length;
  const onLeave = todayRecords.filter((r) => r.status === "On Leave").length;

  const departments = Array.from(new Set(employees.map(e => e.department)));

  const handleCheckIn = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5);
    const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 0);
    
    const existing = todayRecords.find(r => r.employeeId === employeeId);
    if (existing) {
      updateAttendance(existing.id, {
        checkIn: timeStr,
        status: isLate ? "Late" : "Present",
      });
      toast({
        title: "Checked in",
        description: `Checked in at ${timeStr}`,
      });
    } else {
      addAttendance({
        employeeId,
        employee: employee.name,
        date: selectedDate,
        checkIn: timeStr,
        checkOut: "-",
        status: isLate ? "Late" : "Present",
        department: employee.department,
      });
      toast({
        title: "Checked in",
        description: `Checked in at ${timeStr}`,
      });
    }
  };

  const handleCheckOut = (employeeId: string) => {
    const existing = todayRecords.find(r => r.employeeId === employeeId);
    if (!existing) {
      toast({
        title: "Error",
        description: "Please check in first",
        variant: "destructive",
      });
      return;
    }

    const now = new Date();
    const timeStr = now.toTimeString().slice(0, 5);
    
    updateAttendance(existing.id, {
      checkOut: timeStr,
    });
    toast({
      title: "Checked out",
      description: `Checked out at ${timeStr}`,
    });
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
          ["Present", present, "bg-success/10 text-success"],
          ["Late", late, "bg-warning/10 text-warning"],
          ["Absent", absent, "bg-destructive/10 text-destructive"],
          ["On Leave", onLeave, "bg-info/10 text-info"]
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
                {filteredRecords.map((r) => {
                  const employee = employees.find(e => e.id === r.employeeId);
                  const hasCheckedIn = r.checkIn !== "-";
                  const hasCheckedOut = r.checkOut !== "-";
                  
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
                          <Dialog open={editingRecord === r.id} onOpenChange={(open) => {
                            if (!open) {
                              setEditingRecord(null);
                              setCheckInTime("");
                              setCheckOutTime("");
                              setStatus("Present");
                            } else {
                              setEditingRecord(r.id);
                              setCheckInTime(r.checkIn);
                              setCheckOutTime(r.checkOut);
                              setStatus(r.status);
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon">
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
