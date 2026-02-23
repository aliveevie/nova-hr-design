import { Plus, Trash2, Edit } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useHoliday } from "@/lib/store";
import { Holiday } from "@/types";
import { useToast } from "@/hooks/use-toast";

const typeClass: Record<string, string> = {
  National: "bg-primary/10 text-primary border-0",
  Company: "bg-accent/10 text-accent border-0",
};

const Holidays = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<"National" | "Company">("National");
  
  const { holidays, addHoliday, updateHoliday, deleteHoliday } = useHoliday();
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!name || !date) {
      toast({
        title: "Error",
        description: "Please fill all fields",
        variant: "destructive",
      });
      return;
    }

    if (editingHoliday) {
      updateHoliday(editingHoliday.id, { name, date, type });
      toast({
        title: "Holiday updated",
        description: "Holiday has been updated",
      });
    } else {
      addHoliday({ name, date, type });
      toast({
        title: "Holiday added",
        description: "New holiday has been added",
      });
    }

    setIsDialogOpen(false);
    setEditingHoliday(null);
    setName("");
    setDate("");
    setType("National");
  };

  const handleEdit = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setName(holiday.name);
    setDate(holiday.date);
    setType(holiday.type);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteHoliday(id);
    toast({
      title: "Holiday deleted",
      description: "Holiday has been removed",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Holidays</h1>
          <p className="text-muted-foreground">Manage company holidays and observances</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingHoliday(null);
            setName("");
            setDate("");
            setType("National");
          }
        }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Holiday</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingHoliday ? "Edit Holiday" : "Add Holiday"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Holiday Name</Label>
                <Input placeholder="Holiday name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as "National" | "Company")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="National">National</SelectItem>
                    <SelectItem value="Company">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingHoliday ? "Update" : "Add"} Holiday
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Holiday Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Holiday</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell>{h.date}</TableCell>
                    <TableCell className="text-muted-foreground">{h.day}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={typeClass[h.type]}>
                        {h.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(h)}>
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
                              <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {h.name}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(h.id)}>Delete</AlertDialogAction>
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

export default Holidays;
