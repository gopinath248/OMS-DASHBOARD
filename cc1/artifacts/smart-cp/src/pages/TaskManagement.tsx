import { useState, useRef, useEffect, type DragEvent } from "react";
import {
  Plus, Search, LayoutGrid, List, AlertCircle, MoreHorizontal,
  UserPlus, Edit3, MoveRight, Copy, Archive, Trash2, ExternalLink,
  GitBranch, Link2, ArrowUpCircle, Eye, Paperclip, Tag,
  Filter, X, MessageSquare, Clock, Zap,
  CheckCircle2, Loader2, FlaskConical, Bug, Layers3,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { tasks as initialTasks, staff, students } from "@/data/mockData";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getAuthSession } from "@/lib/auth";
import { APP_DATA_UPDATED_EVENT, apiJson, refreshAppData } from "@/lib/api";

/* ─── Types ──────────────────────────────────────────────── */
type Task = typeof initialTasks[0] & {
  storyPoints?: number;
  ticketType?: "Bug" | "Story" | "Epic" | "Task" | "Service";
  labels?: string[];
  comments?: number;
  progress?: number;
  column?: string;
};

/* ─── Config ─────────────────────────────────────────────── */
const PRIORITY_CONFIG: Record<string, { cls: string; dot: string }> = {
  Critical: { cls: "bg-red-100 text-red-700 border-red-200",     dot: "bg-red-500" },
  High:     { cls: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  Medium:   { cls: "bg-blue-100 text-blue-700 border-blue-200",   dot: "bg-blue-500" },
  Low:      { cls: "bg-gray-100 text-gray-600 border-gray-200",   dot: "bg-gray-400" },
};

const TICKET_TYPE_CONFIG = {
  Bug:     { icon: Bug,        cls: "bg-red-100 text-red-700" },
  Story:   { icon: Layers3,    cls: "bg-blue-100 text-blue-700" },
  Epic:    { icon: Zap,        cls: "bg-purple-100 text-purple-700" },
  Task:    { icon: CheckCircle2,cls: "bg-green-100 text-green-700" },
  Service: { icon: FlaskConical,cls: "bg-teal-100 text-teal-700" },
};

const JIRA_COLUMNS = [
  { id: "To Do",      label: "To Do",       icon: Clock,        topColor: "border-t-slate-400",  headerBg: "bg-slate-50",        badge: "bg-slate-200 text-slate-700" },
  { id: "In Progress",label: "In Progress", icon: Loader2,      topColor: "border-t-blue-500",   headerBg: "bg-blue-50/60",      badge: "bg-blue-200 text-blue-700" },
  { id: "Testing",    label: "Testing",     icon: FlaskConical, topColor: "border-t-yellow-500", headerBg: "bg-yellow-50/60",    badge: "bg-yellow-200 text-yellow-700" },
  { id: "Review",     label: "Review",      icon: Eye,          topColor: "border-t-purple-500", headerBg: "bg-purple-50/60",    badge: "bg-purple-200 text-purple-700" },
  { id: "Blocked",    label: "Blocked",     icon: AlertCircle,  topColor: "border-t-red-500",    headerBg: "bg-red-50/60",       badge: "bg-red-200 text-red-700" },
  { id: "Done",       label: "Done",        icon: CheckCircle2, topColor: "border-t-green-500",  headerBg: "bg-green-50/60",     badge: "bg-green-200 text-green-700" },
];
const INTERN_COLUMN_IDS = new Set(["To Do", "In Progress", "Review", "Done"]);
const COLUMN_ORDER = Object.fromEntries(JIRA_COLUMNS.map((col, index) => [col.id, index]));
const PRIORITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

/* ─── Helpers ────────────────────────────────────────────── */
function normalizeToColumn(status: string): string {
  return ({
    "Completed": "Done", "Done Story": "Done", "Done": "Done",
    "In Progress": "In Progress", "To Do": "To Do", "Not Started": "To Do",
    "Testing": "Testing", "Review": "Review", "Blocked": "Blocked",
  } as Record<string, string>)[status] ?? "To Do";
}

function getInternBoardColumn(column?: string) {
  if (column === "Testing") return "Review";
  if (column === "Blocked") return "To Do";
  return column ?? "To Do";
}

function deriveTicketType(t: { title: string; description: string }): Task["ticketType"] {
  const text = (t.title + " " + t.description).toLowerCase();
  if (text.includes("bug") || text.includes("fix") || text.includes("crash") || text.includes("error")) return "Bug";
  if (text.includes("epic") || text.includes("system") || text.includes("platform"))                    return "Epic";
  if (text.includes("service") || text.includes("api") || text.includes("endpoint"))                    return "Service";
  if (text.includes("dashboard") || text.includes("feature") || text.includes("integration"))           return "Story";
  return "Task";
}

function sp(priority: string) {
  return ({ Critical: 8, High: 5, Medium: 3, Low: 1 } as Record<string, number>)[priority] ?? 3;
}

function ticketId(id: string, type: string) {
  const m = ({ Bug: "BUG", Story: "IPM", Epic: "EPIC", Task: "TSK", Service: "SR" } as Record<string, string>)[type] ?? "TSK";
  return `CC26${m}-${id.replace(/\D/g, "").padStart(3, "0")}`;
}

function sortTasks(a: Task, b: Task) {
  const col = (COLUMN_ORDER[a.column ?? "To Do"] ?? 0) - (COLUMN_ORDER[b.column ?? "To Do"] ?? 0);
  if (col !== 0) return col;

  const priority = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
  if (priority !== 0) return priority;

  const due = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  if (due !== 0) return due;

  return ticketId(a.id, a.ticketType ?? "Task").localeCompare(ticketId(b.id, b.ticketType ?? "Task"));
}

const COLUMN_OVERRIDES: Record<string, string> = {
  TSK001: "In Progress", TSK002: "In Progress", TSK003: "Testing",
  TSK004: "Review",      TSK005: "Done",        TSK006: "In Progress",
  TSK007: "To Do",       TSK008: "Blocked",     TSK009: "In Progress",
  TSK010: "Testing",     TSK011: "To Do",       TSK012: "Review",
  TSK013: "Done",        TSK014: "In Progress", TSK015: "To Do",
  TSK016: "Blocked",     TSK017: "Testing",     TSK018: "To Do", TSK019: "In Progress",
};

function enrich(t: typeof initialTasks[0], colOverride?: string): Task {
  const type = deriveTicketType(t);
  return {
    ...t,
    ticketType: type,
    storyPoints: sp(t.priority),
    comments: Math.floor(Math.random() * 8),
    progress: t.status === "Completed" ? 100 : t.status === "In Progress" ? Math.floor(Math.random() * 55) + 15 : 0,
    labels: [],
    column: normalizeToColumn(colOverride ?? t.status),
  };
}

function buildTaskList() {
  return initialTasks.map(t => enrich(t, COLUMN_OVERRIDES[t.id]));
}

function upsertTask(tasks: Task[], task: typeof initialTasks[0]) {
  const enrichedTask = enrich(task, task.status);
  return [enrichedTask, ...tasks.filter(existing => existing.id !== task.id)];
}

/* ─── Action Dropdown ────────────────────────────────────── */
const ACTIONS = [
  { icon: UserPlus,     label: "Assign",         danger: false },
  { icon: Edit3,        label: "Edit",            danger: false },
  { icon: MoveRight,    label: "Move",            danger: false },
  { icon: Copy,         label: "Duplicate",       danger: false },
  { icon: Archive,      label: "Archive",         danger: false },
  null,
  { icon: ExternalLink, label: "View Details",    danger: false },
  { icon: GitBranch,    label: "Create Subtask",  danger: false },
  { icon: Link2,        label: "Link Issue",      danger: false },
  { icon: ArrowUpCircle,label: "Change Priority", danger: false },
  { icon: Eye,          label: "Add Watcher",     danger: false },
  { icon: Paperclip,    label: "Add Attachment",  danger: false },
  null,
  { icon: Trash2,       label: "Delete",          danger: true },
];

function ActionDropdown({ onAction }: { onAction: (label: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      >
        <MoreHorizontal size={14} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.11 }}
            className="absolute right-0 top-7 z-50 w-48 bg-popover border border-border rounded-xl shadow-xl py-1 overflow-hidden"
          >
            {ACTIONS.map((item, i) => {
              if (item === null) return <Separator key={`sep-${i}`} className="my-1" />;
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => { onAction(item.label); setOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors",
                    item.danger
                      ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <Icon size={13} />{item.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Edit Dialog ────────────────────────────────────────── */
function EditDialog({ task, open, onClose, onSave }: {
  task: Task | null; open: boolean; onClose: () => void;
  onSave: (updated: Partial<Task>) => void;
}) {
  const [form, setForm] = useState({ title: "", description: "", priority: "Medium", dueDate: "" });
  useEffect(() => {
    if (task) setForm({ title: task.title, description: task.description, priority: task.priority, dueDate: task.dueDate });
  }, [task]);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Edit Ticket</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Low","Medium","High","Critical"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave(form); onClose(); }}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Assign Dialog ──────────────────────────────────────── */
function AssignDialog({ task, open, onClose, onSave }: {
  task: Task | null; open: boolean; onClose: () => void;
  onSave: (assignee: string) => void;
}) {
  const [assignee, setAssignee] = useState("");
  useEffect(() => { if (task) setAssignee(task.assignedTo); }, [task]);
  const activeEmployees = staff.filter(employee =>
    employee.status !== "Inactive" && employee.role.toUpperCase() === "EMPLOYEE"
  );
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Assign Ticket</DialogTitle></DialogHeader>
        <div className="py-2 space-y-3">
          <p className="text-sm text-muted-foreground">
            Assign <span className="font-semibold text-foreground">{task?.title}</span> to:
          </p>
          <Select value={assignee} onValueChange={setAssignee}>
            <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
            <SelectContent>
              {activeEmployees.map(employee => <SelectItem key={employee.id} value={employee.name}>{employee.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!assignee} onClick={() => { onSave(assignee); onClose(); }}>Assign</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Move Dialog ────────────────────────────────────────── */
function MoveDialog({ task, open, onClose, onSave }: {
  task: Task | null; open: boolean; onClose: () => void;
  onSave: (col: string) => void;
}) {
  const [col, setCol] = useState("To Do");
  useEffect(() => { if (task) setCol(task.column ?? "To Do"); }, [task]);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Move Ticket</DialogTitle></DialogHeader>
        <div className="py-2 space-y-3">
          <p className="text-sm text-muted-foreground">Move to column:</p>
          <Select value={col} onValueChange={setCol}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {JIRA_COLUMNS.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave(col); onClose(); }}>Move</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Priority Dialog ────────────────────────────────────── */
function PriorityDialog({ task, open, onClose, onSave }: {
  task: Task | null; open: boolean; onClose: () => void;
  onSave: (priority: string) => void;
}) {
  const [priority, setPriority] = useState("Medium");
  useEffect(() => { if (task) setPriority(task.priority); }, [task]);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Change Priority</DialogTitle></DialogHeader>
        <div className="py-2 space-y-3">
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Low","Medium","High","Critical"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave(priority); onClose(); }}>Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── View Details Dialog ────────────────────────────────── */
function ViewDetailsDialog({ task, open, onClose }: { task: Task | null; open: boolean; onClose: () => void }) {
  if (!task) return null;
  const typeConf = TICKET_TYPE_CONFIG[task.ticketType ?? "Task"];
  const TypeIcon = typeConf.icon;
  const priConf  = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.Medium;
  const col      = JIRA_COLUMNS.find(c => c.id === task.column);
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <span className={cn("flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded", typeConf.cls)}>
              <TypeIcon size={10} /> {task.ticketType}
            </span>
            <span className="font-mono text-muted-foreground">{ticketId(task.id, task.ticketType ?? "Task")}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <h3 className="text-base font-bold">{task.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>
          <Separator />
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground text-xs">Assignee</span>
              <p className="font-medium mt-0.5">{task.assignedTo}</p></div>
            <div><span className="text-muted-foreground text-xs">Priority</span>
              <div className="mt-0.5">
                <span className={cn("inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border", priConf.cls)}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", priConf.dot)} />{task.priority}
                </span>
              </div>
            </div>
            <div><span className="text-muted-foreground text-xs">Status</span>
              <p className="font-medium mt-0.5">{col?.label ?? task.column}</p></div>
            <div><span className="text-muted-foreground text-xs">Story Points</span>
              <p className="font-bold mt-0.5">{task.storyPoints}sp</p></div>
            <div><span className="text-muted-foreground text-xs">Due Date</span>
              <p className="font-medium mt-0.5">{new Date(task.dueDate).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}</p></div>
            <div><span className="text-muted-foreground text-xs">Attachments</span>
              <p className="font-medium mt-0.5">{task.attachments ?? 0}</p></div>
          </div>
          {(task.progress ?? 0) > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{task.progress}%</span>
              </div>
              <Progress value={task.progress} className="h-2" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Subtask Dialog ─────────────────────────────────────── */
function SubtaskDialog({ parentTask, open, onClose, onSave }: {
  parentTask: Task | null; open: boolean; onClose: () => void;
  onSave: (subtask: { title: string; assignee: string }) => void;
}) {
  const [form, setForm] = useState({ title: "", assignee: "" });
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Create Subtask</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          Parent: <span className="font-semibold text-foreground">{parentTask?.title}</span>
        </p>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Subtask Title</Label>
            <Input placeholder="e.g. Write unit tests" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} />
          </div>
          <div className="space-y-1.5">
            <Label>Assign To</Label>
            <Select value={form.assignee} onValueChange={v => setForm(f => ({...f, assignee: v}))}>
              <SelectTrigger><SelectValue placeholder="Select Intern" /></SelectTrigger>
              <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!form.title} onClick={() => { onSave(form); onClose(); setForm({ title: "", assignee: "" }); }}>
            Create Subtask
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Link Issue Dialog ──────────────────────────────────── */
function LinkIssueDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [ticketInput, setTicketInput] = useState("");
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Link Issue</DialogTitle></DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Ticket ID</Label>
            <Input placeholder="e.g. CC26BUG-003" value={ticketInput} onChange={e => setTicketInput(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!ticketInput} onClick={onClose}>Link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Attachment Dialog ──────────────────────────────────── */
function AttachmentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Add Attachment</DialogTitle></DialogHeader>
        <div className="py-3 border-2 border-dashed rounded-xl text-center text-sm text-muted-foreground space-y-2">
          <Paperclip size={24} className="mx-auto opacity-40" />
          <p>Drag & drop or click to upload</p>
          <Input type="file" className="w-fit mx-auto" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onClose}>Upload</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Kanban Card ────────────────────────────────────────── */
function KanbanCard({
  task,
  onAction,
  showActions,
  onDragStart,
  onDragEnd,
}: {
  task: Task;
  onAction: (id: string, action: string) => void;
  showActions: boolean;
  onDragStart: (task: Task, event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}) {
  const typeConf = TICKET_TYPE_CONFIG[task.ticketType ?? "Task"];
  const TypeIcon = typeConf.icon;
  const priConf  = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.Medium;
  const isDone   = task.column === "Done";
  const isBlocked = task.column === "Blocked";

  return (
    <div
      draggable
      onDragStart={event => onDragStart(task, event)}
      onDragEnd={onDragEnd}
    >
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
    >
      <Card className={cn(
        "cursor-grab active:cursor-grabbing hover:shadow-md transition-all border group",
        isDone && "opacity-75",
        isBlocked && "border-red-200 dark:border-red-800"
      )}>
        <CardContent className="p-3 space-y-2.5">
          {/* Type + ID + action */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5">
              <span className={cn("flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded", typeConf.cls)}>
                <TypeIcon size={9} />{task.ticketType}
              </span>
              <span className="text-[9px] text-muted-foreground font-mono font-semibold">
                {ticketId(task.id, task.ticketType ?? "Task")}
              </span>
            </div>
            {showActions && <ActionDropdown onAction={action => onAction(task.id, action)} />}
          </div>

          {/* Title */}
          <h4 className={cn("font-semibold text-xs leading-snug", isDone && "line-through text-muted-foreground")}>
            {task.title}
          </h4>

          {/* Description */}
          <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">{task.description}</p>

          {/* Progress */}
          {(task.progress ?? 0) > 0 && !isDone && (
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] text-muted-foreground">
                <span>Progress</span><span className="font-semibold">{task.progress}%</span>
              </div>
              <Progress value={task.progress} className="h-1" />
            </div>
          )}

          {/* Priority + SP */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={cn("flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border", priConf.cls)}>
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", priConf.dot)} />{task.priority}
            </span>
            <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-semibold">
              {task.storyPoints}sp
            </span>
          </div>

          {/* Assignee + meta */}
          <div className="flex items-center justify-between pt-1.5 border-t border-border/60">
            <div className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-bold">
                  {task.assignedTo.split(" ").map(n => n[0]).join("").substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] font-medium truncate max-w-[70px]">{task.assignedTo.split(" ")[0]}</span>
            </div>
            <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
              {(task.comments ?? 0) > 0 && (
                <span className="flex items-center gap-0.5"><MessageSquare size={9} />{task.comments}</span>
              )}
              {(task.attachments ?? 0) > 0 && (
                <span className="flex items-center gap-0.5"><Paperclip size={9} />{task.attachments}</span>
              )}
              <span className="flex items-center gap-0.5">
                <Calendar size={9} />
                {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function TaskManagement() {
  const { toast } = useToast();
  const session = getAuthSession();
  const currentRole = session?.user.role;
  const isAdmin = currentRole === "ADMIN";
  const isEmployee = currentRole === "EMPLOYEE";
  const isIntern = currentRole === "INTERN";
  const visibleColumns = isIntern ? JIRA_COLUMNS.filter(col => INTERN_COLUMN_IDS.has(col.id)) : JIRA_COLUMNS;
  const boardGridClass = isIntern ? "grid-cols-4 min-w-[880px]" : "grid-cols-6 min-w-[1320px]";
  const openedTaskIdRef = useRef<string | null>(null);
  const [viewMode, setViewMode]           = useState<"kanban" | "list">("kanban");
  const [searchTerm, setSearchTerm]       = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterType, setFilterType]       = useState("all");
  const [createOpen, setCreateOpen]       = useState(false);
  const [isCreating, setIsCreating]       = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dragAssignDialog, setDragAssignDialog] = useState<{
    open: boolean;
    task: Task | null;
    fromColumn: string;
    toColumn: string;
    assignee: string;
  }>({ open: false, task: null, fromColumn: "", toColumn: "", assignee: "" });
  const [isAssigningDraggedTask, setIsAssigningDraggedTask] = useState(false);

  const [taskList, setTaskList] = useState<Task[]>(buildTaskList);

  // Dialog states
  const [editDialog,     setEditDialog]     = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });
  const [assignDialog,   setAssignDialog]   = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });
  const [moveDialog,     setMoveDialog]     = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });
  const [viewDialog,     setViewDialog]     = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });
  const [subtaskDialog,  setSubtaskDialog]  = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });
  const [priorityDialog, setPriorityDialog] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });
  const [linkOpen,       setLinkOpen]       = useState(false);
  const [attachOpen,     setAttachOpen]     = useState(false);

  const [newTask, setNewTask] = useState({
    title: "", description: "", assignedTo: "", priority: "Medium", dueDate: "", column: "To Do",
  });
  const activeEmployees = staff.filter(employee =>
    employee.status !== "Inactive" && employee.role.toUpperCase() === "EMPLOYEE"
  );
  const currentEmployee = staff.find(employee =>
    employee.userId === session?.user.userId || employee.email === session?.user.email
  );
  const assignableInternIds = new Set(currentEmployee?.assignedInterns ?? []);
  const activeInterns = students.filter(student =>
    student.status !== "Inactive" && (!isEmployee || assignableInternIds.has(student.id))
  );
  const assigneeOptions = isEmployee
    ? activeInterns.map(intern => ({ key: intern.id, value: intern.userId ?? intern.id, label: intern.name }))
    : activeEmployees.map(employee => ({ key: employee.id, value: employee.userId ?? employee.name, label: employee.name }));
  const assigneePlaceholder = isEmployee ? "Select Intern" : "Select Employee";

  useEffect(() => {
    const syncTasks = () => setTaskList(buildTaskList());
    window.addEventListener(APP_DATA_UPDATED_EVENT, syncTasks);
    return () => window.removeEventListener(APP_DATA_UPDATED_EVENT, syncTasks);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("createTicket") === "1") {
      params.delete("createTicket");
      const nextSearch = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`);
      if (!isIntern) {
        setCreateOpen(true);
      }
    }
  }, [isIntern]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const taskId = params.get("taskId");
    if (!taskId || openedTaskIdRef.current === taskId) return;

    const task = taskList.find(t => t.id === taskId || ticketId(t.id, t.ticketType ?? "Task") === taskId);
    if (!task) return;

    openedTaskIdRef.current = taskId;
    setViewDialog({ open: true, task });
    params.delete("taskId");
    const nextSearch = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}`);
  }, [taskList]);

  const visibleTaskList = taskList.filter(task => {
    if (!session) return false;
    if (isIntern) {
      return task.assignedToUserId === session.user.userId || task.assignedTo === session.user.fullName;
    }
    if (isEmployee) {
      return task.assignedToUserId === session.user.userId ||
        task.createdByUserId === session.user.userId ||
        task.assignedTo === session.user.fullName;
    }
    return true;
  });

  const filtered = visibleTaskList.filter(t => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || t.title.toLowerCase().includes(q) || t.assignedTo.toLowerCase().includes(q) ||
      ticketId(t.id, t.ticketType ?? "Task").toLowerCase().includes(q);
    const matchPriority = filterPriority === "all" || t.priority === filterPriority;
    const matchType     = filterType === "all"     || t.ticketType === filterType;
    return matchSearch && matchPriority && matchType;
  }).sort(sortTasks);

  const handleAction = (taskId: string, action: string) => {
    if (!isAdmin) return;
    const task = taskList.find(t => t.id === taskId) ?? null;
    switch (action) {
      case "Edit":            setEditDialog({ open: true, task }); break;
      case "Assign":          setAssignDialog({ open: true, task }); break;
      case "Move":            setMoveDialog({ open: true, task }); break;
      case "View Details":    setViewDialog({ open: true, task }); break;
      case "Create Subtask":  setSubtaskDialog({ open: true, task }); break;
      case "Change Priority": setPriorityDialog({ open: true, task }); break;
      case "Link Issue":      setLinkOpen(true); break;
      case "Add Attachment":  setAttachOpen(true); break;
      case "Add Watcher":
        toast({ title: "Watcher added", description: "You are now watching this ticket." }); break;
      case "Duplicate":
        if (task) {
          const dup: Task = { ...task, id: `TSK${String(taskList.length + 1).padStart(3, "0")}`, title: `${task.title} (Copy)` };
          setTaskList(prev => [dup, ...prev]);
          toast({ title: "Duplicated", description: `"${task.title}" has been duplicated.` });
        }
        break;
      case "Archive":
        void saveMove(taskId, "Done");
        break;
      case "Delete":
        setTaskList(prev => prev.filter(t => t.id !== taskId));
        toast({ title: "Ticket deleted", variant: "destructive" });
        break;
      default:
        toast({ title: action, description: `Action performed successfully.` });
    }
  };

  const handleCreate = async () => {
    if (isIntern) return;
    if (!newTask.title || !newTask.assignedTo) return;
    setIsCreating(true);
    try {
      const payload = await apiJson<{ task: typeof initialTasks[0] }>("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description,
          assignedTo: newTask.assignedTo,
          priority: newTask.priority,
          dueDate: newTask.dueDate || new Date().toISOString().split("T")[0],
          status: newTask.column,
        }),
      });

      setTaskList(prev => upsertTask(prev, payload.task));
      await refreshAppData();
      setNewTask({ title: "", description: "", assignedTo: "", priority: "Medium", dueDate: "", column: "To Do" });
      setCreateOpen(false);
      toast({ title: "Ticket created", description: `"${payload.task.title}" added to ${payload.task.status}.` });
    } catch (error) {
      toast({
        title: "Ticket creation failed",
        description: error instanceof Error ? error.message : "Unable to save the ticket.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const persistTaskUpdate = async (id: string, data: Partial<Task>, extraBody: Record<string, unknown> = {}) => {
    const payload = await apiJson<{ task: typeof initialTasks[0] }>(`/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: data.title,
        description: data.description,
        assignedTo: data.assignedTo,
        priority: data.priority,
        dueDate: data.dueDate,
        status: data.column ?? data.status,
        ...extraBody,
      }),
    });
    setTaskList(prev => upsertTask(prev, payload.task));
    await refreshAppData();
    return payload.task;
  };

  const saveEdit = async (id: string, data: Partial<Task>) => {
    try {
      await persistTaskUpdate(id, data);
      toast({ title: "Ticket updated" });
    } catch (error) {
      toast({ title: "Ticket update failed", description: error instanceof Error ? error.message : "Unable to update ticket.", variant: "destructive" });
    }
  };
  const saveAssign = async (id: string, assignedTo: string) => {
    try {
      await persistTaskUpdate(id, { assignedTo });
      toast({ title: "Ticket assigned", description: `Assigned to ${assignedTo}` });
    } catch (error) {
      toast({ title: "Assignment failed", description: error instanceof Error ? error.message : "Unable to assign ticket.", variant: "destructive" });
    }
  };
  const saveMove = async (id: string, column: string) => {
    try {
      await persistTaskUpdate(id, { column, status: column });
      toast({ title: "Ticket moved", description: `Moved to ${column}` });
    } catch (error) {
      toast({ title: "Move failed", description: error instanceof Error ? error.message : "Unable to move ticket.", variant: "destructive" });
    }
  };
  const savePriority = async (id: string, priority: string) => {
    try {
      await persistTaskUpdate(id, { priority });
      toast({ title: "Priority updated", description: priority });
    } catch (error) {
      toast({ title: "Priority update failed", description: error instanceof Error ? error.message : "Unable to update priority.", variant: "destructive" });
    }
  };

  const startTaskDrag = (task: Task, event: DragEvent<HTMLDivElement>) => {
    setDraggedTaskId(task.id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", task.id);
  };

  const clearTaskDrag = () => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleColumnDragOver = (event: DragEvent<HTMLDivElement>, columnId: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  };

  const handleColumnDragLeave = (event: DragEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget;
    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
      setDragOverColumn(null);
    }
  };

  const handleColumnDrop = (event: DragEvent<HTMLDivElement>, columnId: string) => {
    event.preventDefault();
    const taskId = draggedTaskId ?? event.dataTransfer.getData("text/plain");
    clearTaskDrag();
    if (!taskId) return;

    const task = taskList.find(item => item.id === taskId);
    if (!task) return;

    const currentColumn = isIntern ? getInternBoardColumn(task.column) : task.column ?? "To Do";
    if (currentColumn === columnId) return;

    if (isAdmin) {
      const existingAssignee = activeEmployees.find(employee =>
        employee.userId === task.assignedToUserId || employee.name === task.assignedTo
      );
      setDragAssignDialog({
        open: true,
        task,
        fromColumn: currentColumn,
        toColumn: columnId,
        assignee: existingAssignee?.userId ?? existingAssignee?.name ?? "",
      });
      return;
    }

    void saveMove(taskId, columnId);
  };

  const closeDragAssignDialog = () => {
    if (isAssigningDraggedTask) return;
    setDragAssignDialog({ open: false, task: null, fromColumn: "", toColumn: "", assignee: "" });
  };

  const confirmDraggedAssignment = async () => {
    if (!dragAssignDialog.task || !dragAssignDialog.assignee) return;
    setIsAssigningDraggedTask(true);
    try {
      const updated = await persistTaskUpdate(
        dragAssignDialog.task.id,
        {
          assignedTo: dragAssignDialog.assignee,
          column: dragAssignDialog.toColumn,
          status: dragAssignDialog.toColumn,
        },
        { notifyAssignment: true },
      );
      setDragAssignDialog({ open: false, task: null, fromColumn: "", toColumn: "", assignee: "" });
      toast({
        title: "Work assigned",
        description: `"${updated.title}" moved to ${updated.status}.`,
      });
    } catch (error) {
      toast({
        title: "Assignment failed",
        description: error instanceof Error ? error.message : "Unable to assign dragged task.",
        variant: "destructive",
      });
    } finally {
      setIsAssigningDraggedTask(false);
    }
  };

  const totalDone    = visibleTaskList.filter(t => t.column === "Done").length;
  const totalBlocked = visibleTaskList.filter(t => t.column === "Blocked").length;
  const totalActive  = visibleTaskList.filter(t => t.column === "In Progress").length;
  const doneSP       = visibleTaskList.filter(t => t.column === "Done").reduce((a, t) => a + (t.storyPoints ?? 0), 0);
  const totalSP      = visibleTaskList.reduce((a, t) => a + (t.storyPoints ?? 0), 0);
  const hasFilters   = searchTerm || filterPriority !== "all" || filterType !== "all";

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Task Board</h1>
        </div>
        <div className="flex gap-2 items-center w-full sm:w-auto flex-wrap">
          {/* Search */}
          <div className="relative flex-1 sm:w-52 sm:flex-none">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search tickets…" className="pl-9 h-8 text-sm" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)} />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} className="absolute right-2.5 top-2">
                <X size={13} className="text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Filters */}
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="h-8 text-xs w-32">
              <Filter size={11} className="mr-1 shrink-0" /><SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              {["Critical","High","Medium","Low"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 text-xs w-28"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.keys(TICKET_TYPE_CONFIG).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button size="sm" variant="ghost" className="h-8 text-xs"
              onClick={() => { setSearchTerm(""); setFilterPriority("all"); setFilterType("all"); }}>
              Clear <X size={11} className="ml-1" />
            </Button>
          )}

          {/* View toggle */}
          <div className="bg-muted p-0.5 rounded-md flex shrink-0">
            <Button variant={viewMode === "kanban" ? "secondary" : "ghost"} size="sm"
              className="px-2 h-7 text-xs" onClick={() => setViewMode("kanban")}>
              <LayoutGrid size={13} className="mr-1" />Kanban
            </Button>
            <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="sm"
              className="px-2 h-7 text-xs" onClick={() => setViewMode("list")}>
              <List size={13} className="mr-1" />List
            </Button>
          </div>

          {!isIntern && (
            <Button size="sm" className="gap-1.5 h-8 shrink-0" onClick={() => setCreateOpen(true)}>
              <Plus size={14} />Create
            </Button>
          )}
        </div>
      </div>

      {/* ── Sprint stats ─────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Tickets", value: taskList.length, color: "text-foreground" },
          { label: "In Progress",   value: totalActive,     color: "text-blue-600" },
          { label: "Blocked",       value: totalBlocked,    color: "text-red-600" },
          { label: "Story Points",  value: `${doneSP}/${totalSP}sp`, color: "text-green-600" },
        ].map(s => (
          <Card key={s.label} className="border shadow-sm">
            <CardContent className="p-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
              <span className={cn("text-lg font-bold", s.color)}>{s.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Board / List ─────────────────────────────── */}
      {viewMode === "kanban" ? (
        <div className="overflow-x-auto pb-4 -mx-1 px-1">
          <div className={cn("grid gap-3 h-[calc(100vh-20rem)] min-h-[460px]", boardGridClass)}>
          {visibleColumns.map(col => {
            const ColIcon = col.icon;
            const colTasks = filtered.filter(t => (isIntern ? getInternBoardColumn(t.column) : t.column) === col.id);
            const isDragOver = dragOverColumn === col.id;
            return (
              <div
                key={col.id}
                className="min-w-0 flex flex-col"
                onDragOver={event => handleColumnDragOver(event, col.id)}
                onDragLeave={handleColumnDragLeave}
                onDrop={event => handleColumnDrop(event, col.id)}
              >
                <div className={cn(
                  "rounded-xl border border-t-4 overflow-hidden flex flex-col h-full transition-all",
                  col.topColor,
                  isDragOver && "ring-2 ring-primary/30 bg-primary/5"
                )}>
                  <div className={cn("flex items-center justify-between px-3 py-2.5 border-b shrink-0", col.headerBg)}>
                    <div className="flex items-center gap-1.5">
                      <ColIcon size={13} className="text-muted-foreground" />
                      <span className="font-bold text-xs">{col.label}</span>
                    </div>
                    <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", col.badge)}>
                      {colTasks.length}
                    </span>
                  </div>
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-0 bg-muted/10">
                    <AnimatePresence>
                      {colTasks.map(task => (
                        <KanbanCard
                          key={task.id}
                          task={task}
                          onAction={handleAction}
                          showActions={isAdmin}
                          onDragStart={startTaskDrag}
                          onDragEnd={clearTaskDrag}
                        />
                      ))}
                    </AnimatePresence>
                    {colTasks.length === 0 && (
                      <div className={cn(
                        "h-16 border-2 border-dashed rounded-xl flex items-center justify-center text-[10px] transition-colors",
                        isDragOver ? "border-primary/40 text-primary/70 bg-primary/5" : "text-muted-foreground/40"
                      )}>
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
      ) : (
        <Card className="shadow-sm">
          <CardHeader className="py-3 border-b bg-muted/20">
            <CardTitle className="text-sm font-semibold">All Tickets ({filtered.length})</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/20">
                <TableRow>
                  <TableHead className="w-28 text-xs">Ticket</TableHead>
                  <TableHead className="text-xs">Title</TableHead>
                  <TableHead className="text-xs">Assignee</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Priority</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">SP</TableHead>
                  <TableHead className="text-xs">Due</TableHead>
                  {isAdmin && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={isAdmin ? 9 : 8} className="h-28 text-center text-muted-foreground text-sm">No tickets found.</TableCell></TableRow>
                ) : filtered.map(task => {
                  const tc   = TICKET_TYPE_CONFIG[task.ticketType ?? "Task"];
                  const TIcon= tc.icon;
                  const pc   = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.Medium;
                  return (
                    <TableRow key={task.id} className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => setViewDialog({ open: true, task })}>
                      <TableCell className="font-mono text-[10px] text-muted-foreground font-semibold">
                        {ticketId(task.id, task.ticketType ?? "Task")}
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-xs">{task.title}</p>
                        <p className="text-[10px] text-muted-foreground line-clamp-1 max-w-xs">{task.description}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                              {task.assignedTo.split(" ").map(n => n[0]).join("").substring(0,2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs">{task.assignedTo.split(" ")[0]}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn("flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded w-fit", tc.cls)}>
                          <TIcon size={9} />{task.ticketType}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn("flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border w-fit", pc.cls)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", pc.dot)} />{task.priority}
                        </span>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Select value={isIntern ? getInternBoardColumn(task.column) : task.column ?? "To Do"} onValueChange={v => saveMove(task.id, v)}>
                          <SelectTrigger className="h-6 text-[10px] w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {visibleColumns.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-muted-foreground">{task.storyPoints}sp</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </TableCell>
                      {isAdmin && (
                        <TableCell onClick={e => e.stopPropagation()}>
                          <ActionDropdown onAction={action => handleAction(task.id, action)} />
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="p-3 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span>Showing {filtered.length} of {visibleTaskList.length} tickets</span>
            <span className="font-semibold">{totalDone} Done · {totalBlocked} Blocked · {totalActive} Active</span>
          </div>
        </Card>
      )}

      {/* ── Create Ticket Dialog ──────────────────────── */}
      <Dialog open={dragAssignDialog.open} onOpenChange={(open) => { if (!open) closeDragAssignDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Assign Work</DialogTitle></DialogHeader>
          {dragAssignDialog.task && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted/20 p-3 space-y-1.5">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Task</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {ticketId(dragAssignDialog.task.id, dragAssignDialog.task.ticketType ?? "Task")}
                </p>
                <p className="text-sm font-semibold leading-snug">{dragAssignDialog.task.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">From Status</p>
                  <p className="font-medium">{dragAssignDialog.fromColumn}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">To Status</p>
                  <p className="font-medium">{dragAssignDialog.toColumn}</p>
                </div>
              </div>

              {dragAssignDialog.task.projectName && (
                <div className="rounded-lg border p-3 text-sm">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Project</p>
                  <p className="font-medium">{dragAssignDialog.task.projectName}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Assign To <span className="text-destructive">*</span></Label>
                <Select
                  value={dragAssignDialog.assignee}
                  onValueChange={value => setDragAssignDialog(current => ({ ...current, assignee: value }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
                  <SelectContent>
                    {activeEmployees.map(employee => (
                      <SelectItem key={employee.id} value={employee.userId ?? employee.name}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={employee.avatarUrl ?? undefined} />
                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-bold">
                              {employee.name.split(" ").map(part => part[0]).join("").slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{employee.name}</span>
                          <span className="text-[10px] text-muted-foreground">Employee</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeDragAssignDialog} disabled={isAssigningDraggedTask}>Cancel</Button>
            <Button
              onClick={confirmDraggedAssignment}
              disabled={isAssigningDraggedTask || !dragAssignDialog.assignee}
            >
              {isAssigningDraggedTask ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isIntern && (
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Create Ticket</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Fix authentication crash on submit"
                value={newTask.title} onChange={e => setNewTask(f => ({...f, title: e.target.value}))} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="Describe the task…" rows={3}
                value={newTask.description} onChange={e => setNewTask(f => ({...f, description: e.target.value}))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Assign To <span className="text-destructive">*</span></Label>
                <Select value={newTask.assignedTo} onValueChange={v => setNewTask(f => ({...f, assignedTo: v}))}>
                  <SelectTrigger><SelectValue placeholder={assigneePlaceholder} /></SelectTrigger>
                  <SelectContent>
                    {assigneeOptions.map(option => (
                      <SelectItem key={option.key} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={newTask.priority} onValueChange={v => setNewTask(f => ({...f, priority: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Low","Medium","High","Critical"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Column</Label>
                <Select value={newTask.column} onValueChange={v => setNewTask(f => ({...f, column: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{JIRA_COLUMNS.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input type="date" value={newTask.dueDate} onChange={e => setNewTask(f => ({...f, dueDate: e.target.value}))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isCreating || !newTask.title || !newTask.assignedTo}>
              {isCreating ? "Creating..." : "Create Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      {/* ── All Dialogs ───────────────────────────────── */}
      <EditDialog
        task={editDialog.task} open={editDialog.open}
        onClose={() => setEditDialog({ open: false, task: null })}
        onSave={data => { if (editDialog.task) void saveEdit(editDialog.task.id, data); }}
      />
      <AssignDialog
        task={assignDialog.task} open={assignDialog.open}
        onClose={() => setAssignDialog({ open: false, task: null })}
        onSave={assignee => { if (assignDialog.task) void saveAssign(assignDialog.task.id, assignee); }}
      />
      <MoveDialog
        task={moveDialog.task} open={moveDialog.open}
        onClose={() => setMoveDialog({ open: false, task: null })}
        onSave={col => { if (moveDialog.task) void saveMove(moveDialog.task.id, col); }}
      />
      <ViewDetailsDialog
        task={viewDialog.task} open={viewDialog.open}
        onClose={() => setViewDialog({ open: false, task: null })}
      />
      <SubtaskDialog
        parentTask={subtaskDialog.task} open={subtaskDialog.open}
        onClose={() => setSubtaskDialog({ open: false, task: null })}
        onSave={({ title, assignee }) => toast({ title: "Subtask created", description: `"${title}"${assignee ? ` → ${assignee}` : ""}` })}
      />
      <PriorityDialog
        task={priorityDialog.task} open={priorityDialog.open}
        onClose={() => setPriorityDialog({ open: false, task: null })}
        onSave={priority => { if (priorityDialog.task) void savePriority(priorityDialog.task.id, priority); }}
      />
      <LinkIssueDialog open={linkOpen} onClose={() => setLinkOpen(false)} />
      <AttachmentDialog open={attachOpen} onClose={() => setAttachOpen(false)} />
    </div>
  );
}
