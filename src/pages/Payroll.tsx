import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { payrollData } from "@/lib/mockData";

const statusClass: Record<string, string> = {
  Paid: "bg-success/10 text-success border-0",
  Pending: "bg-warning/10 text-warning border-0",
};

const totalBasic = payrollData.reduce((s, p) => s + p.basicSalary, 0);
const totalDeductions = payrollData.reduce((s, p) => s + p.deductions, 0);
const totalNet = payrollData.reduce((s, p) => s + p.netPay, 0);

const Payroll = () => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
        <p className="text-muted-foreground">February 2026 payroll summary</p>
      </div>
      <Button variant="outline"><Download className="h-4 w-4 mr-2" />Export Payroll</Button>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="shadow-sm"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total Basic</p><p className="text-2xl font-bold mt-1">${totalBasic.toLocaleString()}</p></CardContent></Card>
      <Card className="shadow-sm"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total Deductions</p><p className="text-2xl font-bold mt-1 text-destructive">-${totalDeductions.toLocaleString()}</p></CardContent></Card>
      <Card className="shadow-sm"><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total Net Pay</p><p className="text-2xl font-bold mt-1 text-success">${totalNet.toLocaleString()}</p></CardContent></Card>
    </div>

    <Card className="shadow-sm">
      <CardHeader className="pb-3"><CardTitle className="text-lg">Monthly Payroll</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Employee</TableHead><TableHead>Department</TableHead><TableHead className="text-right">Basic Salary</TableHead><TableHead className="text-right">Deductions</TableHead><TableHead className="text-right">Net Pay</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {payrollData.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.employee}</TableCell>
                  <TableCell>{p.department}</TableCell>
                  <TableCell className="text-right">${p.basicSalary.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-destructive">-${p.deductions.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-semibold">${p.netPay.toLocaleString()}</TableCell>
                  <TableCell><Badge variant="secondary" className={statusClass[p.status]}>{p.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default Payroll;
