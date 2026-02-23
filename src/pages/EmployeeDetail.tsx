import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, Building, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { employees } from "@/lib/mockData";

const statusClass: Record<string, string> = {
  Active: "bg-success/10 text-success border-0",
  "On Leave": "bg-warning/10 text-warning border-0",
  Inactive: "bg-muted text-muted-foreground border-0",
};

const EmployeeDetail = () => {
  const { id } = useParams();
  const employee = employees.find((e) => e.id === id) || employees[0];

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
              {([["Full Name", employee.name], ["Email", employee.email], ["Phone", employee.phone], ["Department", employee.department],
                ["Job Title", employee.jobTitle], ["Join Date", employee.joinDate], ["Status", employee.status], ["Employee ID", `EMP-${employee.id.padStart(4, "0")}`]
              ] as [string, string][]).map(([label, value]) => (
                <div key={label}><p className="text-sm text-muted-foreground">{label}</p><p className="font-medium mt-1">{value}</p></div>
              ))}
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card className="shadow-sm"><CardContent className="p-6">
            <Table><TableHeader><TableRow><TableHead>Document</TableHead><TableHead>Type</TableHead><TableHead>Uploaded</TableHead></TableRow></TableHeader>
              <TableBody>
                {([["Resume", "PDF", "2021-03-10"], ["ID Proof", "PDF", "2021-03-10"], ["Offer Letter", "PDF", "2021-03-14"]] as string[][]).map(([name, type, date]) => (
                  <TableRow key={name}><TableCell className="font-medium">{name}</TableCell><TableCell><Badge variant="secondary">{type}</Badge></TableCell><TableCell className="text-muted-foreground">{date}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card className="shadow-sm"><CardContent className="p-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-success/10 rounded-lg text-center"><p className="text-2xl font-bold text-success">22</p><p className="text-sm text-muted-foreground">Present</p></div>
              <div className="p-4 bg-destructive/10 rounded-lg text-center"><p className="text-2xl font-bold text-destructive">1</p><p className="text-sm text-muted-foreground">Absent</p></div>
              <div className="p-4 bg-warning/10 rounded-lg text-center"><p className="text-2xl font-bold text-warning">2</p><p className="text-sm text-muted-foreground">Late</p></div>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="payroll">
          <Card className="shadow-sm"><CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Basic Salary</p><p className="text-2xl font-bold">${employee.salary.toLocaleString()}</p></div>
              <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Deductions</p><p className="text-2xl font-bold text-destructive">-${Math.round(employee.salary * 0.2).toLocaleString()}</p></div>
              <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Net Pay</p><p className="text-2xl font-bold text-success">${Math.round(employee.salary * 0.8).toLocaleString()}</p></div>
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="performance">
          <Card className="shadow-sm"><CardContent className="p-6 space-y-5">
            {([["Goals Achievement", 88], ["Teamwork", 92], ["Communication", 85], ["Technical Skills", 90]] as [string, number][]).map(([label, score]) => (
              <div key={label} className="space-y-2">
                <div className="flex justify-between text-sm"><span className="font-medium">{label}</span><span className="text-muted-foreground">{score}%</span></div>
                <Progress value={score} className="h-2" />
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EmployeeDetail;
