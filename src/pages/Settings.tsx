import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

const roles = [
  { name: "Super Admin", users: 1, description: "Full system access" },
  { name: "HR Manager", users: 3, description: "Manage employees and policies" },
  { name: "Department Head", users: 5, description: "Department-level access" },
  { name: "Employee", users: 147, description: "Self-service access" },
];

const permissions = ["View Employees", "Edit Employees", "Manage Payroll", "Approve Leave", "View Reports", "Manage Settings"];

const Settings = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <p className="text-muted-foreground">System configuration and access control</p>
    </div>

    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="roles">Roles</TabsTrigger>
        <TabsTrigger value="permissions">Permissions</TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        <Card className="shadow-sm"><CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2"><Label>Company Name</Label><Input defaultValue="NovaHR Inc." /></div>
            <div className="space-y-2"><Label>Company Email</Label><Input defaultValue="admin@novahr.com" /></div>
            <div className="space-y-2"><Label>Timezone</Label><Input defaultValue="UTC-5 (Eastern)" /></div>
            <div className="space-y-2"><Label>Date Format</Label><Input defaultValue="YYYY-MM-DD" /></div>
          </div>
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-semibold">Notifications</h3>
            {["Email notifications for leave requests", "Email notifications for payroll", "Push notifications for approvals"].map((label) => (
              <div key={label} className="flex items-center justify-between">
                <Label className="font-normal">{label}</Label>
                <Switch defaultChecked />
              </div>
            ))}
          </div>
          <Button>Save Changes</Button>
        </CardContent></Card>
      </TabsContent>

      <TabsContent value="roles">
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Roles</CardTitle>
              <Button size="sm">Add Role</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Description</TableHead><TableHead>Users</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {roles.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground">{r.description}</TableCell>
                    <TableCell><Badge variant="secondary">{r.users}</Badge></TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="sm">Edit</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="permissions">
        <Card className="shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-lg">Permission Matrix</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Permission</TableHead>
                  {roles.map((r) => <TableHead key={r.name} className="text-center">{r.name}</TableHead>)}
                </TableRow></TableHeader>
                <TableBody>
                  {permissions.map((p, i) => (
                    <TableRow key={p}>
                      <TableCell className="font-medium">{p}</TableCell>
                      {roles.map((r, j) => (
                        <TableCell key={r.name} className="text-center">
                          <Checkbox defaultChecked={j === 0 || (j === 1 && i < 5) || (j === 2 && i < 2) || (j === 3 && i === 0)} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </div>
);

export default Settings;
