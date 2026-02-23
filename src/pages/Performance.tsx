import { Plus, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { usePerformance, useEmployees } from "@/lib/store";
import { Performance } from "@/types";
import { useToast } from "@/hooks/use-toast";

const ratingClass: Record<string, string> = {
  Excellent: "bg-success/10 text-success border-0",
  Good: "bg-info/10 text-info border-0",
  Average: "bg-warning/10 text-warning border-0",
  Poor: "bg-destructive/10 text-destructive border-0",
};

const Performance = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [goals, setGoals] = useState([85]);
  const [teamwork, setTeamwork] = useState([85]);
  const [communication, setCommunication] = useState([85]);
  
  const { performances, addPerformance, updatePerformance } = usePerformance();
  const { employees } = useEmployees();
  const { toast } = useToast();

  const avgScore = performances.length > 0
    ? Math.round(performances.reduce((s, p) => s + p.overallScore, 0) / performances.length)
    : 0;

  const handleSubmit = () => {
    if (!employeeId) {
      toast({
        title: "Error",
        description: "Please select an employee",
        variant: "destructive",
      });
      return;
    }

    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    const overallScore = Math.round((goals[0] + teamwork[0] + communication[0]) / 3);
    const rating = overallScore >= 90 ? "Excellent" : overallScore >= 75 ? "Good" : overallScore >= 60 ? "Average" : "Poor";

    const existing = performances.find(p => p.employeeId === employeeId);
    if (existing) {
      updatePerformance(existing.id, {
        goals: goals[0],
        teamwork: teamwork[0],
        communication: communication[0],
        overallScore,
        rating: rating as any,
        reviewDate: new Date().toISOString().split("T")[0],
      });
      toast({
        title: "Performance updated",
        description: "Performance review has been updated",
      });
    } else {
      addPerformance({
        employeeId,
        employee: employee.name,
        department: employee.department,
        goals: goals[0],
        teamwork: teamwork[0],
        communication: communication[0],
        overallScore,
        rating: rating as any,
        reviewDate: new Date().toISOString().split("T")[0],
      });
      toast({
        title: "Performance review added",
        description: "New performance review has been added",
      });
    }

    setIsDialogOpen(false);
    setEmployeeId("");
    setGoals([85]);
    setTeamwork([85]);
    setCommunication([85]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance</h1>
          <p className="text-muted-foreground">Employee performance reviews and KPIs</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Performance Review</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Performance Appraisal</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Goals Achievement: {goals[0]}%</Label>
                <Slider value={goals} onValueChange={setGoals} max={100} step={1} />
              </div>
              <div className="space-y-2">
                <Label>Teamwork: {teamwork[0]}%</Label>
                <Slider value={teamwork} onValueChange={setTeamwork} max={100} step={1} />
              </div>
              <div className="space-y-2">
                <Label>Communication: {communication[0]}%</Label>
                <Slider value={communication} onValueChange={setCommunication} max={100} step={1} />
              </div>
              <Button onClick={handleSubmit} className="w-full">Submit Review</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["Avg Score", `${avgScore}%`],
          ["Excellent", performances.filter(p => p.rating === "Excellent").length.toString()],
          ["Good", performances.filter(p => p.rating === "Good").length.toString()],
          ["Reviews Done", `${performances.length}/${employees.length}`]
        ].map(([label, value]) => (
          <Card key={label} className="shadow-sm">
            <CardContent className="p-5 text-center">
              <p className="text-3xl font-bold">{value}</p>
              <p className="text-sm text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Performance Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Goals</TableHead>
                  <TableHead>Teamwork</TableHead>
                  <TableHead>Communication</TableHead>
                  <TableHead>Overall</TableHead>
                  <TableHead>Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performances.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.employee}</TableCell>
                    <TableCell>{p.department}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={p.goals} className="h-2 w-20" />
                        <span className="text-xs text-muted-foreground">{p.goals}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={p.teamwork} className="h-2 w-20" />
                        <span className="text-xs text-muted-foreground">{p.teamwork}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={p.communication} className="h-2 w-20" />
                        <span className="text-xs text-muted-foreground">{p.communication}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{p.overallScore}%</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={ratingClass[p.rating]}>
                        {p.rating}
                      </Badge>
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

export default Performance;
