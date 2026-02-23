import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, Building, Calendar, Edit, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEmployees, useAttendance, usePayroll, usePerformance } from "@/lib/store";
import { EmployeeForm } from "@/components/forms/EmployeeForm";
import { useState } from "react";

const statusClass: Record<string, string> = {
  Active: "bg-success/10 text-success border-0",
  "On Leave": "bg-warning/10 text-warning border-0",
  Inactive: "bg-muted text-muted-foreground border-0",
};

const EmployeeDetail = () => {
  const { id } = useParams();
  const { getEmployee, updateEmployee } = useEmployees();
  const { getAttendanceByEmployee } = useAttendance();
  const { getPayrollByEmployee } = usePayroll();
  const { getPerformanceByEmployee } = usePerformance();
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  const employee = id ? getEmployee(id) : undefined;
  
  if (!employee) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/employees"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Employee Not Found</h1>
        </div>
      </div>
    );
  }

  const attendanceRecords = getAttendanceByEmployee(employee.id);
  const payrollRecords = getPayrollByEmployee(employee.id);
  const performance = getPerformanceByEmployee(employee.id);
  
  const presentCount = attendanceRecords.filter(a => a.status === "Present").length;
  const absentCount = attendanceRecords.filter(a => a.status === "Absent").length;
  const lateCount = attendanceRecords.filter(a => a.status === "Late").length;
  
  const latestPayroll = payrollRecords[0];
  
  const handleUpdate = (data: any) => {
    updateEmployee(employee.id, data);
    setIsEditOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/employees"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Employee Details</h1>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">{employee.initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <div>
                  <h2 className="text-xl font-bold">{employee.name}</h2>
                  <p className="text-muted-foreground">{employee.jobTitle}</p>
                  <Badge variant="secondary" className={`mt-2 ${statusClass[employee.status]}`}>{employee.status}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4 shrink-0" />{employee.email}</span>
                  <span className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4 shrink-0" />{employee.phone}</span>
                  <span className="flex items-center gap-2 text-muted-foreground"><Building className="h-4 w-4 shrink-0" />{employee.department}</span>
                  <span className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4 shrink-0" />Joined {employee.joinDate}</span>
                </div>
              </div>
            </div>
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Employee</DialogTitle>
                </DialogHeader>
                <EmployeeForm employee={employee} onSubmit={handleUpdate} onCancel={() => setIsEditOpen(false)} />
              </DialogContent>
            </Dialog>
            <Button onClick={() => setIsEditOpen(true)}><Edit className="h-4 w-4 mr-2" />Edit</Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="personal">
        <TabsList>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card className="shadow-sm"><CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div><p className="text-sm text-muted-foreground">Full Name</p><p className="font-medium mt-1">{employee.name}</p></div>
              <div><p className="text-sm text-muted-foreground">Email</p><p className="font-medium mt-1">{employee.email}</p></div>
              <div><p className="text-sm text-muted-foreground">Phone</p><p className="font-medium mt-1">{employee.phone}</p></div>
              <div><p className="text-sm text-muted-foreground">Date of Birth</p><p className="font-medium mt-1">{employee.dateOfBirth || "N/A"}</p></div>
              <div><p className="text-sm text-muted-foreground">Gender</p><p className="font-medium mt-1">{employee.gender || "N/A"}</p></div>
              <div><p className="text-sm text-muted-foreground">Address</p><p className="font-medium mt-1">{employee.address || "N/A"}</p></div>
              <div><p className="text-sm text-muted-foreground">Department</p><p className="font-medium mt-1">{employee.department}</p></div>
              <div><p className="text-sm text-muted-foreground">Job Title</p><p className="font-medium mt-1">{employee.jobTitle}</p></div>
              <div><p className="text-sm text-muted-foreground">Grade</p><p className="font-medium mt-1">{employee.grade || "N/A"}</p></div>
              <div><p className="text-sm text-muted-foreground">Level</p><p className="font-medium mt-1">{employee.level || "N/A"}</p></div>
              <div><p className="text-sm text-muted-foreground">Join Date</p><p className="font-medium mt-1">{employee.joinDate}</p></div>
              <div><p className="text-sm text-muted-foreground">Status</p><p className="font-medium mt-1">{employee.status}</p></div>
              <div><p className="text-sm text-muted-foreground">Employee ID</p><p className="font-medium mt-1">EMP-{employee.id.padStart(4, "0")}</p></div>
              <div><p className="text-sm text-muted-foreground">Salary</p><p className="font-medium mt-1">${employee.salary.toLocaleString()}</p></div>
            </div>
            {employee.nextOfKin && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4">Next of Kin</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><p className="text-sm text-muted-foreground">Name</p><p className="font-medium mt-1">{employee.nextOfKin.name}</p></div>
                  <div><p className="text-sm text-muted-foreground">Relationship</p><p className="font-medium mt-1">{employee.nextOfKin.relationship}</p></div>
                  <div><p className="text-sm text-muted-foreground">Phone</p><p className="font-medium mt-1">{employee.nextOfKin.phone}</p></div>
                  <div><p className="text-sm text-muted-foreground">Address</p><p className="font-medium mt-1">{employee.nextOfKin.address}</p></div>
                </div>
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card className="shadow-sm"><CardContent className="p-6">
            {employee.documents && employee.documents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employee.documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell><Badge variant="secondary">{doc.type}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{doc.uploadedDate}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-8">No documents uploaded</p>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card className="shadow-sm"><CardContent className="p-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-success/10 rounded-lg text-center"><p className="text-2xl font-bold text-success">{presentCount}</p><p className="text-sm text-muted-foreground">Present</p></div>
              <div className="p-4 bg-destructive/10 rounded-lg text-center"><p className="text-2xl font-bold text-destructive">{absentCount}</p><p className="text-sm text-muted-foreground">Absent</p></div>
              <div className="p-4 bg-warning/10 rounded-lg text-center"><p className="text-2xl font-bold text-warning">{lateCount}</p><p className="text-sm text-muted-foreground">Late</p></div>
            </div>
            {attendanceRecords.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceRecords.slice(0, 10).map((att) => (
                    <TableRow key={att.id}>
                      <TableCell>{att.date}</TableCell>
                      <TableCell>{att.checkIn}</TableCell>
                      <TableCell>{att.checkOut}</TableCell>
                      <TableCell><Badge variant="secondary" className={statusClass[att.status]}>{att.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">No attendance records</p>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="payroll">
          <Card className="shadow-sm"><CardContent className="p-6">
            {latestPayroll ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Basic Salary</p><p className="text-2xl font-bold">${latestPayroll.basicSalary.toLocaleString()}</p></div>
                  <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Total Deductions</p><p className="text-2xl font-bold text-destructive">-${Object.values(latestPayroll.deductions).reduce((a, b) => a + (b || 0), 0).toLocaleString()}</p></div>
                  <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Net Pay</p><p className="text-2xl font-bold text-success">${latestPayroll.netPay.toLocaleString()}</p></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Allowances</h4>
                    <div className="space-y-2">
                      {latestPayroll.allowances.housing && <div className="flex justify-between"><span className="text-muted-foreground">Housing</span><span>${latestPayroll.allowances.housing.toLocaleString()}</span></div>}
                      {latestPayroll.allowances.transport && <div className="flex justify-between"><span className="text-muted-foreground">Transport</span><span>${latestPayroll.allowances.transport.toLocaleString()}</span></div>}
                      {latestPayroll.allowances.medical && <div className="flex justify-between"><span className="text-muted-foreground">Medical</span><span>${latestPayroll.allowances.medical.toLocaleString()}</span></div>}
                      {latestPayroll.allowances.other && <div className="flex justify-between"><span className="text-muted-foreground">Other</span><span>${latestPayroll.allowances.other.toLocaleString()}</span></div>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Deductions</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${latestPayroll.deductions.tax.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Pension</span><span>${latestPayroll.deductions.pension.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">NHIA</span><span>${latestPayroll.deductions.nhia.toLocaleString()}</span></div>
                      {latestPayroll.deductions.loans && <div className="flex justify-between"><span className="text-muted-foreground">Loans</span><span>${latestPayroll.deductions.loans.toLocaleString()}</span></div>}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Basic Salary</p><p className="text-2xl font-bold">${employee.salary.toLocaleString()}</p></div>
                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Deductions</p><p className="text-2xl font-bold text-destructive">-${Math.round(employee.salary * 0.2).toLocaleString()}</p></div>
                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Net Pay</p><p className="text-2xl font-bold text-success">${Math.round(employee.salary * 0.8).toLocaleString()}</p></div>
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card className="shadow-sm"><CardContent className="p-6 space-y-5">
            {performance ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="font-medium">Goals Achievement</span><span className="text-muted-foreground">{performance.goals}%</span></div>
                  <Progress value={performance.goals} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="font-medium">Teamwork</span><span className="text-muted-foreground">{performance.teamwork}%</span></div>
                  <Progress value={performance.teamwork} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="font-medium">Communication</span><span className="text-muted-foreground">{performance.communication}%</span></div>
                  <Progress value={performance.communication} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="font-medium">Overall Score</span><span className="text-muted-foreground">{performance.overallScore}%</span></div>
                  <Progress value={performance.overallScore} className="h-2" />
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Rating: <Badge variant="secondary">{performance.rating}</Badge></p>
                  {performance.promotion && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground">Promotion: {performance.promotion.fromPosition} → {performance.promotion.toPosition} on {performance.promotion.date}</p>
                    </div>
                  )}
                  {performance.salaryIncrement && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground">Salary Increment: ${performance.salaryIncrement.amount.toLocaleString()} ({performance.salaryIncrement.percentage}%) on {performance.salaryIncrement.date}</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-8">No performance data available</p>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeDetail;
