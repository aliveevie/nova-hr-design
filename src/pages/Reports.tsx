import { FileText, Download, BarChart3, Users, DollarSign, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const reports = [
  { title: "Employee Report", description: "Complete employee directory and demographics", icon: Users },
  { title: "Attendance Report", description: "Monthly attendance summary with trends", icon: Clock },
  { title: "Payroll Report", description: "Salary disbursement and deduction details", icon: DollarSign },
  { title: "Performance Report", description: "KPI scores and appraisal summaries", icon: BarChart3 },
  { title: "Leave Report", description: "Leave utilization and balance summary", icon: FileText },
  { title: "Training Report", description: "Training completion and certification stats", icon: FileText },
];

const Reports = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
      <p className="text-muted-foreground">Generate and export HR reports</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {reports.map((r) => (
        <Card key={r.title} className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6 flex flex-col items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <r.icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">{r.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
            </div>
            <div className="flex gap-2 mt-auto pt-2">
              <Button size="sm" variant="outline"><Download className="h-3.5 w-3.5 mr-1.5" />PDF</Button>
              <Button size="sm" variant="outline"><Download className="h-3.5 w-3.5 mr-1.5" />Excel</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

export default Reports;
