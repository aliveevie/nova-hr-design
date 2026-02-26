import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Eye, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useEmployees } from "@/lib/store";
import { EmployeeForm } from "@/components/forms/EmployeeForm";
import { Employee } from "@/types";
import { useToast } from "@/hooks/use-toast";

const statusClass: Record<string, string> = {
  Active: "bg-success/10 text-success border-0",
  "On Leave": "bg-warning/10 text-warning border-0",
  Inactive: "bg-muted text-muted-foreground border-0",
};

const Employees = () => {
  const [search, setSearch] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>();
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useEmployees();
  const { toast } = useToast();

  const filtered = employees.filter(
    (e) => e.name.toLowerCase().includes(search.toLowerCase()) || 
           e.department.toLowerCase().includes(search.toLowerCase()) ||
           e.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (data: Omit<Employee, "id" | "initials">) => {
    try {
      await addEmployee(data);
      setIsAddDialogOpen(false);
      toast({
        title: "Success",
        description: "Employee added successfully. Login credentials have been sent to their email.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add employee",
        variant: "destructive",
      });
    }
  };

  const handleUpdate = (data: Omit<Employee, "id" | "initials">) => {
    if (editingEmployee) {
      updateEmployee(editingEmployee.id, data);
      setEditingEmployee(undefined);
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteEmployee(id);
    toast({
      title: "Success",
      description: "Employee deactivated successfully",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">Manage your team members</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Employee</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
            </DialogHeader>
            <EmployeeForm onSubmit={handleAdd} onCancel={() => setIsAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-lg">All Employees ({filtered.length})</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{emp.initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell>{emp.jobTitle}</TableCell>
                    <TableCell><Badge variant="secondary" className={statusClass[emp.status]}>{emp.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/employees/${emp.id}`}><Eye className="h-4 w-4" /></Link>
                        </Button>
                        <Dialog open={editingEmployee?.id === emp.id} onOpenChange={(open) => !open && setEditingEmployee(undefined)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setEditingEmployee(emp)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Edit Employee</DialogTitle>
                            </DialogHeader>
                            <EmployeeForm employee={emp} onSubmit={handleUpdate} onCancel={() => setEditingEmployee(undefined)} />
                          </DialogContent>
                        </Dialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deactivate Employee</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to deactivate {emp.name}? This action can be reversed later.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(emp.id)}>Deactivate</AlertDialogAction>
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

export default Employees;
