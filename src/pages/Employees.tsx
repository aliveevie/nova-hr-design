import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Eye, Edit, Trash2, Copy, Check } from "lucide-react";
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
import { Label } from "@/components/ui/label";

const statusClass: Record<string, string> = {
  Active: "bg-success/10 text-success border-0",
  "On Leave": "bg-warning/10 text-warning border-0",
  Inactive: "bg-muted text-muted-foreground border-0",
};

const Employees = () => {
  const [search, setSearch] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>();
  const [loginCredentials, setLoginCredentials] = useState<{ email: string; password: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useEmployees();
  const { toast } = useToast();

  const filtered = employees.filter(
    (e) => e.name.toLowerCase().includes(search.toLowerCase()) || 
           e.department.toLowerCase().includes(search.toLowerCase()) ||
           e.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (data: Omit<Employee, "id" | "initials">) => {
    try {
      const response = await addEmployee(data);
      setIsAddDialogOpen(false);
      
      // Check if response includes tempPassword (new employee)
      if (response && response.tempPassword) {
        setLoginCredentials({
          email: data.email,
          password: response.tempPassword,
          name: data.name,
        });
      } else {
        toast({
          title: "Success",
          description: "Employee added successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add employee",
        variant: "destructive",
      });
    }
  };

  const handleCopyPassword = () => {
    if (loginCredentials) {
      navigator.clipboard.writeText(loginCredentials.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Password copied to clipboard",
      });
    }
  };

  const handleCopyEmail = () => {
    if (loginCredentials) {
      navigator.clipboard.writeText(loginCredentials.email);
      toast({
        title: "Copied!",
        description: "Email copied to clipboard",
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

      {/* Login Credentials Dialog */}
      <Dialog open={!!loginCredentials} onOpenChange={(open) => !open && setLoginCredentials(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Employee Login Credentials</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Login credentials for <strong>{loginCredentials?.name}</strong>. Please save these credentials securely.
            </p>
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="flex items-center gap-2">
                <Input value={loginCredentials?.email || ""} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={handleCopyEmail}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Temporary Password</Label>
              <div className="flex items-center gap-2">
                <Input value={loginCredentials?.password || ""} readOnly className="font-mono text-sm" />
                <Button variant="outline" size="icon" onClick={handleCopyPassword}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Important:</strong> This password will only be shown once. The employee should change it after first login.
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setLoginCredentials(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

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
