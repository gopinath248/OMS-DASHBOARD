import { useState } from "react";
import {
  Search, Filter, GripVertical, Bug, RefreshCw, Ticket, ClipboardList,
  Zap, CheckCircle2, Clock, AlertTriangle, BarChart3, Users, Flame,
  MessageSquare, Paperclip, FileText, Upload, Download, Trash2, Eye,
  ChevronDown, Plus, Activity, FolderOpen, List, LayoutDashboard,
  TrendingUp, CalendarDays, ChevronUp, ChevronsUpDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

// ─── TYPES ───────────────────────────────────────────────────────────────────
type Tab = "summary" | "backlog" | "board" | "timeline" | "reports" | "documents";
type Priority = "Critical" | "High" | "Medium" | "Low";
type StoryStatus = "To Do" | "In Progress" | "Testing" | "Review" | "Done Story" | "Blocked Story";
type TicketType = "CC26BUG" | "CC26CR" | "CC26SR" | "CC26IPM" | "CC26EPIC";

interface Ticket {
  id: string; type: TicketType; title: string; assignee: string;
  priority: Priority; estimatedHours: number; dueDate: string;
  storyPoints: number; comments: number; attachments: number;
  progress: number; labels: string[]; status: StoryStatus;
}
interface Sprint {
  id: string; name: string; duration: string; startDate: string;
  endDate: string; status: "Active" | "Planned" | "Completed";
  goal: string; capacity: number; velocity: number; tickets: Ticket[];
}
interface Doc { id: string; name: string; type: string; size: string; uploadedBy: string; date: string; category: string; }

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const TICKET_CONFIG: Record<TicketType, { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  CC26BUG:  { label: "Bug",             icon: Bug,           color: "text-red-700",    bg: "bg-red-100",    border: "border-red-300" },
  CC26CR:   { label: "Change Request",  icon: RefreshCw,     color: "text-orange-700", bg: "bg-orange-100", border: "border-orange-300" },
  CC26SR:   { label: "Service Request", icon: Ticket,        color: "text-purple-700", bg: "bg-purple-100", border: "border-purple-300" },
  CC26IPM:  { label: "Internal PM",     icon: ClipboardList, color: "text-blue-700",   bg: "bg-blue-100",   border: "border-blue-300" },
  CC26EPIC: { label: "Epic",            icon: Zap,           color: "text-indigo-700", bg: "bg-indigo-100", border: "border-indigo-300" },
};
const PRIORITY_CONFIG: Record<Priority, { color: string; bg: string; dot: string }> = {
  Critical: { color: "text-red-700",    bg: "bg-red-100",    dot: "bg-red-500" },
  High:     { color: "text-orange-700", bg: "bg-orange-100", dot: "bg-orange-500" },
  Medium:   { color: "text-yellow-700", bg: "bg-yellow-100", dot: "bg-yellow-500" },
  Low:      { color: "text-green-700",  bg: "bg-green-100",  dot: "bg-green-500" },
};
const BOARD_COLS: { id: StoryStatus; label: string; top: string; hbg: string }[] = [
  { id: "To Do",         label: "To Do",       top: "border-t-slate-400",  hbg: "bg-slate-50" },
  { id: "In Progress",   label: "In Progress", top: "border-t-blue-500",   hbg: "bg-blue-50" },
  { id: "Review",        label: "Review",      top: "border-t-amber-500",  hbg: "bg-amber-50" },
  { id: "Testing",       label: "Testing",     top: "border-t-violet-500", hbg: "bg-violet-50" },
  { id: "Done Story",    label: "Done",        top: "border-t-green-500",  hbg: "bg-green-50" },
  { id: "Blocked Story", label: "Blocked",     top: "border-t-red-500",    hbg: "bg-red-50" },
];
const STATUS_BADGE: Record<Sprint["status"], string> = {
  Active: "bg-green-100 text-green-700 border-green-200",
  Planned: "bg-blue-100 text-blue-700 border-blue-200",
  Completed: "bg-gray-100 text-gray-500 border-gray-200",
};
const PIE_COLORS = ["#94a3b8","#3b82f6","#f59e0b","#8b5cf6","#22c55e","#ef4444"];
const CHART_COLORS = ["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6"];

// ─── DATA ────────────────────────────────────────────────────────────────────
const SPRINTS: Sprint[] = [
  {
    id: "S01", name: "Task Management Sprint", duration: "Jun 16 – Jun 30",
    startDate: "2026-06-16", endDate: "2026-06-30", status: "Active",
    goal: "Deliver core task management module with authentication, dashboards, and CI/CD pipeline.",
    capacity: 85, velocity: 42,
    tickets: [
      { id:"CC26EPIC-001", type:"CC26EPIC", title:"Core Platform Architecture",       assignee:"Alice Johnson",  priority:"Critical", estimatedHours:20, dueDate:"2026-06-30", storyPoints:13, comments:5, attachments:3, progress:60,  labels:["Architecture","Backend"], status:"In Progress" },
      { id:"CC26BUG-001",  type:"CC26BUG",  title:"Fix Authentication Token Expiry",  assignee:"Bob Smith",      priority:"Critical", estimatedHours:6,  dueDate:"2026-06-22", storyPoints:3,  comments:6, attachments:1, progress:100, labels:["Bug","Security"],        status:"Done Story" },
      { id:"CC26BUG-002",  type:"CC26BUG",  title:"Payment Module Crash on Submit",   assignee:"Diana Prince",   priority:"High",     estimatedHours:4,  dueDate:"2026-06-25", storyPoints:2,  comments:3, attachments:0, progress:0,   labels:["Bug","Payments"],        status:"To Do" },
      { id:"CC26CR-001",   type:"CC26CR",   title:"UI/UX Review & Redesign",          assignee:"Grace Kim",      priority:"Low",      estimatedHours:16, dueDate:"2026-06-21", storyPoints:8,  comments:7, attachments:5, progress:95,  labels:["Design","UX"],           status:"Review" },
      { id:"CC26CR-002",   type:"CC26CR",   title:"Database Schema Migration v2",     assignee:"Bob Smith",      priority:"High",     estimatedHours:6,  dueDate:"2026-06-20", storyPoints:3,  comments:2, attachments:1, progress:100, labels:["DB","Migration"],        status:"Done Story" },
      { id:"CC26SR-001",   type:"CC26SR",   title:"Set Up CI/CD Pipeline",            assignee:"Henry Wilson",   priority:"High",     estimatedHours:12, dueDate:"2026-06-24", storyPoints:5,  comments:2, attachments:2, progress:60,  labels:["DevOps","CI/CD"],        status:"In Progress" },
      { id:"CC26SR-002",   type:"CC26SR",   title:"API Rate Limiting Implementation", assignee:"Mia Martinez",   priority:"High",     estimatedHours:8,  dueDate:"2026-06-22", storyPoints:5,  comments:3, attachments:1, progress:80,  labels:["Backend","Security"],    status:"Testing" },
      { id:"CC26IPM-001",  type:"CC26IPM",  title:"Implement Dashboard Charts",       assignee:"Alice Johnson",  priority:"High",     estimatedHours:10, dueDate:"2026-06-23", storyPoints:5,  comments:3, attachments:3, progress:55,  labels:["Frontend","UI"],         status:"In Progress" },
      { id:"CC26IPM-002",  type:"CC26IPM",  title:"ML Model Integration",             assignee:"Deepika K",      priority:"Critical", estimatedHours:20, dueDate:"2026-06-20", storyPoints:13, comments:5, attachments:4, progress:95,  labels:["AI/ML","Backend"],       status:"Review" },
      { id:"CC26IPM-003",  type:"CC26IPM",  title:"Intern Onboarding Documentation",  assignee:"Rachel Wilson",  priority:"Low",      estimatedHours:4,  dueDate:"2026-06-27", storyPoints:2,  comments:1, attachments:0, progress:20,  labels:["Docs","HR"],             status:"To Do" },
      { id:"CC26IPM-004",  type:"CC26IPM",  title:"Security Penetration Testing",     assignee:"Paul Anderson",  priority:"Critical", estimatedHours:16, dueDate:"2026-06-28", storyPoints:8,  comments:2, attachments:2, progress:45,  labels:["Security","Testing"],    status:"Testing" },
      { id:"CC26IPM-005",  type:"CC26IPM",  title:"Performance Benchmarking Report",  assignee:"Liam Young",     priority:"Medium",   estimatedHours:6,  dueDate:"2026-06-28", storyPoints:2,  comments:0, attachments:0, progress:0,   labels:["Perf","Report"],         status:"To Do" },
      { id:"CC26EPIC-002", type:"CC26EPIC", title:"User Management System",           assignee:"Frank Miller",   priority:"Medium",   estimatedHours:8,  dueDate:"2026-06-30", storyPoints:3,  comments:1, attachments:0, progress:0,   labels:["Auth","Backend"],        status:"Blocked Story" },
    ],
  },
  {
    id: "S02", name: "Feature Sprint", duration: "Jul 1 – Jul 15",
    startDate: "2026-07-01", endDate: "2026-07-15", status: "Planned",
    goal: "Implement dark mode, query optimizations, IoT data ingestion, and weekly progress automation.",
    capacity: 80, velocity: 38,
    tickets: [
      { id:"CC26IPM-006", type:"CC26IPM", title:"Dark Mode Support",          assignee:"Quinn Davis",  priority:"Low",    estimatedHours:8,  dueDate:"2026-07-05", storyPoints:3,  comments:1, attachments:1, progress:0, labels:["UI","Frontend"],   status:"To Do" },
      { id:"CC26IPM-007", type:"CC26IPM", title:"Optimize Database Queries",  assignee:"Sam Taylor",   priority:"High",   estimatedHours:10, dueDate:"2026-07-08", storyPoints:5,  comments:0, attachments:0, progress:0, labels:["DB","Perf"],       status:"To Do" },
      { id:"CC26SR-003",  type:"CC26SR",  title:"IoT Data Ingestion Service", assignee:"Diana Prince", priority:"High",   estimatedHours:16, dueDate:"2026-07-10", storyPoints:8,  comments:0, attachments:0, progress:0, labels:["IoT","Backend"],   status:"To Do" },
      { id:"CC26CR-003",  type:"CC26CR",  title:"Weekly Progress Automation", assignee:"Eve Davis",    priority:"Medium", estimatedHours:6,  dueDate:"2026-07-12", storyPoints:3,  comments:0, attachments:0, progress:0, labels:["Automation","HR"], status:"To Do" },
    ],
  },
  {
    id: "S03", name: "Bug Fix Sprint", duration: "Jul 16 – Jul 31",
    startDate: "2026-07-16", endDate: "2026-07-31", status: "Planned",
    goal: "Resolve critical production bugs and improve system stability.",
    capacity: 75, velocity: 35,
    tickets: [
      { id:"CC26BUG-003", type:"CC26BUG", title:"API Timeout on Large Datasets", assignee:"Bob Smith",    priority:"High",   estimatedHours:8,  dueDate:"2026-07-20", storyPoints:5, comments:0, attachments:0, progress:0, labels:["API","Perf"],     status:"To Do" },
      { id:"CC26BUG-004", type:"CC26BUG", title:"Export PDF Encoding Issue",     assignee:"Mia Martinez", priority:"Medium", estimatedHours:4,  dueDate:"2026-07-22", storyPoints:2, comments:0, attachments:0, progress:0, labels:["Export","Bug"],   status:"To Do" },
      { id:"CC26SR-004",  type:"CC26SR",  title:"Cache Invalidation Refactor",   assignee:"Henry Wilson", priority:"High",   estimatedHours:12, dueDate:"2026-07-28", storyPoints:5, comments:0, attachments:0, progress:0, labels:["Backend","Cache"],status:"To Do" },
    ],
  },
  {
    id: "S04", name: "Optimization Sprint", duration: "Aug 1 – Aug 15",
    startDate: "2026-08-01", endDate: "2026-08-15", status: "Planned",
    goal: "Performance optimizations, accessibility improvements, and mobile responsiveness.",
    capacity: 80, velocity: 40,
    tickets: [
      { id:"CC26IPM-008", type:"CC26IPM", title:"Accessibility Audit & Fixes", assignee:"Karen Lee",     priority:"Low",      estimatedHours:8,  dueDate:"2026-08-08", storyPoints:2,  comments:0, attachments:0, progress:0, labels:["A11y","QA"],   status:"To Do" },
      { id:"CC26CR-004",  type:"CC26CR",  title:"Mobile Responsive Overhaul",  assignee:"Grace Kim",     priority:"High",     estimatedHours:16, dueDate:"2026-08-12", storyPoints:8,  comments:0, attachments:0, progress:0, labels:["Mobile","UI"], status:"To Do" },
      { id:"CC26EPIC-003",type:"CC26EPIC",title:"Multi-tenant Architecture",    assignee:"Alice Johnson", priority:"Critical", estimatedHours:24, dueDate:"2026-08-15", storyPoints:13, comments:0, attachments:0, progress:0, labels:["Architecture"],status:"To Do" },
    ],
  },
  {
    id: "S00", name: "Foundation Sprint", duration: "May 16 – May 31",
    startDate: "2026-05-16", endDate: "2026-05-31", status: "Completed",
    goal: "Establish project foundation, tooling, and initial prototypes.",
    capacity: 90, velocity: 42, tickets: [],
  },
];

const MOCK_DOCS: Doc[] = [
  { id:"D01", name:"Sprint Planning Document S01", type:"PDF",  size:"234 KB", uploadedBy:"Alice Johnson", date:"2026-06-16", category:"Planning" },
  { id:"D02", name:"API Architecture Design",      type:"DOCX", size:"89 KB",  uploadedBy:"Bob Smith",     date:"2026-06-17", category:"Technical" },
  { id:"D03", name:"UI/UX Wireframes v2.0",        type:"PDF",  size:"1.2 MB", uploadedBy:"Grace Kim",     date:"2026-06-18", category:"Design" },
  { id:"D04", name:"Database Schema v2",           type:"PDF",  size:"156 KB", uploadedBy:"Bob Smith",     date:"2026-06-20", category:"Technical" },
  { id:"D05", name:"Sprint Retrospective Notes",   type:"DOCX", size:"45 KB",  uploadedBy:"Sarah Lee",     date:"2026-06-21", category:"Meeting" },
  { id:"D06", name:"Security Audit Report",        type:"PDF",  size:"892 KB", uploadedBy:"Paul Anderson", date:"2026-06-25", category:"Security" },
  { id:"D07", name:"CI/CD Pipeline Setup Guide",   type:"DOCX", size:"123 KB", uploadedBy:"Henry Wilson",  date:"2026-06-24", category:"DevOps" },
  { id:"D08", name:"Performance Benchmarks",       type:"XLSX", size:"234 KB", uploadedBy:"Liam Young",    date:"2026-06-26", category:"Report" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function initials(name: string) { return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase(); }
const LABEL_COLORS = ["bg-blue-100 text-blue-700","bg-purple-100 text-purple-700","bg-green-100 text-green-700","bg-orange-100 text-orange-700","bg-teal-100 text-teal-700","bg-rose-100 text-rose-700"];
function labelColor(l: string) { let h = 0; for (let i = 0; i < l.length; i++) h = l.charCodeAt(i) + ((h << 5) - h); return LABEL_COLORS[Math.abs(h) % LABEL_COLORS.length]; }

// ─── TICKET CARD ─────────────────────────────────────────────────────────────
function TicketCard({ ticket, isDragging, onDragStart, onDragEnd }: {
  ticket: Ticket; isDragging: boolean; onDragStart: (id: string) => void; onDragEnd: () => void;
}) {
  const p = PRIORITY_CONFIG[ticket.priority];
  const t = TICKET_CONFIG[ticket.type];
  const TypeIcon = t.icon;
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: isDragging ? 0.4 : 1, scale: 1 }} exit={{ opacity: 0 }}
      draggable onDragStart={() => onDragStart(ticket.id)} onDragEnd={onDragEnd}
      className={cn("bg-card border rounded-xl p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all select-none", isDragging && "ring-2 ring-primary/40")}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={cn("flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border", t.bg, t.color, t.border)}>
          <TypeIcon size={9} />{ticket.id}
        </div>
        <GripVertical size={11} className="text-muted-foreground/40" />
      </div>
      <p className="text-sm font-semibold leading-snug mb-2 line-clamp-2">{ticket.title}</p>
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span className={cn("inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full", p.bg, p.color)}>
          <span className={cn("w-1.5 h-1.5 rounded-full", p.dot)} />{ticket.priority}
        </span>
        <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{ticket.storyPoints}sp</span>
      </div>
      {ticket.labels.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-2">
          {ticket.labels.slice(0, 2).map(l => <span key={l} className={cn("text-[8px] px-1.5 py-0.5 rounded font-medium", labelColor(l))}>{l}</span>)}
        </div>
      )}
      <Progress value={ticket.progress} className="h-1 mb-2" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Avatar className="h-5 w-5"><AvatarFallback className="bg-primary/10 text-primary text-[8px] font-bold">{initials(ticket.assignee)}</AvatarFallback></Avatar>
          <span className="text-[9px] text-muted-foreground truncate max-w-[70px]">{ticket.assignee.split(" ")[0]}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span className="flex items-center gap-0.5 text-[9px]"><MessageSquare size={9} />{ticket.comments}</span>
          <span className="flex items-center gap-0.5 text-[9px]"><Paperclip size={9} />{ticket.attachments}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── SUMMARY TAB ─────────────────────────────────────────────────────────────
function SummaryTab({ sprint }: { sprint: Sprint }) {
  const total = sprint.tickets.length;
  const done = sprint.tickets.filter(t => t.status === "Done Story").length;
  const blocked = sprint.tickets.filter(t => t.status === "Blocked Story").length;
  const pending = total - done - blocked;
  const pct = total ? Math.round(done / total * 100) : 0;
  const totalSP = sprint.tickets.reduce((a, b) => a + b.storyPoints, 0);
  const doneSP = sprint.tickets.filter(t => t.status === "Done Story").reduce((a, b) => a + b.storyPoints, 0);
  const recentActivity = [...sprint.tickets].sort((a, b) => b.progress - a.progress).slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Sprint overview card */}
      <Card className="shadow-sm">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h2 className="text-lg font-bold">{sprint.name}</h2>
                <Badge variant="outline" className={cn("text-xs font-semibold", STATUS_BADGE[sprint.status])}>{sprint.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5">
                <CalendarDays size={13} /> {sprint.duration}
              </p>
              <p className="text-sm text-muted-foreground/80 italic leading-relaxed">Goal: {sprint.goal}</p>
            </div>
            <div className="flex gap-6 text-center shrink-0">
              <div><p className="text-2xl font-bold text-primary">{sprint.velocity}</p><p className="text-xs text-muted-foreground">Velocity</p></div>
              <div><p className="text-2xl font-bold">{sprint.capacity}%</p><p className="text-xs text-muted-foreground">Capacity</p></div>
              <div><p className="text-2xl font-bold">{totalSP}sp</p><p className="text-xs text-muted-foreground">Total Points</p></div>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-medium">Sprint Progress</span>
              <span className="font-bold text-primary">{pct}%</span>
            </div>
            <Progress value={pct} className="h-2.5" />
            <p className="text-xs text-muted-foreground mt-1">{doneSP} of {totalSP} story points completed</p>
          </div>
        </CardContent>
      </Card>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Tasks",  value: total,   icon: BarChart3,    bg: "bg-blue-50",   icon_c: "text-blue-600" },
          { label: "Completed",    value: done,    icon: CheckCircle2, bg: "bg-green-50",  icon_c: "text-green-600" },
          { label: "Pending",      value: pending, icon: Clock,        bg: "bg-amber-50",  icon_c: "text-amber-600" },
          { label: "Blocked",      value: blocked, icon: AlertTriangle,bg: "bg-red-50",    icon_c: "text-red-600" },
        ].map(s => (
          <Card key={s.label} className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", s.bg)}>
                <s.icon size={18} className={s.icon_c} />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 pt-4 px-5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><Activity size={15} /> Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4 space-y-2">
          {recentActivity.length === 0
            ? <p className="text-sm text-muted-foreground py-4 text-center">No tickets yet in this sprint.</p>
            : recentActivity.map(t => {
              const cfg = TICKET_CONFIG[t.type];
              const Icon = cfg.icon;
              const p = PRIORITY_CONFIG[t.priority];
              return (
                <div key={t.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0", cfg.bg)}>
                    <Icon size={11} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.id} · {t.assignee}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", p.bg, p.color)}>{t.priority}</span>
                    <span className="text-xs text-muted-foreground">{t.progress}%</span>
                  </div>
                </div>
              );
            })
          }
        </CardContent>
      </Card>
    </div>
  );
}

// ─── BACKLOG TAB ─────────────────────────────────────────────────────────────
type SortKey = "id" | "title" | "priority" | "assignee" | "status" | "storyPoints" | "dueDate";

function BacklogTab({ sprint }: { sprint: Sprint }) {
  const [search, setSearch] = useState("");
  const [pf, setPf] = useState("all");
  const [tf, setTf] = useState("all");
  const [sf, setSf] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  const PRIORITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

  const filtered = sprint.tickets.filter(t =>
    (search === "" || t.title.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase())) &&
    (pf === "all" || t.priority === pf) &&
    (tf === "all" || t.type === tf) &&
    (sf === "all" || t.status === sf)
  ).sort((a, b) => {
    let cmp = 0;
    if (sortKey === "priority") cmp = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    else if (sortKey === "storyPoints") cmp = a.storyPoints - b.storyPoints;
    else cmp = String(a[sortKey]).localeCompare(String(b[sortKey]));
    return sortAsc ? cmp : -cmp;
  });

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageData = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const toggleSort = (k: SortKey) => { if (sortKey === k) setSortAsc(s => !s); else { setSortKey(k); setSortAsc(true); } setPage(1); };
  const SortIcon = ({ k }: { k: SortKey }) => sortKey === k ? (sortAsc ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <ChevronsUpDown size={11} className="opacity-30" />;

  const STATUS_COL: Record<StoryStatus, string> = {
    "To Do": "bg-slate-100 text-slate-600", "In Progress": "bg-blue-100 text-blue-700",
    "Review": "bg-amber-100 text-amber-700", "Testing": "bg-violet-100 text-violet-700",
    "Done Story": "bg-green-100 text-green-700", "Blocked Story": "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search tickets…" className="pl-8 h-9 text-sm" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={pf} onValueChange={v => { setPf(v); setPage(1); }}>
          <SelectTrigger className="w-32 h-9 text-xs"><Filter size={11} className="mr-1" /><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {(["Critical","High","Medium","Low"] as Priority[]).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tf} onValueChange={v => { setTf(v); setPage(1); }}>
          <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {(Object.keys(TICKET_CONFIG) as TicketType[]).map(k => <SelectItem key={k} value={k}>{TICKET_CONFIG[k].label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sf} onValueChange={v => { setSf(v); setPage(1); }}>
          <SelectTrigger className="w-32 h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {(["To Do","In Progress","Review","Testing","Done Story","Blocked Story"] as StoryStatus[]).map(s => <SelectItem key={s} value={s}>{s === "Done Story" ? "Done" : s === "Blocked Story" ? "Blocked" : s}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} tickets</span>
      </div>

      {/* Table */}
      <Card className="shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                {([["id","ID"],["title","Title"],["priority","Priority"],["assignee","Assignee"],["status","Status"],["storyPoints","SP"],["dueDate","Due Date"]] as [SortKey,string][]).map(([k,l]) => (
                  <th key={k} className="px-4 py-2.5 text-left font-semibold text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none whitespace-nowrap" onClick={() => toggleSort(k)}>
                    <span className="flex items-center gap-1">{l}<SortIcon k={k} /></span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0
                ? <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">No tickets match your filters.</td></tr>
                : pageData.map(t => {
                  const tc = TICKET_CONFIG[t.type];
                  const TI = tc.icon;
                  const pc = PRIORITY_CONFIG[t.priority];
                  return (
                    <tr key={t.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5">
                        <span className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border w-fit", tc.bg, tc.color, tc.border)}>
                          <TI size={9} />{t.id}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-medium max-w-[220px]"><span className="line-clamp-1">{t.title}</span></td>
                      <td className="px-4 py-2.5">
                        <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full", pc.bg, pc.color)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", pc.dot)} />{t.priority}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5"><AvatarFallback className="bg-primary/10 text-primary text-[8px]">{initials(t.assignee)}</AvatarFallback></Avatar>
                          <span className="text-xs">{t.assignee.split(" ")[0]}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", STATUS_COL[t.status])}>
                          {t.status === "Done Story" ? "Done" : t.status === "Blocked Story" ? "Blocked" : t.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center font-semibold text-primary">{t.storyPoints}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{new Date(t.dueDate).toLocaleDateString("en-GB",{day:"2-digit",month:"short"})}</td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t bg-muted/20 text-xs text-muted-foreground">
            <span>Page {page} of {pages}</span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={page === pages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── BOARD TAB ────────────────────────────────────────────────────────────────
function BoardTab({ sprint, onMove }: { sprint: Sprint; onMove: (id: string, col: StoryStatus) => void }) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<StoryStatus | null>(null);
  const [search, setSearch] = useState("");
  const [pf, setPf] = useState("all");

  const visible = (col: StoryStatus) => sprint.tickets.filter(t =>
    t.status === col &&
    (search === "" || t.title.toLowerCase().includes(search.toLowerCase())) &&
    (pf === "all" || t.priority === pf)
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search board…" className="pl-8 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={pf} onValueChange={setPf}>
          <SelectTrigger className="w-32 h-9 text-xs"><Filter size={11} className="mr-1" /><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            {(["Critical","High","Medium","Low"] as Priority[]).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 min-h-[400px]">
        {BOARD_COLS.map(col => {
          const cards = visible(col.id);
          const isDragOver = dragOverCol === col.id;
          return (
            <div key={col.id} className="flex-1 min-w-[180px] max-w-[240px] shrink-0"
              onDragOver={e => { e.preventDefault(); setDragOverCol(col.id); }}
              onDrop={() => { if (draggedId) { onMove(draggedId, col.id); setDraggedId(null); setDragOverCol(null); } }}
              onDragLeave={() => setDragOverCol(null)}
            >
              <div className={cn("rounded-xl border-t-2 overflow-hidden transition-all", col.top, isDragOver ? "ring-2 ring-primary/30 bg-primary/5" : "")}>
                {/* Column header */}
                <div className={cn("px-3 py-2 flex items-center justify-between border-b", col.hbg)}>
                  <span className="text-xs font-bold uppercase tracking-wider">{col.label}</span>
                  <span className="text-xs font-bold bg-white/70 px-1.5 py-0.5 rounded-full">{cards.length}</span>
                </div>
                {/* Cards */}
                <div className="p-2 space-y-2 min-h-[300px]">
                  <AnimatePresence>
                    {cards.map(t => (
                      <TicketCard key={t.id} ticket={t} isDragging={draggedId === t.id}
                        onDragStart={id => setDraggedId(id)} onDragEnd={() => setDraggedId(null)} />
                    ))}
                  </AnimatePresence>
                  {cards.length === 0 && (
                    <div className={cn("flex items-center justify-center h-16 rounded-lg border-2 border-dashed text-xs text-muted-foreground/40 transition-colors", isDragOver ? "border-primary/40 bg-primary/5 text-primary/60" : "border-muted-foreground/20")}>
                      {isDragOver ? "Drop here" : "No tickets"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── TIMELINE TAB ─────────────────────────────────────────────────────────────
function TimelineTab({ sprints }: { sprints: Sprint[] }) {
  const start = new Date("2026-05-01").getTime();
  const end   = new Date("2026-09-15").getTime();
  const total = end - start;

  const toLeft = (d: string) => ((new Date(d).getTime() - start) / total) * 100;
  const toWidth = (s: string, e: string) => ((new Date(e).getTime() - new Date(s).getTime()) / total) * 100;

  const BAR_COLOR: Record<Sprint["status"], string> = {
    Active: "bg-primary", Planned: "bg-blue-200", Completed: "bg-green-400",
  };
  const months = ["May", "Jun", "Jul", "Aug", "Sep"];
  const now = ((Date.now() - start) / total) * 100;

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold">Sprint Timeline — May to September 2026</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {/* Month labels */}
          <div className="relative flex mb-2 text-[10px] text-muted-foreground font-medium">
            {months.map((m, i) => <div key={m} className="flex-1 text-center" style={{ left: `${(i / (months.length - 1)) * 100}%` }}>{m}</div>)}
          </div>
          {/* Grid */}
          <div className="relative border-t border-b border-dashed border-muted py-2 space-y-3">
            {/* Today marker */}
            {now >= 0 && now <= 100 && (
              <div className="absolute top-0 bottom-0 w-0.5 bg-red-400/70 z-10" style={{ left: `${now}%` }}>
                <div className="absolute -top-4 left-1 text-[9px] font-bold text-red-500 whitespace-nowrap">Today</div>
              </div>
            )}
            {[...sprints].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map(sp => {
              const left = toLeft(sp.startDate);
              const width = toWidth(sp.startDate, sp.endDate);
              const totalSP = sp.tickets.reduce((a, b) => a + b.storyPoints, 0);
              return (
                <div key={sp.id} className="relative h-9 flex items-center">
                  <div className="absolute inset-x-0 h-px bg-muted-foreground/10" />
                  <div className={cn("absolute h-7 rounded-lg flex items-center px-2.5 gap-1.5 overflow-hidden", BAR_COLOR[sp.status])}
                    style={{ left: `${left}%`, width: `${Math.max(width, 3)}%` }}>
                    <span className={cn("text-[10px] font-bold truncate", sp.status === "Planned" ? "text-slate-600" : "text-white")}>
                      {sp.name}
                    </span>
                    {totalSP > 0 && <span className={cn("text-[9px] shrink-0", sp.status === "Planned" ? "text-slate-500" : "text-white/80")}>{totalSP}sp</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-primary inline-block" />Active</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-blue-200 inline-block" />Planned</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-green-400 inline-block" />Completed</span>
            <span className="flex items-center gap-1.5"><span className="w-0.5 h-3 bg-red-400 inline-block" />Today</span>
          </div>
        </CardContent>
      </Card>

      {/* Sprint milestone table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-sm font-semibold">Milestones</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-xs text-muted-foreground">
              <th className="py-2 text-left font-semibold">Sprint</th>
              <th className="py-2 text-left font-semibold">Start</th>
              <th className="py-2 text-left font-semibold">End</th>
              <th className="py-2 text-left font-semibold">Status</th>
              <th className="py-2 text-right font-semibold">Story Pts</th>
            </tr></thead>
            <tbody>
              {[...sprints].sort((a,b) => new Date(a.startDate).getTime()-new Date(b.startDate).getTime()).map(sp => (
                <tr key={sp.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="py-2 font-medium">{sp.name}</td>
                  <td className="py-2 text-muted-foreground">{new Date(sp.startDate).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</td>
                  <td className="py-2 text-muted-foreground">{new Date(sp.endDate).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</td>
                  <td className="py-2"><Badge variant="outline" className={cn("text-xs", STATUS_BADGE[sp.status])}>{sp.status}</Badge></td>
                  <td className="py-2 text-right font-semibold text-primary">{sp.tickets.reduce((a,b)=>a+b.storyPoints,0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── REPORTS TAB ─────────────────────────────────────────────────────────────
function ReportsTab({ sprints, sprint }: { sprints: Sprint[]; sprint: Sprint }) {
  const velocityData = sprints.filter(s => s.tickets.length > 0).map(s => ({ name: s.id, velocity: s.velocity, capacity: s.capacity }));
  const burndownData = [
    { day:"Jun 16", actual:63, ideal:63 }, { day:"Jun 17", actual:58, ideal:58.8 },
    { day:"Jun 18", actual:55, ideal:54.6 }, { day:"Jun 19", actual:52, ideal:50.4 },
    { day:"Jun 20", actual:44, ideal:46.2 }, { day:"Jun 21", actual:40, ideal:42 },
    { day:"Jun 22", actual:38, ideal:37.8 }, { day:"Jun 23", actual:35, ideal:33.6 },
    { day:"Jun 24", actual:32, ideal:29.4 }, { day:"Jun 25", actual:28, ideal:25.2 },
    { day:"Jun 26", actual:25, ideal:21 },   { day:"Jun 27", actual:21, ideal:16.8 },
    { day:"Jun 28", actual:null, ideal:12.6 }, { day:"Jun 29", actual:null, ideal:8.4 }, { day:"Jun 30", actual:null, ideal:0 },
  ];
  const statusData = [
    { name:"To Do",       value: sprint.tickets.filter(t=>t.status==="To Do").length },
    { name:"In Progress", value: sprint.tickets.filter(t=>t.status==="In Progress").length },
    { name:"Review",      value: sprint.tickets.filter(t=>t.status==="Review").length },
    { name:"Testing",     value: sprint.tickets.filter(t=>t.status==="Testing").length },
    { name:"Done",        value: sprint.tickets.filter(t=>t.status==="Done Story").length },
    { name:"Blocked",     value: sprint.tickets.filter(t=>t.status==="Blocked Story").length },
  ].filter(d => d.value > 0);
  const typeData = (Object.keys(TICKET_CONFIG) as TicketType[]).map(k => ({
    name: TICKET_CONFIG[k].label.replace(" Request",""), value: sprint.tickets.filter(t=>t.type===k).length,
  })).filter(d => d.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="shadow-sm">
        <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Flame size={14} className="text-orange-500" /> Sprint Velocity</CardTitle></CardHeader>
        <CardContent className="px-5 pb-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={velocityData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="velocity" fill="#3b82f6" radius={[4,4,0,0]} name="Velocity" />
              <Bar dataKey="capacity" fill="#e2e8f0" radius={[4,4,0,0]} name="Capacity %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold flex items-center gap-2"><TrendingUp size={14} className="text-blue-500" /> Sprint Burndown — S01</CardTitle></CardHeader>
        <CardContent className="px-5 pb-4">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={burndownData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 9 }} interval={2} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="ideal" stroke="#94a3b8" strokeDasharray="5 5" dot={false} name="Ideal" />
              <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={false} name="Actual" connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500" /> Task Status Distribution</CardTitle></CardHeader>
        <CardContent className="px-5 pb-4 flex items-center justify-center">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="pb-2 pt-4 px-5"><CardTitle className="text-sm font-semibold flex items-center gap-2"><BarChart3 size={14} className="text-indigo-500" /> Tickets by Type</CardTitle></CardHeader>
        <CardContent className="px-5 pb-4">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={70} />
              <Tooltip />
              <Bar dataKey="value" radius={[0,4,4,0]} name="Count">
                {typeData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── DOCUMENTS TAB ────────────────────────────────────────────────────────────
const FILE_ICON_COLOR: Record<string, string> = { PDF: "text-red-500", DOCX: "text-blue-500", XLSX: "text-green-600", PPTX: "text-orange-500" };

function DocumentsTab() {
  const [docs, setDocs] = useState<Doc[]>(MOCK_DOCS);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");

  const categories = ["all", ...Array.from(new Set(MOCK_DOCS.map(d => d.category)))];
  const filtered = docs.filter(d =>
    (search === "" || d.name.toLowerCase().includes(search.toLowerCase()) || d.uploadedBy.toLowerCase().includes(search.toLowerCase())) &&
    (cat === "all" || d.category === cat)
  );

  const handleDelete = (id: string) => setDocs(prev => prev.filter(d => d.id !== id));

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search documents…" className="pl-8 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-36 h-9 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            {categories.map(c => <SelectItem key={c} value={c}>{c === "all" ? "All Categories" : c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" className="gap-1.5 h-9 ml-auto"><Upload size={13} /> Upload</Button>
      </div>

      {/* Document list */}
      <Card className="shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold text-xs text-muted-foreground">Name</th>
              <th className="px-4 py-2.5 text-left font-semibold text-xs text-muted-foreground">Category</th>
              <th className="px-4 py-2.5 text-left font-semibold text-xs text-muted-foreground hidden md:table-cell">Uploaded By</th>
              <th className="px-4 py-2.5 text-left font-semibold text-xs text-muted-foreground hidden sm:table-cell">Date</th>
              <th className="px-4 py-2.5 text-left font-semibold text-xs text-muted-foreground hidden sm:table-cell">Size</th>
              <th className="px-4 py-2.5 text-right font-semibold text-xs text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0
              ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground text-sm">No documents found.</td></tr>
              : filtered.map(doc => (
                <tr key={doc.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <FileText size={14} className={FILE_ICON_COLOR[doc.type] ?? "text-muted-foreground"} />
                      </div>
                      <div>
                        <p className="font-medium text-sm leading-tight">{doc.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{doc.type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-[10px] font-normal">{doc.category}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{doc.uploadedBy}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell whitespace-nowrap">{new Date(doc.date).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">{doc.size}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"><Eye size={13} /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"><Download size={13} /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(doc.id)}><Trash2 size={13} /></Button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </Card>
      <p className="text-xs text-muted-foreground">{filtered.length} of {docs.length} documents</p>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "summary",   label: "Summary",   icon: LayoutDashboard },
  { id: "backlog",   label: "Backlog",   icon: List },
  { id: "board",     label: "Board",     icon: Users },
  { id: "timeline",  label: "Timeline",  icon: CalendarDays },
  { id: "reports",   label: "Reports",   icon: BarChart3 },
  { id: "documents", label: "Documents", icon: FolderOpen },
];

export default function PlanWay() {
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [selectedId, setSelectedId] = useState("S01");
  const [sprintsData, setSprintsData] = useState<Sprint[]>(SPRINTS);

  const sprint = sprintsData.find(s => s.id === selectedId) ?? sprintsData[0];

  const handleMove = (ticketId: string, col: StoryStatus) => {
    setSprintsData(prev => prev.map(sp =>
      sp.id === selectedId
        ? { ...sp, tickets: sp.tickets.map(t => t.id === ticketId ? { ...t, status: col, progress: col === "Done Story" ? 100 : t.progress } : t) }
        : sp
    ));
  };

  return (
    <div className="space-y-0 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            <span style={{ color: "#D4AF37" }}>PLANYWAY</span>
            <span className="text-muted-foreground font-normal text-lg ml-2">/ Sprint Planning</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Jira-style sprint management workspace · Corecode Global</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("px-3 py-1 font-semibold text-xs", STATUS_BADGE[sprint.status])}>{sprint.status} Sprint</Badge>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-48 h-8 text-xs gap-1">
              <ChevronDown size={12} /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sprintsData.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.status})</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => window.location.assign("/tasks?createTicket=1")}
          >
            <Plus size={13} /> New Ticket
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b mb-4 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={cn("flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                isActive ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}>
              <Icon size={14} />{t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {activeTab === "summary"   && <SummaryTab sprint={sprint} />}
            {activeTab === "backlog"   && <BacklogTab sprint={sprint} />}
            {activeTab === "board"     && <BoardTab sprint={sprint} onMove={handleMove} />}
            {activeTab === "timeline"  && <TimelineTab sprints={sprintsData} />}
            {activeTab === "reports"   && <ReportsTab sprints={sprintsData} sprint={sprint} />}
            {activeTab === "documents" && <DocumentsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
