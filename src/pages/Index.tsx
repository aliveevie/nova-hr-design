import { Users, UserCheck, CalendarOff, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { recentActivities, upcomingHolidays, attendanceChartData } from "@/lib/mockData";

const summaryCards = [
  { title: "Total Employees", value: "156", change: "+12%", trend: "up" as const, icon: Users },
  { title: "Present Today", value: "142", change: "+3%", trend: "up" as const, icon: UserCheck },
  { title: "On Leave", value: "8", change: "-2", trend: "down" as const, icon: CalendarOff },
  { title: "Pending Approvals", value: "5", change: "+2", trend: "up" as const, icon: Clock },
];

const trendColors = { up: "text-success", down: "text-warning" };
const iconBgs = ["bg-primary/10 text-primary", "bg-success/10 text-success", "bg-warning/10 text-warning", "bg-info/10 text-info"];

const Dashboard = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground">Welcome back, John. Here's what's happening today.</p>
    </div>

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
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Upcoming Holidays</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingHolidays.map((h, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <CalendarOff className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium">{h.name}</p>
                <p className="text-xs text-muted-foreground">{h.date}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>

    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Recent Activities</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  </div>
);

export default Dashboard;
