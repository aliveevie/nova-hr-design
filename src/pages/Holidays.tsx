import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { holidaysList } from "@/lib/mockData";

const typeClass: Record<string, string> = {
  National: "bg-primary/10 text-primary border-0",
  Company: "bg-accent/10 text-accent border-0",
};

const Holidays = () => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Holidays</h1>
        <p className="text-muted-foreground">Manage company holidays and observances</p>
      </div>
      <Dialog>
        <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Holiday</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Holiday</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>Holiday Name</Label><Input placeholder="Holiday name" /></div>
            <div className="space-y-2"><Label>Date</Label><Input type="date" /></div>
            <div className="space-y-2"><Label>Type</Label>
              <Select><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="national">National</SelectItem><SelectItem value="company">Company</SelectItem></SelectContent>
              </Select>
            </div>
            <Button className="w-full">Add Holiday</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>

    <Card className="shadow-sm">
      <CardHeader className="pb-3"><CardTitle className="text-lg">Holiday Calendar 2026</CardTitle></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Holiday</TableHead><TableHead>Date</TableHead><TableHead>Day</TableHead><TableHead>Type</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {holidaysList.map((h) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">{h.name}</TableCell>
                  <TableCell>{h.date}</TableCell>
                  <TableCell className="text-muted-foreground">{h.day}</TableCell>
                  <TableCell><Badge variant="secondary" className={typeClass[h.type]}>{h.type}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default Holidays;
