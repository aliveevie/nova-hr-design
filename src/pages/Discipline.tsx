import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { disciplineRecords } from "@/lib/mockData";

const statusClass: Record<string, string> = {
  Active: "bg-destructive/10 text-destructive border-0",
  Resolved: "bg-success/10 text-success border-0",
};

const Discipline = () => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Discipline</h1>
        <p className="text-muted-foreground">Manage disciplinary actions and warnings</p>
      </div>
      <Dialog>
        <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Warning</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Warning</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>Employee</Label>
              <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="james">James Wilson</SelectItem><SelectItem value="robert">Robert Williams</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Warning Type</Label>
              <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="verbal">Verbal Warning</SelectItem><SelectItem value="written">Written Warning</SelectItem><SelectItem value="final">Final Warning</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Reason</Label><Textarea placeholder="Describe the reason..." /></div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" /></div>
            <Button className="w-full">Submit Warning</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>

    <Card className="shadow-sm">
      <CardHeader className="pb-3"><CardTitle className="text-lg">Warning Records</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Employee</TableHead><TableHead>Type</TableHead><TableHead>Reason</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {disciplineRecords.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.employee}</TableCell>
                  <TableCell>{d.type}</TableCell>
                  <TableCell className="text-muted-foreground">{d.reason}</TableCell>
                  <TableCell>{d.date}</TableCell>
                  <TableCell><Badge variant="secondary" className={statusClass[d.status]}>{d.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default Discipline;
