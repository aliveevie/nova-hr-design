import { CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLeave, useEmployees, useAuth } from "@/lib/store";
import { LeaveRequest } from "@/types";
import { useToast } from "@/hooks/use-toast";

const statusClass: Record<string, string> = {
  Approved: "bg-success/10 text-success border-0",
  Pending: "bg-warning/10 text-warning border-0",
  Rejected: "bg-destructive/10 text-destructive border-0",
};

const LeaveManagement = () => {
  const { user } = useAuth();
  const { leaveRequests, leaveBalances, updateLeaveRequest, refreshLeaveRequests } = useLeave();
  const { employees } = useEmployees();
  const { toast } = useToast();

  const handleApprove = async (id: string, employeeId: string, leaveType: LeaveRequest["type"], days: number) => {
    try {
      await updateLeaveRequest(id, "Approved");
      
      // Refresh leave requests to get updated data
      await refreshLeaveRequests();
      
      toast({
        title: "Leave approved",
        description: "Leave request has been approved",
      });
    } catch (error) {
      console.error("Error approving leave:", error);
      toast({
        title: "Error",
        description: "Failed to approve leave request",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateLeaveRequest(id, "Rejected");
      
      // Refresh leave requests
      await refreshLeaveRequests();
      
      toast({
        title: "Leave rejected",
        description: "Leave request has been rejected",
      });
    } catch (error) {
      console.error("Error rejecting leave:", error);
      toast({
        title: "Error",
        description: "Failed to reject leave request",
        variant: "destructive",
      });
    }
  };

  // Leave type cards - showing standard allocations
  const leaveTypes = [
    { type: "Annual Leave" as const, total: 20, balance: 0 },
    { type: "Sick Leave" as const, total: 10, balance: 0 },
    { type: "Maternity Leave" as const, total: 90, balance: 0 },
    { type: "Casual Leave" as const, total: 5, balance: 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground">Manage leave requests and balances</p>
        </div>
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
