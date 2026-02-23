import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { leaveRequests } from "@/lib/mockData";

const statusClass: Record<string, string> = {
  Approved: "bg-success/10 text-success border-0",
  Pending: "bg-warning/10 text-warning border-0",
  Rejected: "bg-destructive/10 text-destructive border-0",
};

const LeaveManagement = () => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
        <p className="text-muted-foreground">Manage leave requests and balances</p>
      </div>
      <Dialog>
        <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Apply Leave</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Leave Application</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual Leave</SelectItem>
                  <SelectItem value="sick">Sick Leave</SelectItem>
                  <SelectItem value="personal">Personal Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>From</Label><Input type="date" /></div>
              <div className="space-y-2"><Label>To</Label><Input type="date" /></div>
            </div>
            <div className="space-y-2"><Label>Reason</Label><Textarea placeholder="Reason for leave..." /></div>
            <Button className="w-full">Submit Request</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {([["Annual Leave", "12 / 20 days", "60%"], ["Sick Leave", "3 / 10 days", "30%"], ["Personal Leave", "1 / 5 days", "20%"]] as string[][]).map(([type, balance, pct]) => (
        <Card key={type} className="shadow-sm"><CardContent className="p-5">
          <p className="text-sm text-muted-foreground">{type}</p>
          <p className="text-2xl font-bold mt-1">{balance}</p>
          <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: pct }} />
          </div>
        </CardContent></Card>
      ))}
    </div>

    <Card className="shadow-sm">
      <CardHeader className="pb-3"><CardTitle className="text-lg">Leave History</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Days</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {leaveRequests.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.employee}</TableCell>
                  <TableCell>{l.type}</TableCell>
                  <TableCell>{l.from}</TableCell>
                  <TableCell>{l.to}</TableCell>
                  <TableCell>{l.days}</TableCell>
                  <TableCell><Badge variant="secondary" className={statusClass[l.status]}>{l.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default LeaveManagement;
