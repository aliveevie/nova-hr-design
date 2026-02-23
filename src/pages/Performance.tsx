import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { performanceData } from "@/lib/mockData";

const ratingClass: Record<string, string> = {
  Excellent: "bg-success/10 text-success border-0",
  Good: "bg-info/10 text-info border-0",
  Average: "bg-warning/10 text-warning border-0",
};

const avgScore = Math.round(performanceData.reduce((s, p) => s + p.overallScore, 0) / performanceData.length);

const Performance = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Performance</h1>
      <p className="text-muted-foreground">Employee performance reviews and KPIs</p>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {([["Avg Score", `${avgScore}%`], ["Excellent", "2"], ["Good", "3"], ["Reviews Done", "5/8"]] as string[][]).map(([label, value]) => (
        <Card key={label} className="shadow-sm"><CardContent className="p-5 text-center">
          <p className="text-3xl font-bold">{value}</p><p className="text-sm text-muted-foreground mt-1">{label}</p>
        </CardContent></Card>
      ))}
    </div>

    <Card className="shadow-sm">
      <CardHeader className="pb-3"><CardTitle className="text-lg">Performance Overview</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Employee</TableHead><TableHead>Department</TableHead><TableHead>Goals</TableHead><TableHead>Teamwork</TableHead><TableHead>Overall</TableHead><TableHead>Rating</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {performanceData.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.employee}</TableCell>
                  <TableCell>{p.department}</TableCell>
                  <TableCell><div className="flex items-center gap-2"><Progress value={p.goals} className="h-2 w-20" /><span className="text-xs text-muted-foreground">{p.goals}%</span></div></TableCell>
                  <TableCell><div className="flex items-center gap-2"><Progress value={p.teamwork} className="h-2 w-20" /><span className="text-xs text-muted-foreground">{p.teamwork}%</span></div></TableCell>
                  <TableCell><span className="font-semibold">{p.overallScore}%</span></TableCell>
                  <TableCell><Badge variant="secondary" className={ratingClass[p.rating]}>{p.rating}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default Performance;
