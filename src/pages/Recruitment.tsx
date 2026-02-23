import { Plus, Search, Eye, FileText, UserPlus, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useRecruitment, useEmployees } from "@/lib/store";
import { Applicant } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { exportToPDF } from "@/lib/utils/exportUtils";

const statusClass: Record<string, string> = {
  Applied: "bg-info/10 text-info border-0",
  Shortlisted: "bg-accent/10 text-accent border-0",
  Interviewed: "bg-warning/10 text-warning border-0",
  Offered: "bg-primary/10 text-primary border-0",
  Hired: "bg-success/10 text-success border-0",
  Rejected: "bg-destructive/10 text-destructive border-0",
};

const Recruitment = () => {
  const [search, setSearch] = useState("");
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const { applicants, updateApplicant } = useRecruitment();
  const { addEmployee } = useEmployees();
  const { toast } = useToast();

  const filtered = applicants.filter((a) => 
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.position.toLowerCase().includes(search.toLowerCase())
  );

  const statusCounts = {
    Applied: applicants.filter(a => a.status === "Applied").length,
    Shortlisted: applicants.filter(a => a.status === "Shortlisted").length,
    Interviewed: applicants.filter(a => a.status === "Interviewed").length,
    Offered: applicants.filter(a => a.status === "Offered").length,
    Hired: applicants.filter(a => a.status === "Hired").length,
  };

  const handleStatusChange = (id: string, newStatus: Applicant["status"]) => {
    updateApplicant(id, { status: newStatus });
    toast({
      title: "Status updated",
      description: `Applicant status changed to ${newStatus}`,
    });
  };

  const handleInterviewNotes = (id: string, notes: string) => {
    updateApplicant(id, { interviewNotes: notes });
    toast({
      title: "Interview notes saved",
      description: "Notes have been updated",
    });
  };

  const handleOnboardingChecklist = (id: string, checklist: any) => {
    updateApplicant(id, { onboardingChecklist: checklist });
  };

  const handleGenerateOfferLetter = (applicant: Applicant) => {
    const offerData = {
      applicantName: applicant.name,
      position: applicant.position,
      date: new Date().toLocaleDateString(),
    };
    exportToPDF([offerData], `offer-letter-${applicant.name}`, "Offer Letter");
    toast({
      title: "Offer letter generated",
      description: "Offer letter has been downloaded",
    });
  };

  const handleConvertToEmployee = (applicant: Applicant) => {
    if (applicant.status !== "Hired") {
      toast({
        title: "Error",
        description: "Only hired applicants can be converted to employees",
        variant: "destructive",
      });
      return;
    }

    addEmployee({
      name: applicant.name,
      email: applicant.email,
      phone: "", // Will need to be filled
      department: "", // Will need to be selected
      jobTitle: applicant.position,
      status: "Active" as const,
      joinDate: new Date().toISOString().split("T")[0],
      salary: 0, // Will need to be set
      initials: applicant.initials,
    });

    toast({
      title: "Success",
      description: `${applicant.name} has been converted to an employee`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recruitment</h1>
          <p className="text-muted-foreground">Manage job applicants and hiring pipeline</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />New Job Posting</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Object.entries(statusCounts).map(([label, count]) => (
          <Card key={label} className="shadow-sm">
            <CardContent className="p-5 text-center">
              <p className="text-3xl font-bold">{count}</p>
              <p className="text-sm text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
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
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Applied Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{a.initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{a.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{a.position}</TableCell>
                    <TableCell className="text-muted-foreground">{a.appliedDate}</TableCell>
                    <TableCell>
                      <Select
                        value={a.status}
                        onValueChange={(value) => handleStatusChange(a.id, value as Applicant["status"])}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Applied">Applied</SelectItem>
                          <SelectItem value="Shortlisted">Shortlisted</SelectItem>
                          <SelectItem value="Interviewed">Interviewed</SelectItem>
                          <SelectItem value="Offered">Offered</SelectItem>
                          <SelectItem value="Hired">Hired</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Dialog open={isViewDialogOpen && selectedApplicant?.id === a.id} onOpenChange={(open) => {
                          if (!open) setSelectedApplicant(null);
                          setIsViewDialogOpen(open);
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => {
                              setSelectedApplicant(a);
                              setIsViewDialogOpen(true);
                            }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Applicant Details - {a.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6">
                              <div>
                                <h3 className="font-semibold mb-2">Interview Notes</h3>
                                <Textarea
                                  value={a.interviewNotes || ""}
                                  onChange={(e) => handleInterviewNotes(a.id, e.target.value)}
                                  placeholder="Add interview notes..."
                                  className="min-h-32"
                                />
                              </div>
                              <div>
                                <h3 className="font-semibold mb-3">Onboarding Checklist</h3>
                                <div className="space-y-2">
                                  {Object.entries(a.onboardingChecklist || {}).map(([key, value]) => (
                                    <div key={key} className="flex items-center gap-2">
                                      <Checkbox
                                        checked={value}
                                        onCheckedChange={(checked) => {
                                          handleOnboardingChecklist(a.id, {
                                            ...a.onboardingChecklist,
                                            [key]: checked,
                                          });
                                        }}
                                      />
                                      <Label className="font-normal capitalize">
                                        {key.replace(/([A-Z])/g, " $1").trim()}
                                      </Label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {a.status === "Offered" && (
                                  <Button onClick={() => handleGenerateOfferLetter(a)}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Generate Offer Letter
                                  </Button>
                                )}
                                {a.status === "Hired" && (
                                  <Button onClick={() => handleConvertToEmployee(a)}>
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Convert to Employee
                                  </Button>
                                )}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
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

export default Recruitment;
