import { useState } from "react";
import {
  Users, ClipboardCheck, Clock, CheckCircle2, Calendar as CalendarIcon,
  AlertTriangle, FolderOpen, Plus, X, TrendingUp, Bell, Activity,
  CalendarDays, Briefcase
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { students, tasks, leaveRequests, projects, notifications } from "@/data/mockData";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

type LeaveStatus = "Pending" | "Approved" | "Rejected";

interface StaffLeave {
  id: string;
  type: string;
  fromDate: string;
  toDate: string;
  days: number;
  status: LeaveStatus;
  appliedDate: string;
  reason: string;
  rejectionReason?: string;
}

const INITIAL_LEAVES: StaffLeave[] = [
  { id: "SLR001", type: "Sick", fromDate: "2024-04-10", toDate: "2024-04-11", days: 2, status: "Approved", appliedDate: "2024-04-08", reason: "Fever and cold." },
  { id: "SLR002", type: "Casual", fromDate: "2024-05-20", toDate: "2024-05-20", days: 1, status: "Pending", appliedDate: "2024-05-18", reason: "Family function." },
  { id: "SLR003", type: "Personal", fromDate: "2024-03-05", toDate: "2024-03-06", days: 2, status: "Rejected", appliedDate: "2024-03-03", reason: "Personal errands.", rejectionReason: "Insufficient leave balance." },
  { id: "SLR004", type: "Emergency", fromDate: "2024-06-15", toDate: "2024-06-15", days: 1, status: "Approved", appliedDate: "2024-06-14", reason: "Medical emergency for family member." },
];

const LEAVE_QUOTA: Record<string, number> = { Sick: 10, Casual: 6, Emergency: 4 };
const LEAVE_TYPES = ["Sick", "Casual", "Personal", "Emergency", "Maternity", "Paternity"];

const STATUS_COLORS: Record<LeaveStatus, string> = {
  Approved: "text-green-700 bg-green-50 border-green-200",
  Pending:  "text-orange-700 bg-orange-50 border-orange-200",
  Rejected: "text-red-700 bg-red-50 border-red-200",
};

export default function StaffDashboard() {
  const { toast } = useToast();
  const myInterns = students.filter(s => s.mentor === "Dr. Smith" || s.mentor === "Prof. Davis").slice(0, 4);
  const pendingTasks = tasks.filter(t => t.status === "In Progress");
  const pendingLeaves = leaveRequests.filter(l => l.status === "Pending");
  const myProjects = projects.filter(p => p.assignedStaff.includes("EMP001") || p.assignedStaff.includes("EMP002"));

  const [leaveList, setLeaveList] = useState<StaffLeave[]>(INITIAL_LEAVES);
  const [leaveTab, setLeaveTab] = useState<"apply" | "history" | "balance">("history");
  const [historyFilter, setHistoryFilter] = useState<"All" | LeaveStatus>("All");

  const [leaveForm, setLeaveForm] = useState({
    type: "", fromDate: "", toDate: "", reason: "",
  });

  const calcDays = (from: string, to: string) => {
    if (!from || !to) return 0;
    const diff = new Date(to).getTime() - new Date(from).getTime();
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
  };

  const handleApplyLeave = () => {
    if (!leaveForm.type || !leaveForm.fromDate || !leaveForm.toDate || !leaveForm.reason.trim()) {
      toast({ title: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    const days = calcDays(leaveForm.fromDate, leaveForm.toDate);
    const newLeave: StaffLeave = {
      id: `SLR${Date.now()}`,
      type: leaveForm.type,
      fromDate: leaveForm.fromDate,
      toDate: leaveForm.toDate,
      days,
      status: "Pending",
      appliedDate: new Date().toISOString().slice(0, 10),
      reason: leaveForm.reason,
    };
    setLeaveList(prev => [newLeave, ...prev]);
    setLeaveForm({ type: "", fromDate: "", toDate: "", reason: "" });
    setLeaveTab("history");
    toast({ title: "Leave Applied", description: `Your ${leaveForm.type} leave request has been submitted.` });
  };

  const filteredLeaves = leaveList.filter(l =>
    historyFilter === "All" || l.status === historyFilter
  );

  const totalDays = 20;
  const usedDays = leaveList.filter(l => l.status === "Approved").reduce((s, l) => s + l.days, 0);
  const remainingDays = totalDays - usedDays;

  const usedByType = LEAVE_TYPES.reduce<Record<string, number>>((acc, t) => {
    acc[t] = leaveList.filter(l => l.status === "Approved" && l.type === t).reduce((s, l) => s + l.days, 0);
    return acc;
  }, {});

  const recentActivities = [
    { icon: CheckCircle2, color: "text-green-600", text: "Approved Alice Johnson's leave request", time: "2h ago" },
    { icon: ClipboardCheck, color: "text-blue-600", text: "Reviewed 'Dashboard Charts' task submission", time: "3h ago" },
    { icon: AlertTriangle, color: "text-orange-500", text: "Flagged low attendance for Bob Smith", time: "5h ago" },
    { icon: FolderOpen, color: "text-indigo-600", text: "Updated AI Chatbot project milestone", time: "1d ago" },
    { icon: Bell, color: "text-purple-600", text: "Sent performance report to HR", time: "2d ago" },
  ];

  const upcomingTasks = tasks
    .filter(t => t.status !== "Completed")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4);

  const staffNotifications = notifications.filter(n => !n.read).slice(0, 4);

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Staff Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back. Here's what's happening with your interns.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { title: "My Interns",     value: myInterns.length,     icon: Users,        color: "text-blue-500",   bg: "bg-blue-100" },
          { title: "Active Tasks",   value: pendingTasks.length,  icon: ClipboardCheck,color: "text-indigo-500", bg: "bg-indigo-100" },
          { title: "My Projects",    value: myProjects.length,    icon: FolderOpen,   color: "text-violet-600", bg: "bg-violet-100" },
          { title: "Leave Requests", value: pendingLeaves.length, icon: Clock,        color: "text-red-500",    bg: "bg-red-100" },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                <h3 className="text-2xl font-bold mt-1">{kpi.value}</h3>
              </div>
              <div className={`p-3 rounded-full ${kpi.bg} ${kpi.color}`}>
                <kpi.icon size={20} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* My Interns + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My Interns</CardTitle>
            <Link href="/students" className="text-sm text-primary hover:underline">View All</Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {myInterns.map(intern => (
                <Link key={intern.id} href={`/students/${intern.id}`}>
                  <div className="p-4 border rounded-xl hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {intern.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold text-sm">{intern.name}</h4>
                        <p className="text-xs text-muted-foreground">{intern.project}</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{intern.progress}%</span>
                      </div>
                      <Progress value={intern.progress} className="h-1.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Performance Alerts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-red-50 text-red-900 border border-red-100 rounded-lg flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium text-sm">Low Attendance</h4>
                <p className="text-xs mt-1 text-red-700">Bob Smith has missed 3 days this week. Review required.</p>
              </div>
            </div>
            <div className="p-3 bg-orange-50 text-orange-900 border border-orange-100 rounded-lg flex items-start gap-3">
              <AlertTriangle size={18} className="text-orange-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-medium text-sm">Missed Deadline</h4>
                <p className="text-xs mt-1 text-orange-700">Diana Prince missed the API design deadline.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Summary + Upcoming Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Activity size={18} /> Attendance Summary</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Days Present (June)", value: 18, total: 20, color: "bg-green-500" },
              { label: "Days Absent", value: 2, total: 20, color: "bg-red-400" },
              { label: "Attendance Rate", value: 90, total: 100, color: "bg-blue-500" },
            ].map((item, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-semibold">{item.label.includes("Rate") ? `${item.value}%` : `${item.value}/${item.total}`}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${(item.value / item.total) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {[
                { label: "On Time", value: "16", color: "text-green-600 bg-green-50" },
                { label: "Late", value: "2", color: "text-orange-600 bg-orange-50" },
                { label: "Half Day", value: "1", color: "text-blue-600 bg-blue-50" },
              ].map((s, i) => (
                <div key={i} className={`text-center p-2 rounded-lg ${s.color}`}>
                  <p className="text-lg font-bold">{s.value}</p>
                  <p className="text-xs font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase size={18} /> Upcoming Tasks</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {upcomingTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">By {task.assignedTo}</p>
                </div>
                <div className="flex flex-col items-end gap-1 ml-3 shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    task.priority === "Critical" ? "bg-red-100 text-red-700" :
                    task.priority === "High" ? "bg-orange-100 text-orange-700" :
                    "bg-blue-100 text-blue-700"
                  }`}>
                    {task.priority}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Leave Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays size={18} /> Leave Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1 mb-5 bg-muted/40 p-1 rounded-lg w-fit">
            {(["apply", "history", "balance"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setLeaveTab(tab)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                  leaveTab === tab
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "apply" ? "Apply Leave" : tab === "history" ? "Leave History" : "Leave Balance"}
              </button>
            ))}
          </div>

          {leaveTab === "apply" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Leave Type <span className="text-destructive">*</span></Label>
                  <Select value={leaveForm.type} onValueChange={v => setLeaveForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {LEAVE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Days</Label>
                  <div className="h-10 border rounded-md px-3 flex items-center text-sm text-muted-foreground">
                    {calcDays(leaveForm.fromDate, leaveForm.toDate)} day{calcDays(leaveForm.fromDate, leaveForm.toDate) !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>From Date <span className="text-destructive">*</span></Label>
                  <Input type="date" value={leaveForm.fromDate} onChange={e => setLeaveForm(f => ({ ...f, fromDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>To Date <span className="text-destructive">*</span></Label>
                  <Input type="date" value={leaveForm.toDate} onChange={e => setLeaveForm(f => ({ ...f, toDate: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Reason <span className="text-destructive">*</span></Label>
                <Textarea
                  placeholder="Provide a reason for your leave request…"
                  rows={3}
                  value={leaveForm.reason}
                  onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))}
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleApplyLeave}>Submit Leave Request</Button>
                <Button variant="outline" onClick={() => setLeaveForm({ type: "", fromDate: "", toDate: "", reason: "" })}>
                  Clear
                </Button>
              </div>
            </motion.div>
          )}

          {leaveTab === "history" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex gap-1 mb-4">
                {(["All", "Pending", "Approved", "Rejected"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setHistoryFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      historyFilter === f
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {filteredLeaves.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No leave requests found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Applied</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reason / Rejection</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLeaves.map(leave => (
                        <TableRow key={leave.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium text-sm">{leave.type}</TableCell>
                          <TableCell className="text-sm">{leave.fromDate}</TableCell>
                          <TableCell className="text-sm">{leave.toDate}</TableCell>
                          <TableCell className="text-sm">{leave.days}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{leave.appliedDate}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${STATUS_COLORS[leave.status]}`}>
                              {leave.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <p className="text-xs text-muted-foreground truncate">{leave.reason}</p>
                            {leave.status === "Rejected" && leave.rejectionReason && (
                              <div className="mt-1 flex items-start gap-1">
                                <X size={11} className="text-red-500 mt-0.5 shrink-0" />
                                <p className="text-xs text-red-600 font-medium">
                                  Reason: "{leave.rejectionReason}"
                                </p>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </motion.div>
          )}

          {leaveTab === "balance" && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Total Leave", value: totalDays, color: "bg-blue-500", text: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Used", value: usedDays, color: "bg-orange-500", text: "text-orange-600", bg: "bg-orange-50" },
                  { label: "Remaining", value: remainingDays, color: "bg-green-500", text: "text-green-600", bg: "bg-green-50" },
                ].map((s, i) => (
                  <div key={i} className={`text-center p-4 rounded-xl ${s.bg}`}>
                    <p className={`text-3xl font-bold ${s.text}`}>{s.value}</p>
                    <p className={`text-sm font-medium ${s.text} mt-1`}>{s.label}</p>
                    <p className="text-xs text-muted-foreground">days</p>
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Used / Total</span>
                  <span>{usedDays} / {totalDays} days</span>
                </div>
                <Progress value={(usedDays / totalDays) * 100} className="h-2.5" />
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">By Leave Type</h4>
                {Object.entries(LEAVE_QUOTA).map(([type, quota]) => {
                  const used = usedByType[type] ?? 0;
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{type} Leave</span>
                        <span className="text-muted-foreground">{used} / {quota} days used</span>
                      </div>
                      <Progress value={(used / quota) * 100} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Pending Reviews + Upcoming Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Pending Reviews</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingTasks.slice(0, 4).map(task => (
                <div key={task.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                  <div>
                    <h4 className="font-medium text-sm">{task.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">By {task.assignedTo}</p>
                  </div>
                  <Badge variant="secondary">In Progress</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Upcoming Deadlines</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/30">
                <div className="flex gap-3 items-center">
                  <div className="bg-muted p-2 rounded-md"><CalendarIcon size={16} /></div>
                  <div>
                    <h4 className="font-medium text-sm">Mid-term Evaluations</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">All CSE Interns</p>
                  </div>
                </div>
                <div className="text-xs font-medium text-red-500">Tomorrow</div>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg hover:bg-muted/30">
                <div className="flex gap-3 items-center">
                  <div className="bg-muted p-2 rounded-md"><CalendarIcon size={16} /></div>
                  <div>
                    <h4 className="font-medium text-sm">Project Presentations</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">AI&DS Batch</p>
                  </div>
                </div>
                <div className="text-xs font-medium text-orange-500">In 3 days</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications + Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell size={18} /> Notifications
              {staffNotifications.length > 0 && (
                <Badge className="ml-1 text-xs">{staffNotifications.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {staffNotifications.map(n => (
              <div key={n.id} className="flex gap-3 p-3 border rounded-lg hover:bg-muted/20 transition-colors">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{n.time}</p>
                </div>
                <Badge variant="outline" className="text-[10px] h-5 shrink-0">{n.category}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity size={18} /> Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.map((act, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`p-1.5 rounded-full bg-muted shrink-0 ${act.color}`}>
                  <act.icon size={13} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">{act.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{act.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
