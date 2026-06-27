import { useState } from "react";
import {
  Plus, Eye, CalendarDays, Search, Filter, ChevronDown,
  Zap, CheckCircle2, Clock, AlertTriangle, BarChart3, Users, Flame, TrendingUp,
  MessageSquare, Paperclip, GripVertical, Bug, RefreshCw, Ticket, ClipboardList,
  Archive, LayoutGrid, ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Priority = "Critical" | "High" | "Medium" | "Low";
type StoryStatus = "To Do" | "In Progress" | "Testing" | "Review" | "Done Story" | "Blocked Story";
type TicketType = "CC26BUG" | "CC26CR" | "CC26SR" | "CC26IPM" | "CC26EPIC";

interface Ticket {
  id: string;
  type: TicketType;
  title: string;
  assignee: string;
  priority: Priority;
  estimatedHours: number;
  dueDate: string;
  storyPoints: number;
  comments: number;
  attachments: number;
  progress: number;
  labels: string[];
  status: StoryStatus;
}

interface Sprint {
  id: string;
  name: string;
  duration: string;
  startDate: string;
  endDate: string;
  status: "Active" | "Planned" | "Completed";
  goal: string;
  capacity: number;
  velocity: number;
  tickets: Ticket[];
}

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

const COLUMNS: { id: StoryStatus; label: string; topColor: string; headerBg: string }[] = [
  { id: "To Do",         label: "To Do",          topColor: "border-t-slate-400",   headerBg: "bg-slate-50" },
  { id: "In Progress",   label: "In Progress",    topColor: "border-t-blue-500",    headerBg: "bg-blue-50" },
  { id: "Testing",       label: "Testing",        topColor: "border-t-violet-500",  headerBg: "bg-violet-50" },
  { id: "Review",        label: "Review",         topColor: "border-t-amber-500",   headerBg: "bg-amber-50" },
  { id: "Done Story",    label: "Done Story",     topColor: "border-t-green-500",   headerBg: "bg-green-50" },
  { id: "Blocked Story", label: "Blocked Story",  topColor: "border-t-red-500",     headerBg: "bg-red-50" },
];

const SPRINTS: Sprint[] = [
  {
    id: "S01", name: "Task Management Sprint", duration: "June 16 – June 30",
    startDate: "2026-06-16", endDate: "2026-06-30",
    status: "Active", goal: "Deliver core task management module with authentication, dashboards, and CI/CD pipeline.",
    capacity: 85, velocity: 42,
    tickets: [
      { id:"CC26EPIC-001", type:"CC26EPIC", title:"Core Platform Architecture",        assignee:"Alice Johnson",  priority:"Critical", estimatedHours:20, dueDate:"2026-06-30", storyPoints:13, comments:5, attachments:3, progress:60,  labels:["Architecture","Backend"], status:"In Progress" },
      { id:"CC26BUG-001",  type:"CC26BUG",  title:"Fix Authentication Token Expiry",   assignee:"Bob Smith",      priority:"Critical", estimatedHours:6,  dueDate:"2026-06-22", storyPoints:3,  comments:6, attachments:1, progress:100, labels:["Bug","Security"],        status:"Done Story" },
      { id:"CC26BUG-002",  type:"CC26BUG",  title:"Payment Module Crash on Submit",    assignee:"Diana Prince",   priority:"High",     estimatedHours:4,  dueDate:"2026-06-25", storyPoints:2,  comments:3, attachments:0, progress:0,   labels:["Bug","Payments"],        status:"To Do" },
      { id:"CC26CR-001",   type:"CC26CR",   title:"UI/UX Review & Redesign",           assignee:"Grace Kim",      priority:"Low",      estimatedHours:16, dueDate:"2026-06-21", storyPoints:8,  comments:7, attachments:5, progress:95,  labels:["Design","UX"],           status:"Review" },
      { id:"CC26CR-002",   type:"CC26CR",   title:"Database Schema Migration v2",      assignee:"Bob Smith",      priority:"High",     estimatedHours:6,  dueDate:"2026-06-20", storyPoints:3,  comments:2, attachments:1, progress:100, labels:["DB","Migration"],        status:"Done Story" },
      { id:"CC26SR-001",   type:"CC26SR",   title:"Set Up CI/CD Pipeline",             assignee:"Henry Wilson",   priority:"High",     estimatedHours:12, dueDate:"2026-06-24", storyPoints:5,  comments:2, attachments:2, progress:60,  labels:["DevOps","CI/CD"],        status:"In Progress" },
      { id:"CC26SR-002",   type:"CC26SR",   title:"API Rate Limiting Implementation",  assignee:"Mia Martinez",   priority:"High",     estimatedHours:8,  dueDate:"2026-06-22", storyPoints:5,  comments:3, attachments:1, progress:80,  labels:["Backend","Security"],    status:"Testing" },
      { id:"CC26IPM-001",  type:"CC26IPM",  title:"Implement Dashboard Charts",        assignee:"Alice Johnson",  priority:"High",     estimatedHours:10, dueDate:"2026-06-23", storyPoints:5,  comments:3, attachments:3, progress:55,  labels:["Frontend","UI"],         status:"In Progress" },
      { id:"CC26IPM-002",  type:"CC26IPM",  title:"ML Model Integration",              assignee:"Deepika K",      priority:"Critical", estimatedHours:20, dueDate:"2026-06-20", storyPoints:13, comments:5, attachments:4, progress:95,  labels:["AI/ML","Backend"],       status:"Review" },
      { id:"CC26IPM-003",  type:"CC26IPM",  title:"Intern Onboarding Documentation",   assignee:"Rachel Wilson",  priority:"Low",      estimatedHours:4,  dueDate:"2026-06-27", storyPoints:2,  comments:1, attachments:0, progress:20,  labels:["Docs","HR"],             status:"To Do" },
      { id:"CC26IPM-004",  type:"CC26IPM",  title:"Security Penetration Testing",      assignee:"Paul Anderson",  priority:"Critical", estimatedHours:16, dueDate:"2026-06-28", storyPoints:8,  comments:2, attachments:2, progress:45,  labels:["Security","Testing"],    status:"Testing" },
      { id:"CC26IPM-005",  type:"CC26IPM",  title:"Performance Benchmarking Report",   assignee:"Liam Young",     priority:"Medium",   estimatedHours:6,  dueDate:"2026-06-28", storyPoints:2,  comments:0, attachments:0, progress:0,   labels:["Perf","Report"],         status:"To Do" },
      { id:"CC26EPIC-002", type:"CC26EPIC", title:"User Management System",            assignee:"Frank Miller",   priority:"Medium",   estimatedHours:8,  dueDate:"2026-06-30", storyPoints:3,  comments:1, attachments:0, progress:0,   labels:["Auth","Backend"],        status:"Blocked Story" },
    ],
  },
  {
    id: "S02", name: "Feature Sprint", duration: "July 1 – July 15",
    startDate: "2026-07-01", endDate: "2026-07-15",
    status: "Planned", goal: "Implement dark mode, query optimizations, IoT data ingestion, and weekly progress automation.",
    capacity: 80, velocity: 38,
    tickets: [
      { id:"CC26IPM-006", type:"CC26IPM", title:"Dark Mode Support",           assignee:"Quinn Davis",  priority:"Low",    estimatedHours:8,  dueDate:"2026-07-05", storyPoints:3,  comments:1, attachments:1, progress:0, labels:["UI","Frontend"],   status:"To Do" },
      { id:"CC26IPM-007", type:"CC26IPM", title:"Optimize Database Queries",   assignee:"Sam Taylor",   priority:"High",   estimatedHours:10, dueDate:"2026-07-08", storyPoints:5,  comments:0, attachments:0, progress:0, labels:["DB","Perf"],       status:"To Do" },
      { id:"CC26SR-003",  type:"CC26SR",  title:"IoT Data Ingestion Service",  assignee:"Diana Prince", priority:"High",   estimatedHours:16, dueDate:"2026-07-10", storyPoints:8,  comments:0, attachments:0, progress:0, labels:["IoT","Backend"],   status:"To Do" },
      { id:"CC26CR-003",  type:"CC26CR",  title:"Weekly Progress Automation",  assignee:"Eve Davis",    priority:"Medium", estimatedHours:6,  dueDate:"2026-07-12", storyPoints:3,  comments:0, attachments:0, progress:0, labels:["Automation","HR"], status:"To Do" },
    ],
  },
  {
    id: "S03", name: "Bug Fix Sprint", duration: "July 16 – July 31",
    startDate: "2026-07-16", endDate: "2026-07-31",
    status: "Planned", goal: "Resolve critical production bugs and improve system stability.",
    capacity: 75, velocity: 35,
    tickets: [
      { id:"CC26BUG-003", type:"CC26BUG", title:"API Timeout on Large Datasets",  assignee:"Bob Smith",   priority:"High",   estimatedHours:8, dueDate:"2026-07-20", storyPoints:5, comments:0, attachments:0, progress:0, labels:["API","Perf"],    status:"To Do" },
      { id:"CC26BUG-004", type:"CC26BUG", title:"Export PDF Encoding Issue",      assignee:"Mia Martinez",priority:"Medium", estimatedHours:4, dueDate:"2026-07-22", storyPoints:2, comments:0, attachments:0, progress:0, labels:["Export","Bug"],  status:"To Do" },
      { id:"CC26SR-004",  type:"CC26SR",  title:"Cache Invalidation Refactor",    assignee:"Henry Wilson",priority:"High",   estimatedHours:12,dueDate:"2026-07-28", storyPoints:5, comments:0, attachments:0, progress:0, labels:["Backend","Cache"],status:"To Do" },
    ],
  },
  {
    id: "S04", name: "Optimization Sprint", duration: "August 1 – August 15",
    startDate: "2026-08-01", endDate: "2026-08-15",
    status: "Planned", goal: "Performance optimizations, accessibility improvements, and mobile responsiveness.",
    capacity: 80, velocity: 40,
    tickets: [
      { id:"CC26IPM-008", type:"CC26IPM", title:"Accessibility Audit & Fixes",  assignee:"Karen Lee",    priority:"Low",  estimatedHours:8, dueDate:"2026-08-08", storyPoints:2, comments:0, attachments:0, progress:0, labels:["A11y","QA"],   status:"To Do" },
      { id:"CC26CR-004",  type:"CC26CR",  title:"Mobile Responsive Overhaul",   assignee:"Grace Kim",    priority:"High", estimatedHours:16,dueDate:"2026-08-12", storyPoints:8, comments:0, attachments:0, progress:0, labels:["Mobile","UI"], status:"To Do" },
      { id:"CC26EPIC-003",type:"CC26EPIC",title:"Multi-tenant Architecture",     assignee:"Alice Johnson",priority:"Critical",estimatedHours:24,dueDate:"2026-08-15",storyPoints:13,comments:0,attachments:0, progress:0, labels:["Architecture"],status:"To Do" },
    ],
  },
  {
    id: "S05", name: "Release Sprint", duration: "August 16 – August 31",
    startDate: "2026-08-16", endDate: "2026-08-31",
    status: "Planned", goal: "Final QA, documentation, and production release of v2.0.",
    capacity: 70, velocity: 30,
    tickets: [
      { id:"CC26IPM-009", type:"CC26IPM", title:"Release Documentation v2.0",   assignee:"Rachel Wilson",priority:"Medium", estimatedHours:8, dueDate:"2026-08-22", storyPoints:3, comments:0, attachments:0, progress:0, labels:["Docs","Release"], status:"To Do" },
      { id:"CC26SR-005",  type:"CC26SR",  title:"Production Deployment Runbook", assignee:"Henry Wilson", priority:"High",   estimatedHours:6, dueDate:"2026-08-28", storyPoints:3, comments:0, attachments:0, progress:0, labels:["DevOps"],         status:"To Do" },
    ],
  },
  {
    id: "S00", name: "Foundation Sprint", duration: "May 16 – May 31",
    startDate: "2026-05-16", endDate: "2026-05-31",
    status: "Completed", goal: "Establish project foundation, tooling, and initial prototypes.",
    capacity: 90, velocity: 42,
    tickets: [],
  },
];

function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
}

const LABEL_COLORS = [
  "bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700",
  "bg-green-100 text-green-700", "bg-orange-100 text-orange-700",
  "bg-teal-100 text-teal-700", "bg-rose-100 text-rose-700",
];
function labelColor(l: string) {
  let h = 0; for (let i = 0; i < l.length; i++) h = l.charCodeAt(i) + ((h << 5) - h);
  return LABEL_COLORS[Math.abs(h) % LABEL_COLORS.length];
}

function TicketCard({
  ticket, isDragging, onDragStart, onDragEnd,
}: {
  ticket: Ticket; isDragging: boolean; onDragStart: (id: string) => void; onDragEnd: () => void;
}) {
  const p = PRIORITY_CONFIG[ticket.priority];
  const t = TICKET_CONFIG[ticket.type];
  const TypeIcon = t.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isDragging ? 0.45 : 1, scale: isDragging ? 0.97 : 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      draggable
      onDragStart={() => onDragStart(ticket.id)}
      onDragEnd={onDragEnd}
      className={cn(
        "bg-card border rounded-xl p-3 cursor-grab active:cursor-grabbing shadow-sm",
        "hover:shadow-md hover:-translate-y-0.5 transition-all select-none",
        isDragging && "ring-2 ring-primary/40 shadow-lg"
      )}
    >
      {/* Ticket ID + Type */}
      <div className="flex items-center justify-between mb-2">
        <div className={cn("flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded", t.bg, t.color, t.border, "border")}>
          <TypeIcon size={9} /> {ticket.id}
        </div>
        <GripVertical size={11} className="text-muted-foreground/40" />
      </div>

      {/* Title */}
      <p className="text-sm font-semibold leading-snug mb-2 line-clamp-2">{ticket.title}</p>

      {/* Priority + Points */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span className={cn("inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full", p.bg, p.color)}>
          <span className={cn("w-1.5 h-1.5 rounded-full", p.dot)} />{ticket.priority}
        </span>
        <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">{ticket.storyPoints}sp</span>
        <span className="text-[9px] text-muted-foreground">{ticket.estimatedHours}h</span>
      </div>

      {/* Labels */}
      {ticket.labels.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-2">
          {ticket.labels.slice(0, 2).map(l => (
            <span key={l} className={cn("text-[8px] px-1.5 py-0.5 rounded font-medium", labelColor(l))}>{l}</span>
          ))}
        </div>
      )}

      {/* Progress */}
      <div className="mb-2">
        <div className="flex justify-between text-[9px] text-muted-foreground mb-1">
          <span>Progress</span><span>{ticket.progress}%</span>
        </div>
        <Progress value={ticket.progress} className="h-1" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1">
          <Avatar className="h-5 w-5">
            <AvatarFallback className="bg-primary/10 text-primary text-[8px] font-bold">{initials(ticket.assignee)}</AvatarFallback>
          </Avatar>
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

const STATUS_BADGE: Record<Sprint["status"], string> = {
  Active:    "bg-green-100 text-green-700",
  Planned:   "bg-blue-100 text-blue-700",
  Completed: "bg-muted text-muted-foreground",
};

export default function PlanWay() {
  const [selectedSprintId, setSelectedSprintId] = useState("S01");
  const [sprintsData, setSprintsData] = useState<Sprint[]>(SPRINTS);
  const [draggedId,   setDraggedId]   = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<StoryStatus | null>(null);
  const [search,         setSearch]         = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterType,     setFilterType]     = useState("all");

  const selectedSprint = sprintsData.find(s => s.id === selectedSprintId)!;

  const handleDrop = (col: StoryStatus) => {
    if (!draggedId) return;
    setSprintsData(prev => prev.map(sp =>
      sp.id === selectedSprintId
        ? { ...sp, tickets: sp.tickets.map(t => t.id === draggedId ? { ...t, status: col, progress: col === "Done Story" ? 100 : t.progress } : t) }
        : sp
    ));
    setDraggedId(null);
    setDragOverCol(null);
  };

  const visibleTickets = (col: StoryStatus) =>
    selectedSprint.tickets.filter(t =>
      t.status === col &&
      (search === "" || t.title.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase())) &&
      (filterPriority === "all" || t.priority === filterPriority) &&
      (filterType === "all" || t.type === filterType)
    );

  const totalPoints = selectedSprint.tickets.reduce((a, b) => a + b.storyPoints, 0);
  const donePoints  = selectedSprint.tickets.filter(t => t.status === "Done Story").reduce((a, b) => a + b.storyPoints, 0);

  const ANALYTICS = [
    { label: "Active Sprint",        value: sprintsData.filter(s => s.status === "Active").length,                         icon: LayoutGrid,    color: "text-blue-500",   bg: "bg-blue-100" },
    { label: "Sprint Velocity",      value: selectedSprint.velocity,                                                       icon: Flame,         color: "text-rose-500",   bg: "bg-rose-100" },
    { label: "Story Completion",     value: `${selectedSprint.tickets.length ? Math.round(selectedSprint.tickets.filter(t=>t.status==="Done Story").length/selectedSprint.tickets.length*100) : 0}%`, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-100" },
    { label: "Blocked Stories",      value: selectedSprint.tickets.filter(t => t.status === "Blocked Story").length,       icon: AlertTriangle, color: "text-red-500",    bg: "bg-red-100" },
    { label: "Open Bugs",            value: selectedSprint.tickets.filter(t => t.type === "CC26BUG" && t.status !== "Done Story").length, icon: Bug, color: "text-orange-500", bg: "bg-orange-100" },
    { label: "Change Requests",      value: selectedSprint.tickets.filter(t => t.type === "CC26CR").length,                icon: RefreshCw,     color: "text-amber-500",  bg: "bg-amber-100" },
    { label: "Service Requests",     value: selectedSprint.tickets.filter(t => t.type === "CC26SR").length,                icon: Ticket,        color: "text-purple-500", bg: "bg-purple-100" },
    { label: "Total Story Points",   value: totalPoints,                                                                   icon: BarChart3,     color: "text-indigo-500", bg: "bg-indigo-100" },
    { label: "Burndown Progress",    value: `${totalPoints ? Math.round(donePoints / totalPoints * 100) : 0}%`,           icon: TrendingUp,    color: "text-teal-500",   bg: "bg-teal-100" },
    { label: "Team Capacity",        value: `${selectedSprint.capacity}%`,                                                 icon: Users,         color: "text-cyan-500",   bg: "bg-cyan-100" },
    { label: "Sprint Health",        value: selectedSprint.tickets.filter(t=>t.status==="Blocked Story").length === 0 ? "Good" : "At Risk", icon: Zap, color: "text-emerald-500", bg: "bg-emerald-100" },
    { label: "Remaining Work",       value: `${totalPoints - donePoints}sp`,                                               icon: Clock,         color: "text-slate-500",  bg: "bg-slate-100" },
  ];

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <span className="text-primary font-black tracking-tight">PLANYWAY</span>
            <span className="text-muted-foreground font-normal">/ Sprint Planning</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">Enterprise Jira-style project management workspace.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Badge className="bg-green-100 text-green-700 border-green-200 px-3 py-1 font-semibold">🚀 Active Sprint</Badge>
        </div>
      </div>

      {/* Sprint Analytics */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-2">
        {ANALYTICS.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-2.5 text-center">
                <div className={cn("w-7 h-7 rounded-full flex items-center justify-center mx-auto mb-1.5", k.bg, k.color)}>
                  <k.icon size={13} />
                </div>
                <p className="text-sm font-bold leading-tight">{k.value}</p>
                <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{k.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main Layout: Sprint List + Kanban */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* ── Sprint List Panel ──────────────────────── */}
        <div className="w-60 shrink-0 flex flex-col gap-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Sprints</p>

          <div className="space-y-2 flex-1">
            {sprintsData.map(sp => (
              <button
                key={sp.id}
                onClick={() => setSelectedSprintId(sp.id)}
                className={cn(
                  "w-full text-left p-3 rounded-xl border transition-all hover:shadow-md",
                  selectedSprintId === sp.id
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border bg-card hover:border-primary/30"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", STATUS_BADGE[sp.status])}>{sp.status}</span>
                  {selectedSprintId === sp.id && <ChevronRight size={13} className="text-primary" />}
                </div>
                <p className="font-semibold text-xs leading-tight">{sp.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{sp.duration}</p>
                {sp.tickets.length > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[9px] text-muted-foreground mb-1">
                      <span>{sp.tickets.filter(t => t.status === "Done Story").length}/{sp.tickets.length} done</span>
                      <span>{sp.tickets.reduce((a,b)=>a+b.storyPoints,0)}sp</span>
                    </div>
                    <Progress
                      value={sp.tickets.length ? Math.round(sp.tickets.filter(t=>t.status==="Done Story").length/sp.tickets.length*100) : 0}
                      className="h-1"
                    />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Sprint Actions */}
          <div className="space-y-1.5 border-t pt-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Actions</p>
            {[
              { icon: Plus,         label: "Create Sprint" },
              { icon: Plus,         label: "Add Story" },
              { icon: Zap,          label: "Add Epic" },
              { icon: Bug,          label: "Add Bug" },
              { icon: RefreshCw,    label: "Add Change Request" },
              { icon: Ticket,       label: "Add Service Request" },
              { icon: Eye,          label: "View Sprint" },
              { icon: BarChart3,    label: "Sprint Analytics" },
              { icon: CalendarDays, label: "Calendar View" },
              { icon: Archive,      label: "Sprint Archive" },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <Icon size={13} className="shrink-0" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Sprint Detail + Kanban ─────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 gap-3">
          {/* Sprint Header */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h2 className="font-bold text-base">{selectedSprint.name}</h2>
                    <span className={cn("text-[11px] font-semibold px-2.5 py-0.5 rounded-full", STATUS_BADGE[selectedSprint.status])}>
                      {selectedSprint.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedSprint.duration}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1 italic">
                    Goal: {selectedSprint.goal}
                  </p>
                </div>
                <div className="flex gap-4 text-center text-sm shrink-0">
                  <div><p className="font-bold">{selectedSprint.capacity}%</p><p className="text-xs text-muted-foreground">Capacity</p></div>
                  <div><p className="font-bold">{selectedSprint.velocity}</p><p className="text-xs text-muted-foreground">Velocity</p></div>
                  <div><p className="font-bold">{totalPoints}sp</p><p className="text-xs text-muted-foreground">Points</p></div>
                </div>
              </div>

              {/* Ticket type legend */}
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
                {(Object.entries(TICKET_CONFIG) as [TicketType, typeof TICKET_CONFIG[TicketType]][]).map(([key, cfg]) => {
                  const Icon = cfg.icon;
                  const count = selectedSprint.tickets.filter(t => t.type === key).length;
                  return (
                    <span key={key} className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border", cfg.bg, cfg.color, cfg.border)}>
                      <Icon size={10} /> {key} ({count})
                    </span>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[150px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search tickets…" className="pl-8 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-32 h-8 text-xs"><Filter size={12} className="mr-1" /><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                {(["Critical","High","Medium","Low"] as Priority[]).map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Ticket Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {(Object.entries(TICKET_CONFIG) as [TicketType, typeof TICKET_CONFIG[TicketType]][]).map(([k,v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(search || filterPriority !== "all" || filterType !== "all") && (
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setSearch(""); setFilterPriority("all"); setFilterType("all"); }}>
                Clear
              </Button>
            )}
          </div>

          {/* Kanban Board */}
          {selectedSprint.status === "Completed" ? (
            <Card className="flex-1 flex items-center justify-center">
              <CardContent className="text-center py-16">
                <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500 opacity-60" />
                <h3 className="text-lg font-bold mb-2">Sprint Completed</h3>
                <p className="text-muted-foreground text-sm">This sprint was completed on {selectedSprint.endDate}.</p>
                <div className="grid grid-cols-3 gap-6 mt-6">
                  <div><p className="text-2xl font-bold text-green-600">18</p><p className="text-xs text-muted-foreground">Stories Done</p></div>
                  <div><p className="text-2xl font-bold">42</p><p className="text-xs text-muted-foreground">Velocity</p></div>
                  <div><p className="text-2xl font-bold">90%</p><p className="text-xs text-muted-foreground">Completion</p></div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto flex-1">
              <div className="flex gap-2.5 min-w-max h-full pb-2">
                {COLUMNS.map(col => {
                  const colTickets = visibleTickets(col.id);
                  const isOver = dragOverCol === col.id;
                  return (
                    <div
                      key={col.id}
                      className={cn(
                        "w-[220px] flex flex-col rounded-xl border-t-4 bg-muted/20 transition-all",
                        col.topColor,
                        isOver && "bg-primary/5 ring-1 ring-primary/30 shadow-md"
                      )}
                      onDragOver={e => { e.preventDefault(); setDragOverCol(col.id); }}
                      onDragLeave={() => setDragOverCol(null)}
                      onDrop={() => handleDrop(col.id)}
                    >
                      <div className={cn("px-3 py-2.5 flex items-center justify-between rounded-t-lg shrink-0", col.headerBg)}>
                        <span className="font-bold text-xs">{col.label}</span>
                        <span className="text-[10px] bg-white/70 px-2 py-0.5 rounded-full font-bold text-muted-foreground">{colTickets.length}</span>
                      </div>
                      <div className={cn("flex-1 p-2 space-y-2 overflow-y-auto min-h-[120px] transition-colors", isOver && "bg-primary/5")}>
                        <AnimatePresence>
                          {colTickets.map(ticket => (
                            <TicketCard
                              key={ticket.id}
                              ticket={ticket}
                              isDragging={draggedId === ticket.id}
                              onDragStart={id => setDraggedId(id)}
                              onDragEnd={() => { setDraggedId(null); setDragOverCol(null); }}
                            />
                          ))}
                        </AnimatePresence>
                        {colTickets.length === 0 && (
                          <div className={cn("h-16 border-2 border-dashed rounded-xl flex items-center justify-center text-[10px] text-muted-foreground/50 transition-colors", isOver && "border-primary text-primary")}>
                            {isOver ? "Drop here" : "Empty"}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
