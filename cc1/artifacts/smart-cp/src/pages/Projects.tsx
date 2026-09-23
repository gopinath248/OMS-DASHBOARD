import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  FolderOpen, Plus, Search, Filter, Calendar, User, FileText,
  Eye, ChevronDown, X, Clock, CheckCircle2, PauseCircle, XCircle,
  Loader2, Users, TrendingUp, Flag, Target, CheckSquare
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import {
  projects as initialProjects, projectDocuments, students,
  Project, ProjectStatus, ProjectCategory
} from "@/data/mockData";
import { getAuthSession, roleToNavigationRole } from "@/lib/auth";

const STATUS_CONFIG: Record<ProjectStatus, { color: string; icon: React.ElementType; bg: string }> = {
  Active:    { color: "text-green-700",  bg: "bg-green-100",  icon: CheckCircle2 },
  Planning:  { color: "text-blue-700",   bg: "bg-blue-100",   icon: Loader2 },
  "On Hold": { color: "text-yellow-700", bg: "bg-yellow-100", icon: PauseCircle },
  Completed: { color: "text-indigo-700", bg: "bg-indigo-100", icon: CheckCircle2 },
  Cancelled: { color: "text-red-700",    bg: "bg-red-100",    icon: XCircle },
};

const PRIORITY_COLORS: Record<string, { text: string; bg: string }> = {
  Critical: { text: "text-red-700",    bg: "bg-red-100" },
  High:     { text: "text-orange-700", bg: "bg-orange-100" },
  Medium:   { text: "text-blue-700",   bg: "bg-blue-100" },
  Low:      { text: "text-gray-700",   bg: "bg-gray-100" },
};

const CATEGORIES: ProjectCategory[] = [
  "Web Application", "Mobile App", "UI/UX Design", "Data & AI", "Infrastructure", "Research", "HR & Operations"
];
const STATUSES: ProjectStatus[] = ["Active", "Planning", "On Hold", "Completed", "Cancelled"];
const GRADIENT_OPTIONS = [
  "from-blue-500 to-indigo-600", "from-purple-500 to-pink-500", "from-green-500 to-emerald-600",
  "from-orange-500 to-red-500", "from-cyan-500 to-blue-500", "from-gray-600 to-gray-800",
  "from-rose-500 to-pink-600", "from-teal-500 to-cyan-600", "from-amber-500 to-orange-500",
];

const TECH_STACK_FALLBACK: Record<string, string[]> = {
  "Web Application": ["React", "Node.js", "PostgreSQL"],
  "Mobile App":      ["Flutter", "Firebase", "Dart"],
  "UI/UX Design":    ["Figma", "React", "Tailwind CSS"],
  "Data & AI":       ["Python", "TensorFlow", "FastAPI"],
  "Infrastructure":  ["Docker", "Kubernetes", "GitHub Actions"],
  "Research":        ["Python", "R", "LaTeX"],
  "HR & Operations": ["Django", "PostgreSQL", "React"],
};

function getTechStack(p: Project): string[] {
  if ((p as any).techStack && Array.isArray((p as any).techStack)) return (p as any).techStack;
  return TECH_STACK_FALLBACK[p.category] ?? [p.category];
}

function getPriority(p: Project): string {
  if ((p as any).priority) return (p as any).priority;
  if (p.status === "Active") return "High";
  if (p.status === "Planning") return "Medium";
  if (p.status === "Completed") return "High";
  return "Low";
}

function getProjectProgress(p: Project): number {
  const assigned = students.filter(s => p.assignedInterns.includes(s.id));
  if (assigned.length === 0) return 0;
  return Math.round(assigned.reduce((sum, s) => sum + s.progress, 0) / assigned.length);
}

function getTeamMembers(p: Project) {
  return students.filter(s => p.assignedInterns.includes(s.id)).slice(0, 5);
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
      <Icon size={11} />
      {status}
    </span>
  );
}

function ProjectCard({ project, docCount, role }: { project: Project; docCount: number; role: string }) {
  const [, navigate] = useLocation();
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden border hover:border-primary/30">
        <div className={`h-2 w-full bg-gradient-to-r ${project.imageColor}`} />
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${project.imageColor} flex items-center justify-center flex-shrink-0`}>
              <FolderOpen size={18} className="text-white" />
            </div>
            <StatusBadge status={project.status} />
          </div>
          <button type="button" className="block text-left" onClick={() => navigate(`/projects/${project.id}`)}>
            <h3 className="font-bold text-base leading-tight mb-1 hover:text-primary transition-colors">{project.name}</h3>
            <p className="text-xs text-muted-foreground mb-4 line-clamp-2 hover:text-foreground">{project.description}</p>
          </button>
          <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
            <div className="flex items-center gap-1.5">
              <User size={11} className="shrink-0" />
              <span>Created by <span className="font-medium text-foreground">{project.createdBy}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar size={11} className="shrink-0" />
              <span>{project.startDate} → {project.endDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText size={11} className="shrink-0" />
              <span><span className="font-medium text-foreground">{docCount}</span> document{docCount !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Category</span>
            <Badge variant="outline" className="text-xs py-0">{project.category}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5 flex-1">
              {project.assignedInterns.slice(0, 4).map((_, i) => (
                <div key={i} className={`w-6 h-6 rounded-full border-2 border-white bg-gradient-to-br ${project.imageColor} text-white text-[9px] font-bold flex items-center justify-center`}>
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
              {project.assignedInterns.length > 4 && (
                <div className="w-6 h-6 rounded-full border-2 border-white bg-muted text-muted-foreground text-[9px] font-bold flex items-center justify-center">
                  +{project.assignedInterns.length - 4}
                </div>
              )}
            </div>
            <Button size="sm" className="gap-1.5 text-xs h-7" onClick={() => navigate(`/projects/${project.id}`)}>
              <Eye size={12} /> View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ActiveProjectCard({ project }: { project: Project }) {
  const [, navigate] = useLocation();
  const progress = getProjectProgress(project);
  const techStack = getTechStack(project);
  const teamMembers = getTeamMembers(project);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden border hover:border-primary/30 h-full">
        <div className={`h-1.5 w-full bg-gradient-to-r ${project.imageColor}`} />
        <CardContent className="p-5 flex flex-col h-full">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${project.imageColor} flex items-center justify-center flex-shrink-0`}>
              <FolderOpen size={16} className="text-white" />
            </div>
            <StatusBadge status={project.status} />
          </div>

          <h3 className="font-bold text-sm leading-tight mb-1 group-hover:text-primary transition-colors">{project.name}</h3>
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{project.description}</p>

          <div className="flex flex-wrap gap-1 mb-3">
            {techStack.slice(0, 4).map(tech => (
              <span key={tech} className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-medium text-muted-foreground">{tech}</span>
            ))}
          </div>

          <div className="space-y-1.5 mb-3">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-semibold text-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-1.5">
              <Calendar size={11} className="shrink-0" />
              <span>Start: <span className="font-medium text-foreground">{project.startDate}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={11} className="shrink-0 text-orange-500" />
              <span>Deadline: <span className="font-medium text-foreground">{project.endDate}</span></span>
            </div>
          </div>

          {teamMembers.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Team Members</p>
              <div className="flex -space-x-1.5">
                {teamMembers.map((s, i) => (
                  <div
                    key={s.id}
                    title={s.name}
                    className={`w-7 h-7 rounded-full border-2 border-white bg-gradient-to-br ${project.imageColor} text-white text-[10px] font-bold flex items-center justify-center`}
                  >
                    {s.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                ))}
                {project.assignedInterns.length > 5 && (
                  <div className="w-7 h-7 rounded-full border-2 border-white bg-muted text-muted-foreground text-[10px] font-bold flex items-center justify-center">
                    +{project.assignedInterns.length - 5}
                  </div>
                )}
              </div>
            </div>
          )}

          <Button size="sm" className="gap-1.5 text-xs w-full mt-auto" onClick={() => navigate(`/projects/${project.id}`)}>
            <Eye size={12} /> View Project
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ActivePlanCard({ project }: { project: Project }) {
  const priority = getPriority(project);
  const priorityStyle = PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.Medium;
  const completion = getProjectProgress(project);
  const teamMembers = getTeamMembers(project);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card className="group hover:shadow-md transition-all border hover:border-primary/30">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${project.imageColor} flex items-center justify-center flex-shrink-0`}>
              <Target size={14} className="text-white" />
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${priorityStyle.bg} ${priorityStyle.text}`}>
              {priority}
            </span>
          </div>

          <h3 className="font-bold text-sm leading-tight mb-1 group-hover:text-primary">{project.name}</h3>
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{project.description}</p>

          <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-1.5">
              <Calendar size={11} />
              <span>Target: <span className="font-medium text-foreground">{project.endDate}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={`text-[10px] px-1.5 h-4 ${STATUS_CONFIG[project.status].bg} ${STATUS_CONFIG[project.status].color} border-0`}>
                {project.status}
              </Badge>
            </div>
          </div>

          {teamMembers.length > 0 && (
            <div className="flex items-center gap-1.5 mb-3">
              <Users size={11} className="text-muted-foreground shrink-0" />
              <div className="flex -space-x-1">
                {teamMembers.slice(0, 4).map(s => (
                  <div key={s.id} title={s.name} className={`w-5 h-5 rounded-full border border-white bg-gradient-to-br ${project.imageColor} text-white text-[8px] font-bold flex items-center justify-center`}>
                    {s.name[0]}
                  </div>
                ))}
              </div>
              {project.assignedInterns.length > 0 && (
                <span className="text-xs text-muted-foreground">{project.assignedInterns.length} member{project.assignedInterns.length !== 1 ? "s" : ""}</span>
              )}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-semibold">{completion}%</span>
            </div>
            <Progress value={completion} className="h-1.5" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function CompletedPlanCard({ project }: { project: Project }) {
  const remarks = (project as any).remarks as string | undefined;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card className="group hover:shadow-md transition-all border border-green-100 bg-green-50/30 hover:border-green-200">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
              <CheckSquare size={14} className="text-white" />
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              Completed
            </span>
          </div>

          <h3 className="font-bold text-sm leading-tight mb-1 group-hover:text-primary">{project.name}</h3>
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{project.description}</p>

          <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-1.5">
              <Calendar size={11} className="text-green-600" />
              <span>Completed: <span className="font-medium text-foreground">{project.endDate}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={11} className="text-green-600" />
              <span>Final Status: <span className="font-medium text-green-700">Successfully Delivered</span></span>
            </div>
          </div>

          {remarks ? (
            <div className="mt-2 p-2.5 bg-green-100/50 rounded-md border border-green-200">
              <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wide mb-0.5">Remarks</p>
              <p className="text-xs text-green-800">{remarks}</p>
            </div>
          ) : (
            <div className="mt-2 p-2.5 bg-muted/40 rounded-md">
              <p className="text-xs text-muted-foreground italic">All deliverables submitted and approved.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StudentProjectsView({ allProjects, internId }: { allProjects: Project[]; internId: string }) {
  const myActiveProjects = allProjects.filter(p =>
    p.status === "Active" && p.assignedInterns.includes(internId)
  );
  const activePlans = allProjects.filter(p =>
    p.status === "Active" || p.status === "Planning"
  );
  const completedPlans = allProjects.filter(p => p.status === "Completed");

  const kpis = [
    { label: "My Active Projects", value: myActiveProjects.length, icon: FolderOpen, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "All Active Plans", value: activePlans.length, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Completed Plans", value: completedPlans.length, icon: CheckCircle2, color: "text-indigo-600", bg: "bg-indigo-50" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Project Repository</h1>
        <p className="text-muted-foreground mt-1">Your projects, plans, and milestones in one place.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((k, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${k.bg} ${k.color}`}><k.icon size={20} /></div>
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-bold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 bg-blue-500 rounded-full" />
          <h2 className="text-xl font-bold">Active Projects</h2>
          <Badge variant="secondary">{myActiveProjects.length}</Badge>
        </div>
        {myActiveProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
            <FolderOpen size={40} className="mb-3 opacity-30" />
            <p className="font-medium">No active projects assigned to you yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {myActiveProjects.map(p => <ActiveProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 bg-green-500 rounded-full" />
          <h2 className="text-xl font-bold">All Active Plans</h2>
          <Badge variant="secondary">{activePlans.length}</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {activePlans.map(p => <ActivePlanCard key={p.id} project={p} />)}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 bg-indigo-500 rounded-full" />
          <h2 className="text-xl font-bold">Completed Plans</h2>
          <Badge variant="secondary">{completedPlans.length}</Badge>
        </div>
        {completedPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
            <CheckCircle2 size={36} className="mb-2 opacity-30" />
            <p className="font-medium">No completed plans yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {completedPlans.map(p => <CompletedPlanCard key={p.id} project={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}

interface AddProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (project: Project) => void;
}

function AddProjectDialog({ open, onClose, onAdd }: AddProjectDialogProps) {
  const [form, setForm] = useState({
    name: "", description: "", category: "" as ProjectCategory | "",
    startDate: "", endDate: "", status: "Planning" as ProjectStatus,
  });

  function handleSubmit() {
    if (!form.name || !form.category || !form.startDate || !form.endDate) return;
    const idx = Math.floor(Math.random() * GRADIENT_OPTIONS.length);
    onAdd({
      id: `PRJ${Date.now()}`,
      name: form.name,
      description: form.description,
      category: form.category as ProjectCategory,
      createdBy: "Admin",
      startDate: form.startDate,
      endDate: form.endDate,
      status: form.status,
      imageColor: GRADIENT_OPTIONS[idx],
      assignedStaff: [],
      assignedInterns: [],
    });
    setForm({ name: "", description: "", category: "", startDate: "", endDate: "", status: "Planning" });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus size={18} /> Add New Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Project Name <span className="text-destructive">*</span></Label>
            <Input placeholder="e.g. E-Commerce Platform" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea placeholder="Brief project description…" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category <span className="text-destructive">*</span></Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as ProjectCategory }))}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as ProjectStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.name || !form.category || !form.startDate || !form.endDate}>Create Project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Projects() {
  const session = getAuthSession();
  const role = session ? roleToNavigationRole(session.user.role) : "admin";
  const [allProjects, setAllProjects] = useState<Project[]>(initialProjects);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | "All">("All");
  const [filterCategory, setFilterCategory] = useState<ProjectCategory | "All">("All");
  const [showFilters, setShowFilters] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  if (role === "intern") {
    const internRecord = students.find(student =>
      student.userId === session?.user.userId ||
      student.id === session?.user.userId ||
      (!!session?.user.email && student.email.toLowerCase() === session.user.email.toLowerCase())
    );
    return <StudentProjectsView allProjects={allProjects} internId={internRecord?.id ?? session?.user.userId ?? ""} />;
  }

  const docCountFor = (id: string) => projectDocuments.filter(d => d.projectId === id).length;

  const visibleProjects = allProjects.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || p.status === filterStatus;
    const matchCategory = filterCategory === "All" || p.category === filterCategory;
    return matchSearch && matchStatus && matchCategory;
  });

  const stats = {
    total: allProjects.length,
    active: allProjects.filter(p => p.status === "Active").length,
    completed: allProjects.filter(p => p.status === "Completed").length,
    totalDocs: projectDocuments.length,
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects Repository</h1>
        </div>
        {(role === "admin" || role === "employee") && (
          <Button className="gap-2 shrink-0" onClick={() => setShowAddDialog(true)}>
            <Plus size={16} /> Add Project
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Projects", value: stats.total, icon: FolderOpen, color: "text-blue-500", bg: "bg-blue-50" },
          { label: "Active", value: stats.active, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "Completed", value: stats.completed, icon: Clock, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Total Documents", value: stats.totalDocs, icon: FileText, color: "text-orange-500", bg: "bg-orange-50" },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.bg} ${s.color}`}><s.icon size={18} /></div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search projects by name or description…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>
        <Button variant="outline" className="gap-2 shrink-0" onClick={() => setShowFilters(f => !f)}>
          <Filter size={15} /> Filters
          <ChevronDown size={14} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </Button>
      </div>

      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-muted/40 rounded-xl border"
        >
          <div className="space-y-1">
            <Label className="text-xs">Filter by Status</Label>
            <Select value={filterStatus} onValueChange={v => setFilterStatus(v as ProjectStatus | "All")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Filter by Category</Label>
            <Select value={filterCategory} onValueChange={v => setFilterCategory(v as ProjectCategory | "All")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </motion.div>
      )}

      {visibleProjects.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FolderOpen size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No projects found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {visibleProjects.map(project => (
            <ProjectCard key={project.id} project={project} docCount={docCountFor(project.id)} role={role} />
          ))}
        </div>
      )}

      <AddProjectDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} onAdd={p => setAllProjects(prev => [p, ...prev])} />
    </div>
  );
}
