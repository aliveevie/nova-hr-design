import { Plus, Award, Trash2, Edit } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useTraining, useEmployees } from "@/lib/store";
import { Training } from "@/types";
import { useToast } from "@/hooks/use-toast";

const statusClass: Record<string, string> = {
  Completed: "bg-success/10 text-success border-0",
  "In Progress": "bg-info/10 text-info border-0",
  Scheduled: "bg-warning/10 text-warning border-0",
};

const Training = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState<Training | null>(null);
  const [title, setTitle] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<"Completed" | "In Progress" | "Scheduled">("Scheduled");
  const [certification, setCertification] = useState(false);
  
  const { trainings, addTraining, updateTraining, deleteTraining } = useTraining();
  const { employees } = useEmployees();
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!title || !employeeId || !date) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;

    if (editingTraining) {
      updateTraining(editingTraining.id, {
        title,
        employeeId,
        employee: employee.name,
        date,
        status,
        certification,
      });
      toast({
        title: "Training updated",
        description: "Training record has been updated",
      });
    } else {
      addTraining({
        title,
        employeeId,
        employee: employee.name,
        date,
        status,
        certification,
      });
      toast({
        title: "Training added",
        description: "New training record has been added",
      });
    }

    setIsDialogOpen(false);
    setEditingTraining(null);
    setTitle("");
    setEmployeeId("");
    setDate("");
    setStatus("Scheduled");
    setCertification(false);
  };

  const handleEdit = (training: Training) => {
    setEditingTraining(training);
    setTitle(training.title);
    setEmployeeId(training.employeeId);
    setDate(training.date);
    setStatus(training.status);
    setCertification(training.certification);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteTraining(id);
    toast({
      title: "Training deleted",
      description: "Training record has been removed",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Training</h1>
          <p className="text-muted-foreground">Employee training programs and certifications</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingTraining(null);
            setTitle("");
            setEmployeeId("");
            setDate("");
            setStatus("Scheduled");
            setCertification(false);
          }
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Training</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTraining ? "Edit Training" : "Add Training Program"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input placeholder="Training title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
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
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="certification"
                  checked={certification}
                  onCheckedChange={(checked) => setCertification(checked as boolean)}
                />
                <Label htmlFor="certification" className="font-normal">Includes Certification</Label>
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingTraining ? "Update" : "Add"} Training
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Training Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Program</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Certification</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainings.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell>{t.employee}</TableCell>
                    <TableCell className="text-muted-foreground">{t.date}</TableCell>
                    <TableCell>
                      {t.certification ? (
                        <Award className="h-4 w-4 text-accent" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusClass[t.status]}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(t)}>
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
                              <AlertDialogTitle>Delete Training</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this training record?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(t.id)}>Delete</AlertDialogAction>
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

export default Training;
