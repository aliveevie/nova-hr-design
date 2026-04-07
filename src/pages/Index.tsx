import { useEffect, useState } from "react";
import { Users, UserCheck, CalendarOff, Clock, TrendingUp, TrendingDown, Link2, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useEmployees, useAttendance, useLeave, useHoliday, useAuth } from "@/lib/store";
import { format, startOfWeek, eachDayOfInterval } from "date-fns";
import { inviteApi } from "@/lib/api/invite.api";
import { useToast } from "@/hooks/use-toast";

const trendColors = { up: "text-success", down: "text-warning" };
const iconBgs = ["bg-primary/10 text-primary", "bg-success/10 text-success", "bg-warning/10 text-warning", "bg-info/10 text-info"];

const Dashboard = () => {
  const { user } = useAuth();
  const { employees } = useEmployees();
  const { attendanceRecords, getAttendanceByDate } = useAttendance();
  const { leaveRequests } = useLeave();
  const { holidays } = useHoliday();
  const { toast } = useToast();
  const [inviteStats, setInviteStats] = useState<{
    inviteCount: number;
    totalCompletions: number;
    activeInvites: number;
  } | null>(null);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== "HR Admin") return;
    inviteApi
      .stats()
      .then(setInviteStats)
      .catch(() => setInviteStats(null));
  }, [user?.role]);

  const employeeIdSet = new Set(employees.map((e) => e.id));
  const scopedLeave =
    user?.role === "HR Admin"
      ? leaveRequests.filter((l) => employeeIdSet.has(l.employeeId))
      : leaveRequests;

  const getScopedAttendanceByDate = (date: string) => {
    const rows = getAttendanceByDate(date);
    if (user?.role !== "HR Admin") return rows;
    return rows.filter((a) => employeeIdSet.has(a.employeeId));
  };

  const today = new Date().toISOString().split("T")[0];
  const todayAttendance = getScopedAttendanceByDate(today);
  
  const totalEmployees = employees.length;
  const presentToday = todayAttendance.filter(a => a.status === "Present").length;
  const onLeaveToday = todayAttendance.filter(a => a.status === "On Leave").length;
  const pendingApprovals = scopedLeave.filter(l => l.status === "Pending").length;

  // Calculate weekly attendance data
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000) });
  
  const attendanceChartData = weekDays.map(day => {
    const dayStr = format(day, "yyyy-MM-dd");
    const dayRecords = getScopedAttendanceByDate(dayStr);
    return {
      day: format(day, "EEE"),
      present: dayRecords.filter(r => r.status === "Present").length,
      absent: dayRecords.filter(r => r.status === "Absent").length,
      late: dayRecords.filter(r => r.status === "Late").length,
    };
  });

  // Get upcoming holidays (next 4)
  const todayDate = new Date();
  const upcomingHolidays = holidays
    .filter(h => new Date(h.date) >= todayDate)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4)
    .map(h => ({
      name: h.name,
      date: format(new Date(h.date), "MMM d, yyyy"),
    }));

  // Recent activities - empty for now, can be populated as actions occur
  const recentActivities: any[] = [];

  const summaryCards = [
    { title: "Total Employees", value: totalEmployees.toString(), change: "+0%", trend: "up" as const, icon: Users },
    { title: "Present Today", value: presentToday.toString(), change: "+0%", trend: "up" as const, icon: UserCheck },
    { title: "On Leave", value: onLeaveToday.toString(), change: "0", trend: "down" as const, icon: CalendarOff },
    { title: "Pending Approvals", value: pendingApprovals.toString(), change: "+0", trend: "up" as const, icon: Clock },
  ];

  const handleCreateInvite = async () => {
    try {
      const res = await inviteApi.create({
        label: `Staff invite ${new Date().toLocaleDateString()}`,
      });
      setLastInviteUrl(res.inviteUrl);
      await navigator.clipboard.writeText(res.inviteUrl);
      toast({
        title: "Invite link ready",
        description: "Copied to clipboard. Share it only with trusted recipients.",
      });
      const s = await inviteApi.stats();
      setInviteStats(s);
    } catch (e: unknown) {
      const err = e as Error;
      toast({
        title: "Could not create invite",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const copyLastInvite = async () => {
    if (!lastInviteUrl) return;
    await navigator.clipboard.writeText(lastInviteUrl);
    toast({ title: "Copied" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {user?.name || "User"}. Here's what's happening today.</p>
        {user?.role === "HR Admin" ? (
          <p className="text-xs text-muted-foreground mt-1">
            You are viewing metrics and staff for your admin scope only.
          </p>
        ) : null}
      </div>

      {user?.role === "HR Admin" ? (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              Staff onboarding invites
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share a secure link so new hires can submit their details. Completions are counted here and tied to your admin account only.
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <Button type="button" onClick={handleCreateInvite}>
                Create invite link
              </Button>
              {lastInviteUrl ? (
                <Button type="button" variant="outline" size="sm" onClick={copyLastInvite}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy last link
                </Button>
              ) : null}
            </div>
            {inviteStats ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="rounded-lg border bg-card/50 p-3">
                  <p className="text-xs text-muted-foreground">Profiles submitted</p>
                  <p className="text-2xl font-semibold">{inviteStats.totalCompletions}</p>
                </div>
                <div className="rounded-lg border bg-card/50 p-3">
                  <p className="text-xs text-muted-foreground">Total invites created</p>
                  <p className="text-2xl font-semibold">{inviteStats.inviteCount}</p>
                </div>
                <div className="rounded-lg border bg-card/50 p-3">
                  <p className="text-xs text-muted-foreground">Active invite links</p>
                  <p className="text-2xl font-semibold">{inviteStats.activeInvites}</p>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <Card key={card.title} className="shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-3xl font-bold mt-1">{card.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    {card.trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span className={`text-xs font-medium ${trendColors[card.trend]}`}>{card.change}</span>
                    <span className="text-xs text-muted-foreground">vs last month</span>
                  </div>
                </div>
                <div className={`p-3 rounded-xl ${iconBgs[i]}`}>
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Weekly Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={attendanceChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ borderRadius: "0.5rem", border: "1px solid hsl(var(--border))", fontSize: 13 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="present" fill="hsl(var(--success))" name="Present" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" fill="hsl(var(--destructive))" name="Absent" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="late" fill="hsl(var(--warning))" name="Late" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No attendance data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Upcoming Holidays</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingHolidays.length > 0 ? (
              upcomingHolidays.map((h, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <CalendarOff className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{h.name}</p>
                    <p className="text-xs text-muted-foreground">{h.date}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No upcoming holidays</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivities.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivities.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.action}</TableCell>
                    <TableCell>{a.user}</TableCell>
                    <TableCell className="text-muted-foreground">{a.time}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={a.type === "success" ? "bg-success/10 text-success border-0" : "bg-info/10 text-info border-0"}>
                        {a.type === "success" ? "Completed" : "Info"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">No recent activities</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
