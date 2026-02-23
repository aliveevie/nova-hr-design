import { Plus, Award } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trainingRecords } from "@/lib/mockData";

const statusClass: Record<string, string> = {
  Completed: "bg-success/10 text-success border-0",
  "In Progress": "bg-info/10 text-info border-0",
  Scheduled: "bg-warning/10 text-warning border-0",
};

const Training = () => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Training</h1>
        <p className="text-muted-foreground">Employee training programs and certifications</p>
      </div>
      <Dialog>
        <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Training</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Training Program</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>Title</Label><Input placeholder="Training title" /></div>
            <div className="space-y-2"><Label>Employee</Label>
              <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="sarah">Sarah Johnson</SelectItem><SelectItem value="michael">Michael Chen</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" /></div>
            <Button className="w-full">Add Training</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>

    <Card className="shadow-sm">
      <CardHeader className="pb-3"><CardTitle className="text-lg">Training Records</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Program</TableHead><TableHead>Employee</TableHead><TableHead>Date</TableHead><TableHead>Certification</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {trainingRecords.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell>{t.employee}</TableCell>
                  <TableCell className="text-muted-foreground">{t.date}</TableCell>
                  <TableCell>{t.certification ? <Award className="h-4 w-4 text-accent" /> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell><Badge variant="secondary" className={statusClass[t.status]}>{t.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default Training;
