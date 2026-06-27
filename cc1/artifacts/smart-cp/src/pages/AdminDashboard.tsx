import { useState } from "react";
import {
  Users, GraduationCap, Briefcase, ClipboardList,
  CalendarDays, CheckCircle2, TrendingUp, TrendingDown,
  Mail, MailOpen, ArrowRight, Clock, Activity,
  AlertTriangle, Star, Zap, Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { motion } from "framer-motion";
import { students, staff, leaveRequests, tasks, performanceData, notifications, projects, projectDocuments } from "@/data/mockData";
import { Link } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--muted-foreground))",
];

interface Message {
  id: string; sender: string; subject: string; preview: string;
  dateTime: string; read: boolean; category: string;
}

const CATEGORY_SENDER: Record<string, string> = {
  Leave: "Leave System", Task: "Task Manager",
  Performance: "HR Team", System: "System Admin", General: "Admin Office",
};

function buildMessages(): Message[] {
  return notifications.map(n => ({
    id: n.id, sender: CATEGORY_SENDER[n.category] ?? "System",
    subject: n.title, preview: n.message, dateTime: n.time,
    read: n.read, category: n.category,
  }));
}

function KpiCard({ title, value, trend, trendVal, icon: Icon, color, bg, delay }: {
  title: string; value: string; trend: "up" | "down"; trendVal: string;
  icon: React.ElementType; color: string; bg: string; delay: number;
}) {
  const isUp = trend === "up";
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Card className="hover:shadow-md transition-all hover:-translate-y-0.5 border">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
              <p className="text-2xl font-bold mt-1.5">{value}</p>
            </div>
            <div className={cn("p-2.5 rounded-xl shrink-0", bg, color)}>
              <Icon size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs">
            {isUp
              ? <TrendingUp size={13} className="text-green-500 shrink-0" />
              : <TrendingDown size={13} className="text-red-500 shrink-0" />
            }
            <span className={cn("font-semibold", isUp ? "text-green-600" : "text-red-600")}>{trendVal}</span>
            <span className="text-muted-foreground">vs last month</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const [messages, setMessages] = useState<Message[]>(buildMessages);
  const [messagesOpen, setMessagesOpen] = useState(false);

  const unreadCount   = messages.filter(m => !m.read).length;
  const markRead      = (id: string) => setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  const markAllRead   = () => setMessages(prev => prev.map(m => ({ ...m, read: true })));

  // Metrics
  const activeInterns   = students.filter(s => s.status === "Active").length;
  const activeEmployees = staff.filter(s => s.status === "Active").length;
  const pendingLeaves   = leaveRequests.filter(l => l.status === "Pending").length;
  const pendingTasks    = tasks.filter(t => t.status !== "Completed").length;
  const completedTasks  = tasks.filter(t => t.status === "Completed").length;
  const completionRate  = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const avgAttendance   = Math.round(performanceData.reduce((s, p) => s + p.attendance, 0) / Math.max(performanceData.length, 1));
  const avgPerf         = Math.round(
    performanceData.reduce((s, p) =>
      s + (p.attendance + p.taskCompletion + p.communication + p.discipline + p.learning + p.innovation + p.leadership + p.collaboration) / 8, 0
    ) / Math.max(performanceData.length, 1)
  );

  const kpis = [
    { title: "Total Interns",     value: students.length.toString(),    trendVal: "+12%", trend: "up"   as const, icon: GraduationCap, color: "text-blue-600",   bg: "bg-blue-50",   delay: 0 },
    { title: "Active Employees",  value: activeEmployees.toString(),     trendVal: "+5%",  trend: "up"   as const, icon: Users,         color: "text-indigo-600", bg: "bg-indigo-50", delay: 0.05 },
    { title: "Active Interns",    value: activeInterns.toString(),       trendVal: "+8%",  trend: "up"   as const, icon: Briefcase,     color: "text-purple-600", bg: "bg-purple-50", delay: 0.1 },
    { title: "Pending Tasks",     value: pendingTasks.toString(),        trendVal: "−3%",  trend: "down" as const, icon: ClipboardList, color: "text-orange-600", bg: "bg-orange-50", delay: 0.15 },
    { title: "Leave Requests",    value: pendingLeaves.toString(),       trendVal: "+2",   trend: "up"   as const, icon: CalendarDays,  color: "text-red-600",    bg: "bg-red-50",    delay: 0.2 },
    { title: "Completion Rate",   value: `${completionRate}%`,           trendVal: "+4%",  trend: "up"   as const, icon: CheckCircle2,  color: "text-green-600",  bg: "bg-green-50",  delay: 0.25 },
    { title: "Total Projects",    value: projects.length.toString(),     trendVal: "+2",   trend: "up"   as const, icon: TrendingUp,    color: "text-violet-600", bg: "bg-violet-50", delay: 0.3 },
    { title: "Documents",         value: projectDocuments.length.toString(), trendVal: "+5", trend: "up" as const, icon: Activity,     color: "text-teal-600",   bg: "bg-teal-50",   delay: 0.35 },
  ];

  // Chart data
  const attendanceData = [
    { name: "Jan", value: 90, target: 92 }, { name: "Feb", value: 92, target: 92 },
    { name: "Mar", value: 95, target: 93 }, { name: "Apr", value: 93, target: 93 },
    { name: "May", value: 96, target: 94 }, { name: "Jun", value: avgAttendance, target: 94 },
  ];

  const depts = ["CSE", "AI&DS", "IT", "ECE", "EEE"];
  const departmentData = depts.map(dept => ({
    name: dept, value: students.filter(s => s.department === dept).length,
  })).filter(d => d.value > 0);

  const perfOverview = [
    { name: "Attendance", score: Math.round(performanceData.reduce((s, p) => s + p.attendance, 0) / Math.max(performanceData.length, 1)) },
    { name: "Discipline",  score: Math.round(performanceData.reduce((s, p) => s + p.discipline, 0) / Math.max(performanceData.length, 1)) },
    { name: "Comm.",       score: Math.round(performanceData.reduce((s, p) => s + p.communication, 0) / Math.max(performanceData.length, 1)) },
    { name: "Tasks",       score: Math.round(performanceData.reduce((s, p) => s + p.taskCompletion, 0) / Math.max(performanceData.length, 1)) },
    { name: "Learning",    score: Math.round(performanceData.reduce((s, p) => s + p.learning, 0) / Math.max(performanceData.length, 1)) },
    { name: "Innovation",  score: Math.round(performanceData.reduce((s, p) => s + p.innovation, 0) / Math.max(performanceData.length, 1)) },
  ];

  const sprintData = [
    { name: "Wk1", done: 4, target: 8 }, { name: "Wk2", done: 9, target: 16 },
    { name: "Wk3", done: 16, target: 24 }, { name: "Wk4 (now)", done: 20, target: 28 },
  ];

  // Recent activities
  const recentActivities = [
    { user: students[0]?.name ?? "Alice Johnson", action: "submitted task completion report", time: "2h ago",   type: "task" },
    { user: staff[0]?.name ?? "Dr. Smith",         action: "approved leave request for INT003", time: "3h ago",   type: "leave" },
    { user: students[1]?.name ?? "Bob Smith",      action: "updated Healthcare AI project milestone", time: "5h ago",   type: "project" },
    { user: students[2]?.name ?? "Charlie Brown",  action: "completed internship program",       time: "1 day ago", type: "complete" },
    { user: staff[1]?.name ?? "Prof. Davis",       action: "reviewed Q2 performance report",    time: "2 days ago", type: "perf" },
  ];

  const activityIcon: Record<string, { icon: React.ElementType; color: string }> = {
    task:     { icon: CheckCircle2,  color: "text-green-500" },
    leave:    { icon: CalendarDays,  color: "text-orange-500" },
    project:  { icon: Briefcase,     color: "text-blue-500" },
    complete: { icon: Star,          color: "text-yellow-500" },
    perf:     { icon: TrendingUp,    color: "text-purple-500" },
  };

  // Upcoming tasks
  const upcomingTasks = tasks
    .filter(t => t.status !== "Completed")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  // Pending leave summary
  const pendingLeaveList = leaveRequests.filter(l => l.status === "Pending").slice(0, 4);

  // Sprint summary metrics from spec
  const SPRINT = {
    progress: 68, velocity: 42, storyCompletion: 74, blocked: 2,
    openBugs: 5, changeRequests: 3, serviceRequests: 4,
    completedStories: 28, remainingStories: 10, totalSP: 112,
    burndown: 64, teamCapacity: 86, remainingSP: 34,
  };

  return (
    <div className="space-y-7 pb-8">

      {/* ── PAGE HEADER ─────────────────────────────── */}
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Code Core IMS · Jun 25, 2026 · Sprint S01 in progress
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={() => setMessagesOpen(true)} className="bg-destructive hover:bg-destructive/90 text-white gap-2">
            <Mail size={15} /> {unreadCount} unread
          </Button>
        )}
      </div>

      {/* ── SECTION 1: KPIs ─────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Activity size={15} className="text-muted-foreground" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Overview</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map(k => <KpiCard key={k.title} {...k} />)}
        </div>
      </section>

      {/* ── SECTION 2: CHARTS ───────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={15} className="text-muted-foreground" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Analytics</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Attendance Trend */}
          <Card className="col-span-1 lg:col-span-2 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Attendance Trend</CardTitle>
                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-xs">{avgAttendance}% avg</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attendanceData}>
                    <defs>
                      <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} domain={[80, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "10px", fontSize: 12 }} />
                    <Area type="monotone" dataKey="value" name="Attendance" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#attGrad)" dot={{ r: 3, fill: "hsl(var(--primary))" }} />
                    <Line type="monotone" dataKey="target" name="Target" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Department Distribution */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Department Split</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[170px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={departmentData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={3} dataKey="value">
                      {departmentData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={(v, n) => [`${v} interns`, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
                {departmentData.map((e, i) => (
                  <div key={e.name} className="flex items-center gap-1 text-[10px]">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span>{e.name} ({e.value})</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Overview */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="col-span-1 lg:col-span-2 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Average Performance Overview</CardTitle>
                <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-xs">{avgPerf}% overall</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={perfOverview} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ borderRadius: "10px", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                    <Bar dataKey="score" name="Score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Team Performance radials */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Team Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Avg Attendance",  value: avgAttendance, color: "bg-green-500" },
                { label: "Task Completion", value: completionRate, color: "bg-blue-500" },
                { label: "Sprint Velocity", value: SPRINT.velocity, max: 60, color: "bg-purple-500" },
                { label: "Team Capacity",   value: SPRINT.teamCapacity, color: "bg-orange-500" },
              ].map(m => (
                <div key={m.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="font-semibold">{m.value}{typeof m.max === "undefined" ? "%" : ""}</span>
                  </div>
                  <Progress
                    value={typeof m.max !== "undefined" ? (m.value / m.max) * 100 : m.value}
                    className="h-1.5"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── SECTION 3: SPRINT ──────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap size={15} className="text-muted-foreground" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Sprint S01 — Jun 16–30, 2026</h2>
          </div>
          <Link href="/planway">
            <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
              View Board <ArrowRight size={12} />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
          {[
            { label: "Sprint Progress",      value: `${SPRINT.progress}%`,       color: "text-blue-600",   health: "good" },
            { label: "Velocity",             value: `${SPRINT.velocity} SP`,     color: "text-purple-600", health: "good" },
            { label: "Story Completion",     value: `${SPRINT.storyCompletion}%`,color: "text-green-600",  health: "good" },
            { label: "Blocked Stories",      value: SPRINT.blocked,              color: "text-red-600",    health: "bad"  },
            { label: "Open Bugs",            value: SPRINT.openBugs,             color: "text-orange-600", health: "warn" },
            { label: "Team Capacity",        value: `${SPRINT.teamCapacity}%`,   color: "text-teal-600",   health: "good" },
            { label: "Completed Stories",    value: SPRINT.completedStories,     color: "text-green-600",  health: "good" },
            { label: "Remaining Stories",    value: SPRINT.remainingStories,     color: "text-foreground", health: "ok"   },
            { label: "Total Story Points",   value: `${SPRINT.totalSP} SP`,      color: "text-foreground", health: "ok"   },
            { label: "Burndown Progress",    value: `${SPRINT.burndown}%`,       color: "text-blue-600",   health: "good" },
            { label: "Remaining SP",         value: `${SPRINT.remainingSP} SP`,  color: "text-orange-600", health: "warn" },
            { label: "Change Requests",      value: SPRINT.changeRequests,       color: "text-violet-600", health: "ok"   },
          ].map(m => {
            const borderMap: Record<string, string> = { good: "border-l-green-500", bad: "border-l-red-500", warn: "border-l-orange-500", ok: "border-l-slate-300" };
            return (
              <Card key={m.label} className={cn("shadow-sm border-l-4", borderMap[m.health])}>
                <CardContent className="p-3">
                  <p className="text-[10px] text-muted-foreground font-medium leading-tight">{m.label}</p>
                  <p className={cn("text-xl font-bold mt-1", m.color)}>{m.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Sprint burndown chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Sprint Burndown</CardTitle>
              <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200 border">🟢 Sprint Health: Healthy</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sprintData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Bar dataKey="target" name="Target" fill="hsl(var(--muted))" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="done"   name="Done"   fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t">
              {[
                { label: "Sprint Progress",   val: SPRINT.progress,      color: "bg-blue-500" },
                { label: "Story Completion",  val: SPRINT.storyCompletion, color: "bg-green-500" },
                { label: "Burndown",          val: SPRINT.burndown,      color: "bg-orange-500" },
              ].map(b => (
                <div key={b.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground text-[10px]">{b.label}</span>
                    <span className="font-bold text-[10px]">{b.val}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full", b.color)} style={{ width: `${b.val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── SECTION 4: ACTIVITIES + TASKS + LEAVES ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Clock size={15} className="text-muted-foreground" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Recent & Upcoming</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Recent Activities */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity size={14} /> Recent Activities
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recentActivities.map((a, i) => {
                const cfg = activityIcon[a.type] ?? activityIcon.task;
                const Icon = cfg.icon;
                return (
                  <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors border-b last:border-0">
                    <div className={cn("p-1.5 rounded-full bg-muted shrink-0 mt-0.5")}>
                      <Icon size={11} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-snug">
                        <span className="font-semibold">{a.user}</span>{" "}
                        <span className="text-muted-foreground">{a.action}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{a.time}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Upcoming Tasks */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Target size={14} /> Upcoming Tasks
                </CardTitle>
                <Link href="/tasks">
                  <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 gap-1">View all <ArrowRight size={10} /></Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingTasks.map(task => {
                const isOverdue = new Date(task.dueDate) < new Date();
                return (
                  <div key={task.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors border-b last:border-0">
                    <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5 shrink-0", {
                      "bg-red-500": task.priority === "Critical",
                      "bg-orange-500": task.priority === "High",
                      "bg-blue-500": task.priority === "Medium",
                      "bg-gray-400": task.priority === "Low",
                    })} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-snug truncate">{task.title}</p>
                      <p className="text-[10px] text-muted-foreground">{task.assignedTo.split(" ")[0]}</p>
                    </div>
                    <div className={cn("text-[10px] shrink-0 font-medium", isOverdue ? "text-red-500" : "text-muted-foreground")}>
                      {isOverdue && <AlertTriangle size={9} className="inline mr-0.5" />}
                      {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Pending Leaves */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CalendarDays size={14} /> Pending Leaves
                  {pendingLeaves > 0 && <Badge className="bg-orange-100 text-orange-700 border-orange-200 border text-[9px] px-1.5 h-4">{pendingLeaves}</Badge>}
                </CardTitle>
                <Link href="/leave">
                  <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 gap-1">Manage <ArrowRight size={10} /></Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {pendingLeaveList.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <CheckCircle2 size={24} className="mx-auto mb-2 text-green-500 opacity-60" />
                  No pending requests
                </div>
              ) : pendingLeaveList.map(l => (
                <div key={l.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 transition-colors border-b last:border-0">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-[9px] bg-orange-100 text-orange-700 font-bold">
                      {l.internName.split(" ").map((n: string) => n[0]).join("").substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{l.internName}</p>
                    <p className="text-[10px] text-muted-foreground">{l.type} · {l.duration} day{l.duration !== 1 ? "s" : ""}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] border-orange-200 bg-orange-50 text-orange-700 shrink-0">Pending</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── MESSAGES DIALOG ─────────────────────────── */}
      <Dialog open={messagesOpen} onOpenChange={setMessagesOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Mail size={18} /> Messages
                {unreadCount > 0 && <Badge className="bg-destructive text-white text-xs">{unreadCount} unread</Badge>}
              </DialogTitle>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs gap-1 mr-6" onClick={markAllRead}>
                  <MailOpen size={13} /> Mark all read
                </Button>
              )}
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-2 py-2">
              {messages.map(msg => (
                <div key={msg.id} className={cn("p-4 border rounded-xl transition-colors", !msg.read ? "bg-blue-50/60 border-blue-100" : "bg-card")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0", !msg.read ? "bg-blue-500" : "bg-transparent")} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{msg.sender}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{msg.category}</Badge>
                        </div>
                        <p className="font-medium text-sm mt-0.5">{msg.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{msg.preview}</p>
                        <p className="text-[10px] text-muted-foreground mt-1.5">{msg.dateTime}</p>
                      </div>
                    </div>
                    {!msg.read && (
                      <Button size="sm" variant="outline" className="text-xs shrink-0 gap-1 h-7" onClick={() => markRead(msg.id)}>
                        <MailOpen size={12} /> Mark read
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
