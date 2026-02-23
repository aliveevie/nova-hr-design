import { Download, FileText, Eye } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePayroll, useEmployees } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV, exportToPDF } from "@/lib/utils/exportUtils";
import { getCurrentMonth, getCurrentYear } from "@/lib/utils/dateUtils";

const statusClass: Record<string, string> = {
  Paid: "bg-success/10 text-success border-0",
  Pending: "bg-warning/10 text-warning border-0",
};

const Payroll = () => {
  const [selectedPayroll, setSelectedPayroll] = useState<string | null>(null);
  const { payrolls, getPayrollByPeriod } = usePayroll();
  const { employees } = useEmployees();
  const { toast } = useToast();

  const month = getCurrentMonth();
  const year = getCurrentYear();
  const currentPayrolls = getPayrollByPeriod(month, year);

  const totalBasic = currentPayrolls.reduce((s, p) => s + p.basicSalary, 0);
  const totalDeductions = currentPayrolls.reduce((s, p) => {
    return s + Object.values(p.deductions).reduce((a, b) => a + (b || 0), 0);
  }, 0);
  const totalNet = currentPayrolls.reduce((s, p) => s + p.netPay, 0);

  const handleExportPayroll = () => {
    const exportData = currentPayrolls.map(p => ({
      Employee: p.employee,
      Department: p.department,
      "Basic Salary": p.basicSalary,
      "Net Pay": p.netPay,
      Status: p.status,
    }));
    exportToCSV(exportData, `payroll-${year}-${month}`);
    toast({
      title: "Export successful",
      description: "Payroll data exported to CSV",
    });
  };

  const handleExportBank = () => {
    const bankData = currentPayrolls
      .filter(p => p.status === "Paid")
      .map(p => ({
        "Employee Name": p.employee,
        "Account Number": "N/A", // Would come from employee bank details
        "Amount": p.netPay,
        "Bank": "N/A",
      }));
    exportToCSV(bankData, `bank-payment-${year}-${month}`);
    toast({
      title: "Bank export successful",
      description: "Bank payment file exported",
    });
  };

  const handleGeneratePayslip = (payrollId: string) => {
    const payroll = currentPayrolls.find(p => p.id === payrollId);
    if (!payroll) return;

    const payslipData = {
      Employee: payroll.employee,
      Department: payroll.department,
      "Basic Salary": payroll.basicSalary,
      Allowances: {
        Housing: payroll.allowances.housing || 0,
        Transport: payroll.allowances.transport || 0,
        Medical: payroll.allowances.medical || 0,
        Other: payroll.allowances.other || 0,
      },
      Deductions: payroll.deductions,
      "Net Pay": payroll.netPay,
      Period: `${month}/${year}`,
    };

    exportToPDF([payslipData], `payslip-${payroll.employee}-${year}-${month}`, "Payslip");
    toast({
      title: "Payslip generated",
      description: "Payslip has been downloaded",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
          <p className="text-muted-foreground">{new Date(parseInt(year), parseInt(month) - 1).toLocaleString("default", { month: "long", year: "numeric" })} payroll summary</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPayroll}>
            <Download className="h-4 w-4 mr-2" />Export Payroll
          </Button>
          <Button variant="outline" onClick={handleExportBank}>
            <Download className="h-4 w-4 mr-2" />Export Bank
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Basic</p>
            <p className="text-2xl font-bold mt-1">${totalBasic.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Deductions</p>
            <p className="text-2xl font-bold mt-1 text-destructive">-${totalDeductions.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Net Pay</p>
            <p className="text-2xl font-bold mt-1 text-success">${totalNet.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Monthly Payroll</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Basic Salary</TableHead>
                  <TableHead className="text-right">Allowances</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentPayrolls.map((p) => {
                  const totalAllowances = (p.allowances.housing || 0) + 
                                         (p.allowances.transport || 0) + 
                                         (p.allowances.medical || 0) + 
                                         (p.allowances.other || 0);
                  const totalDeductions = Object.values(p.deductions).reduce((a, b) => a + (b || 0), 0);
                  
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.employee}</TableCell>
                      <TableCell>{p.department}</TableCell>
                      <TableCell className="text-right">${p.basicSalary.toLocaleString()}</TableCell>
                      <TableCell className="text-right">${totalAllowances.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-destructive">-${totalDeductions.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-semibold">${p.netPay.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusClass[p.status]}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog open={selectedPayroll === p.id} onOpenChange={(open) => {
                          if (!open) setSelectedPayroll(null);
                          else setSelectedPayroll(p.id);
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Payslip Details - {p.employee}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Basic Salary</p>
                                  <p className="text-lg font-semibold">${p.basicSalary.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Net Pay</p>
                                  <p className="text-lg font-semibold text-success">${p.netPay.toLocaleString()}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-sm font-semibold mb-2">Allowances</p>
                                <div className="space-y-1">
                                  {p.allowances.housing && (
                                    <div className="flex justify-between text-sm">
                                      <span>Housing</span>
                                      <span>${p.allowances.housing.toLocaleString()}</span>
                                    </div>
                                  )}
                                  {p.allowances.transport && (
                                    <div className="flex justify-between text-sm">
                                      <span>Transport</span>
                                      <span>${p.allowances.transport.toLocaleString()}</span>
                                    </div>
                                  )}
                                  {p.allowances.medical && (
                                    <div className="flex justify-between text-sm">
                                      <span>Medical</span>
                                      <span>${p.allowances.medical.toLocaleString()}</span>
                                    </div>
                                  )}
                                  {p.allowances.other && (
                                    <div className="flex justify-between text-sm">
                                      <span>Other</span>
                                      <span>${p.allowances.other.toLocaleString()}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="text-sm font-semibold mb-2">Deductions</p>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span>Tax</span>
                                    <span className="text-destructive">-${p.deductions.tax.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>Pension</span>
                                    <span className="text-destructive">-${p.deductions.pension.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>NHIA</span>
                                    <span className="text-destructive">-${p.deductions.nhia.toLocaleString()}</span>
                                  </div>
                                  {p.deductions.loans && (
                                    <div className="flex justify-between text-sm">
                                      <span>Loans</span>
                                      <span className="text-destructive">-${p.deductions.loans.toLocaleString()}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <Button
                                onClick={() => handleGeneratePayslip(p.id)}
                                className="w-full"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                Generate Payslip PDF
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Payroll;
