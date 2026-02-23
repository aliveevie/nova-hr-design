import { Plus, Trash2, Edit } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useDiscipline, useEmployees } from "@/lib/store";
import { Discipline } from "@/types";
import { useToast } from "@/hooks/use-toast";

const statusClass: Record<string, string> = {
  Active: "bg-destructive/10 text-destructive border-0",
  Resolved: "bg-success/10 text-success border-0",
};

const Discipline = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDiscipline, setEditingDiscipline] = useState<Discipline | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState<"Verbal Warning" | "Written Warning" | "Final Warning" | "Query">("Verbal Warning");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<"Active" | "Resolved">("Active");
  
  const { disciplines, addDiscipline, updateDiscipline, deleteDiscipline } = useDiscipline();
  const { employees } = useEmployees();
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!employeeId || !reason || !date) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    if (editingDiscipline) {
      updateDiscipline(editingDiscipline.id, {
        employeeId,
        employee: employee.name,
        type,
        date,
        reason,
        status,
      });
      toast({
        title: "Disciplinary record updated",
        description: "Record has been updated",
      });
    } else {
      addDiscipline({
        employeeId,
        employee: employee.name,
        type,
        date,
        reason,
        status,
      });
      toast({
        title: "Disciplinary record added",
        description: "New record has been added",
      });
    }

    setIsDialogOpen(false);
    setEditingDiscipline(null);
    setEmployeeId("");
    setType("Verbal Warning");
    setReason("");
    setDate("");
    setStatus("Active");
  };

  const handleEdit = (discipline: Discipline) => {
    setEditingDiscipline(discipline);
    setEmployeeId(discipline.employeeId);
    setType(discipline.type);
    setReason(discipline.reason);
    setDate(discipline.date);
    setStatus(discipline.status);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteDiscipline(id);
    toast({
      title: "Record deleted",
      description: "Disciplinary record has been removed",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Discipline</h1>
          <p className="text-muted-foreground">Manage disciplinary actions and warnings</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingDiscipline(null);
            setEmployeeId("");
            setType("Verbal Warning");
            setReason("");
            setDate("");
            setStatus("Active");
          }
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Warning</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDiscipline ? "Edit Warning" : "Add Warning"}</DialogTitle>
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
                <Label>Warning Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Verbal Warning">Verbal Warning</SelectItem>
                    <SelectItem value="Written Warning">Written Warning</SelectItem>
                    <SelectItem value="Final Warning">Final Warning</SelectItem>
                    <SelectItem value="Query">Query</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  placeholder="Describe the reason..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingDiscipline ? "Update" : "Submit"} Warning
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Warning Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disciplines.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.employee}</TableCell>
                    <TableCell>{d.type}</TableCell>
                    <TableCell className="text-muted-foreground">{d.reason}</TableCell>
                    <TableCell>{d.date}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusClass[d.status]}>
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(d)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Record</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this disciplinary record?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(d.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
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

export default Discipline;
