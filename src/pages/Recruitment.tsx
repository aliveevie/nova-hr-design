import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { applicants } from "@/lib/mockData";

const statusClass: Record<string, string> = {
  Applied: "bg-info/10 text-info border-0",
  Interviewed: "bg-warning/10 text-warning border-0",
  Offered: "bg-accent/10 text-accent border-0",
  Hired: "bg-success/10 text-success border-0",
};

const Recruitment = () => {
  const [search, setSearch] = useState("");
  const filtered = applicants.filter((a) => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recruitment</h1>
          <p className="text-muted-foreground">Manage job applicants and hiring pipeline</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />New Job Posting</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[["Applied", "12"], ["Interviewed", "5"], ["Offered", "3"], ["Hired", "8"]].map(([label, count]) => (
          <Card key={label} className="shadow-sm"><CardContent className="p-5 text-center">
            <p className="text-3xl font-bold">{count}</p><p className="text-sm text-muted-foreground mt-1">{label}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <CardTitle className="text-lg">Applicants</CardTitle>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search applicants..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Applicant</TableHead><TableHead>Position</TableHead><TableHead>Applied Date</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9"><AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{a.initials}</AvatarFallback></Avatar>
                        <div><p className="font-medium">{a.name}</p><p className="text-xs text-muted-foreground">{a.email}</p></div>
                      </div>
                    </TableCell>
                    <TableCell>{a.position}</TableCell>
                    <TableCell className="text-muted-foreground">{a.appliedDate}</TableCell>
                    <TableCell><Badge variant="secondary" className={statusClass[a.status]}>{a.status}</Badge></TableCell>
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

export default Recruitment;
