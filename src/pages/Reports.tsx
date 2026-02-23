import { FileText, Download, BarChart3, Users, DollarSign, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEmployees, useAttendance, usePayroll, useLeave, usePerformance, useTraining } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { exportToCSV, exportToPDF, exportToExcel } from "@/lib/utils/exportUtils";

const reports = [
  { 
    id: "employee",
    title: "Employee Report", 
    description: "Complete employee directory and demographics", 
    icon: Users 
  },
  { 
    id: "attendance",
    title: "Attendance Report", 
    description: "Monthly attendance summary with trends", 
    icon: Clock 
  },
  { 
    id: "payroll",
    title: "Payroll Report", 
    description: "Salary disbursement and deduction details", 
    icon: DollarSign 
  },
  { 
    id: "performance",
    title: "Performance Report", 
    description: "KPI scores and appraisal summaries", 
    icon: BarChart3 
  },
  { 
    id: "leave",
    title: "Leave Report", 
    description: "Leave utilization and balance summary", 
    icon: FileText 
  },
  { 
    id: "training",
    title: "Training Report", 
    description: "Training completion and certification stats", 
    icon: FileText 
  },
];

const Reports = () => {
  const { employees } = useEmployees();
  const { attendanceRecords } = useAttendance();
  const { payrolls } = usePayroll();
  const { leaveRequests, leaveBalances } = useLeave();
  const { performances } = usePerformance();
  const { trainings } = useTraining();
  const { toast } = useToast();

  const handleExport = async (reportId: string, format: "PDF" | "Excel" | "CSV") => {
    let data: any[] = [];
    let filename = "";

    switch (reportId) {
      case "employee":
        data = employees.map(e => ({
          Name: e.name,
          Email: e.email,
          Department: e.department,
          "Job Title": e.jobTitle,
          Status: e.status,
          "Join Date": e.joinDate,
          Salary: e.salary,
        }));
        filename = "employee-report";
        break;
      case "attendance":
        data = attendanceRecords.map(a => ({
          Employee: a.employee,
          Date: a.date,
          "Check In": a.checkIn,
          "Check Out": a.checkOut,
          Status: a.status,
          Department: a.department,
        }));
        filename = "attendance-report";
        break;
      case "payroll":
        data = payrolls.map(p => ({
          Employee: p.employee,
          Department: p.department,
          "Basic Salary": p.basicSalary,
          "Net Pay": p.netPay,
          Status: p.status,
          Month: p.month,
          Year: p.year,
        }));
        filename = "payroll-report";
        break;
      case "performance":
        data = performances.map(p => ({
          Employee: p.employee,
          Department: p.department,
          "Overall Score": p.overallScore,
          Goals: p.goals,
          Teamwork: p.teamwork,
          Communication: p.communication,
          Rating: p.rating,
        }));
        filename = "performance-report";
        break;
      case "leave":
        data = leaveRequests.map(l => ({
          Employee: l.employee,
          Type: l.type,
          From: l.from,
          To: l.to,
          Days: l.days,
          Status: l.status,
        }));
        filename = "leave-report";
        break;
      case "training":
        data = trainings.map(t => ({
          Program: t.title,
          Employee: t.employee,
          Date: t.date,
          Status: t.status,
          Certification: t.certification ? "Yes" : "No",
        }));
        filename = "training-report";
        break;
    }

    try {
      if (format === "CSV") {
        exportToCSV(data, filename);
      } else if (format === "Excel") {
        await exportToExcel(data, filename);
      } else {
        await exportToPDF(data, filename, reports.find(r => r.id === reportId)?.title || "Report");
      }
      
      toast({
        title: "Export successful",
        description: `${reports.find(r => r.id === reportId)?.title} exported as ${format}`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "An error occurred during export",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Generate and export HR reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => (
          <Card key={r.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex flex-col items-start gap-4">
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <r.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">{r.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
              </div>
              <div className="flex gap-2 mt-auto pt-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleExport(r.id, "PDF")}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />PDF
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleExport(r.id, "Excel")}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />Excel
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleExport(r.id, "CSV")}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Reports;
