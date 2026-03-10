import { useEffect, useState } from "react";
import { useAuth } from "@/lib/store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import { Printer, Plus } from "lucide-react";
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
    <div className="space-y-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Employee Self-Service Portal</h1>
        <p className="text-muted-foreground mt-1">
          Welcome, {user.name}. Manage your personal information and view your HR records.
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Your Portal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This is your personal employee portal. You can apply for leave, view your payroll, 
            performance reviews, training records, and queries. You can also update your next of kin information.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="queries">Queries</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave">
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
        </TabsContent>

        <TabsContent value="payroll">
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
        </TabsContent>

        <TabsContent value="performance">
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
        </TabsContent>

        <TabsContent value="training">
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
        </TabsContent>

        <TabsContent value="queries">
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeePortal;
