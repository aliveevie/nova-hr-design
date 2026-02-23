import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { attendanceRecords } from "@/lib/mockData";

const statusClass: Record<string, string> = {
  Present: "bg-success/10 text-success border-0",
  Late: "bg-warning/10 text-warning border-0",
  Absent: "bg-destructive/10 text-destructive border-0",
  "On Leave": "bg-info/10 text-info border-0",
};

const Attendance = () => {
  const present = attendanceRecords.filter((r) => r.status === "Present").length;
  const late = attendanceRecords.filter((r) => r.status === "Late").length;
  const absent = attendanceRecords.filter((r) => r.status === "Absent").length;
  const onLeave = attendanceRecords.filter((r) => r.status === "On Leave").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground">Daily attendance tracking</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {([["Present", present, "bg-success/10 text-success"], ["Late", late, "bg-warning/10 text-warning"], ["Absent", absent, "bg-destructive/10 text-destructive"], ["On Leave", onLeave, "bg-info/10 text-info"]] as [string, number, string][]).map(([label, count, cls]) => (
          <Card key={label} className="shadow-sm"><CardContent className={`p-5 text-center rounded-lg`}>
            <p className={`text-3xl font-bold ${cls.split(" ")[1]}`}>{count}</p><p className="text-sm text-muted-foreground mt-1">{label}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle className="text-lg">Today's Attendance — Feb 23, 2026</CardTitle>
            <Select defaultValue="all">
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="engineering">Engineering</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="hr">Human Resources</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Employee</TableHead><TableHead>Department</TableHead><TableHead>Check In</TableHead><TableHead>Check Out</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {attendanceRecords.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.employee}</TableCell>
                    <TableCell>{r.department}</TableCell>
                    <TableCell>{r.checkIn}</TableCell>
                    <TableCell>{r.checkOut}</TableCell>
                    <TableCell><Badge variant="secondary" className={statusClass[r.status]}>{r.status}</Badge></TableCell>
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

export default Attendance;
