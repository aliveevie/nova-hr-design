import { Plus, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useLeave, useHoliday, useEmployees, useAuth } from "@/lib/store";
import { LeaveRequest } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { calculateLeaveDays, getLeaveBalanceForType } from "@/lib/utils/leaveUtils";

const statusClass: Record<string, string> = {
  Approved: "bg-success/10 text-success border-0",
  Pending: "bg-warning/10 text-warning border-0",
  Rejected: "bg-destructive/10 text-destructive border-0",
};

const LeaveManagement = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveRequest["type"]>("Annual Leave");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  
  const { user } = useAuth();
  const { leaveRequests, leaveBalances, addLeaveRequest, updateLeaveRequest, getLeaveBalance, updateLeaveBalance } = useLeave();
  const { holidays } = useHoliday();
  const { employees } = useEmployees();
  const { toast } = useToast();

  const currentEmployee = employees.find(e => e.email === user?.email);
  const employeeBalance = currentEmployee ? getLeaveBalance(currentEmployee.id) : undefined;

  const handleSubmitLeave = () => {
    if (!currentEmployee) {
      toast({
        title: "Error",
        description: "Employee not found",
        variant: "destructive",
      });
      return;
    }

    if (!fromDate || !toDate) {
      toast({
        title: "Error",
        description: "Please select dates",
        variant: "destructive",
      });
      return;
    }

    const days = calculateLeaveDays(fromDate, toDate, holidays);
    const balance = getLeaveBalanceForType(employeeBalance, leaveType);

    if (days > balance) {
      toast({
        title: "Insufficient balance",
        description: `You only have ${balance} days remaining for ${leaveType}`,
        variant: "destructive",
      });
      return;
    }

    addLeaveRequest({
      employeeId: currentEmployee.id,
      employee: currentEmployee.name,
      type: leaveType,
      from: fromDate,
      to: toDate,
      days,
      status: "Pending",
      reason,
    });

    setIsDialogOpen(false);
    setFromDate("");
    setToDate("");
    setReason("");
    
    toast({
      title: "Leave request submitted",
      description: "Your leave request has been submitted for approval",
    });
  };

  const handleApprove = (id: string, employeeId: string, leaveType: LeaveRequest["type"], days: number) => {
    updateLeaveRequest(id, { status: "Approved" });
    const balance = getLeaveBalance(employeeId);
    if (balance) {
      const updated = { ...balance };
      switch (leaveType) {
        case "Annual Leave":
          updated.annualLeave = Math.max(0, updated.annualLeave - days);
          break;
        case "Sick Leave":
          updated.sickLeave = Math.max(0, updated.sickLeave - days);
          break;
        case "Maternity Leave":
          updated.maternityLeave = Math.max(0, updated.maternityLeave - days);
          break;
        case "Casual Leave":
          updated.casualLeave = Math.max(0, updated.casualLeave - days);
          break;
      }
      updateLeaveBalance(employeeId, updated);
    }
    toast({
      title: "Leave approved",
      description: "Leave request has been approved",
    });
  };

  const handleReject = (id: string) => {
    updateLeaveRequest(id, { status: "Rejected" });
    toast({
      title: "Leave rejected",
      description: "Leave request has been rejected",
    });
  };

  const leaveTypes = [
    { type: "Annual Leave" as const, total: 20, balance: employeeBalance?.annualLeave || 0 },
    { type: "Sick Leave" as const, total: 10, balance: employeeBalance?.sickLeave || 0 },
    { type: "Maternity Leave" as const, total: 90, balance: employeeBalance?.maternityLeave || 0 },
    { type: "Casual Leave" as const, total: 5, balance: employeeBalance?.casualLeave || 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground">Manage leave requests and balances</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Apply Leave</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Leave Application</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Leave Type</Label>
                <Select value={leaveType} onValueChange={(v) => setLeaveType(v as LeaveRequest["type"])}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Annual Leave">Annual Leave</SelectItem>
                    <SelectItem value="Sick Leave">Sick Leave</SelectItem>
                    <SelectItem value="Maternity Leave">Maternity Leave</SelectItem>
                    <SelectItem value="Casual Leave">Casual Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From</Label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
              </div>
              {fromDate && toDate && (
                <div className="text-sm text-muted-foreground">
                  Working days: {calculateLeaveDays(fromDate, toDate, holidays)} days
                </div>
              )}
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  placeholder="Reason for leave..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <Button onClick={handleSubmitLeave} className="w-full">Submit Request</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {leaveTypes.map(({ type, total, balance }) => {
          const used = total - balance;
          const percentage = total > 0 ? (used / total) * 100 : 0;
          return (
            <Card key={type} className="shadow-sm">
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{type}</p>
                <p className="text-2xl font-bold mt-1">{balance} / {total} days</p>
                <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Leave History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveRequests.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.employee}</TableCell>
                    <TableCell>{l.type}</TableCell>
                    <TableCell>{l.from}</TableCell>
                    <TableCell>{l.to}</TableCell>
                    <TableCell>{l.days}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusClass[l.status]}>
                        {l.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {l.status === "Pending" && user?.role === "HR Admin" && (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(l.id, l.employeeId, l.type, l.days)}
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(l.id)}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                      {l.reason && (
                        <div className="text-xs text-muted-foreground mt-1">{l.reason}</div>
                      )}
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

export default LeaveManagement;
