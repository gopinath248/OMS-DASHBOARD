import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Plus, Search, Filter, Eye, Edit, Download,
  FileText, FileSpreadsheet, Loader2, X, MoreVertical,
  UserCheck, UserX, Trash2, UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { replaceAppData, staff as initialStaff, students as initialStudents, projects as initialProjects, type Project } from "@/data/mockData";
import { getAuthSession } from "@/lib/auth";
import { apiJson } from "@/lib/api";
import { motion } from "framer-motion";

type Staff = typeof initialStaff[0];
type Student = typeof initialStudents[0];
type CreatedCredential = { userId: string; temporaryPassword: string; name: string };

const ROLES_LIST = ["ADMIN", "EMPLOYEE", "INTERN", "HR", "MANAGER"];
const STAFF_DESIGNATIONS = [
  "Senior Engineer", "Lead Data Scientist", "Product Manager", "DevOps Lead",
  "ML Research Engineer", "Full Stack Engineer", "HR Specialist", "Hardware Engineer",
  "Power Systems Expert", "Security Engineer", "Junior Engineer",
];
const STATUSES = ["Active", "On Leave"] as const;

const EMPTY_FORM = {
  name: "", email: "", phone: "", designation: "",
  role: "", bio: "", temporaryPassword: "", status: "Active" as "Active" | "On Leave",
};

function getEmpUserId(name: string, id: string): string {
  const lastName = name.split(" ").slice(-1)[0];
  const num = id.slice(-3);
  return `${lastName}CC${num}`;
}

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [
    headers.join(","),
    ...rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function openPrintWindow(title: string, html: string) {
  const win = window.open("", "_blank", "width=1000,height=700");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
    body{font-family:Arial,sans-serif;margin:0;padding:28px;color:#111;background:#f4f7fb}
    .page{max-width:1000px;margin:0 auto;background:#fff;border:1px solid #d8dee9;border-radius:16px;padding:28px;position:relative;overflow:hidden}
    .page:before{content:"CODE CORE";position:absolute;right:22px;bottom:16px;font-size:78px;font-weight:900;color:#0f2f6e;opacity:.045}
    .content{position:relative;z-index:1}
    .brand{display:flex;align-items:center;gap:14px;border-bottom:3px solid #D4AF37;padding-bottom:16px;margin-bottom:20px}
    .mark{width:56px;height:56px;border-radius:14px;background:#0f2f6e;color:#D4AF37;display:flex;align-items:center;justify-content:center;font-weight:900;letter-spacing:1px}
    h1{font-size:21px;margin:0}
    .sub{font-size:11px;color:#666;margin-bottom:16px}
    table{border-collapse:collapse;width:100%;font-size:12px}
    th,td{border:1px solid #ddd;padding:7px 10px;text-align:left}
    th{background:#f5f5f5;font-weight:600}
    tr:nth-child(even){background:#fafafa}
  </style></head><body><div class="page"><div class="content">
  <div class="brand"><div class="mark">CC</div><div><h1>${title}</h1><div class="sub">CODE CORE PLANYWAY - Exported on ${new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}</div></div></div>
  ${html}
  </div></div></body></html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 400);
}

function AssignedInternsDialog({ employee, interns, open, onClose }: { employee: Staff | null; interns: Student[]; open: boolean; onClose: () => void }) {
  if (!employee) return null;
  const assignedStudents = interns.filter(s => employee.assignedInterns.includes(s.id));
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assigned Interns — {employee.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {assignedStudents.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(["Active", "Pending", "Completed"] as const).map(status => {
                const columnItems = assignedStudents.filter(s => s.status === status);
                const color = status === "Active" ? "border-t-green-500" : status === "Pending" ? "border-t-amber-500" : "border-t-blue-500";
                return (
                  <div key={status} className={`rounded-lg border border-t-4 ${color} bg-muted/20 min-h-44`}>
                    <div className="px-3 py-2 border-b flex items-center justify-between">
                      <h3 className="text-sm font-semibold">{status}</h3>
                      <Badge variant="outline" className="text-[10px]">{columnItems.length}</Badge>
                    </div>
                    <div className="p-3 space-y-2 max-h-56 overflow-y-auto">
                      {columnItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-8">No Interns</p>
                      ) : columnItems.map(s => (
                        <div key={s.id} className="rounded-md border bg-card p-3 shadow-sm">
                          <p className="font-semibold text-sm truncate">{s.name}</p>
                          <p className="text-xs font-medium truncate mt-1">{s.project}</p>
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                            Building {s.project} with weekly review checkpoints.
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {assignedStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No Interns currently assigned.</p>
          ) : assignedStudents.map(s => {
            const userId = `${s.name.split(" ")[0]}CC${s.id.slice(-3)}`;
            return (
              <div key={s.id} className="bg-muted/30 rounded-xl p-4 space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {s.avatarUrl && <AvatarImage src={s.avatarUrl} alt={s.name} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {s.name.split(" ").map(n => n[0]).join("").substring(0,2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{userId}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">{s.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground pl-1">
                  <div><span className="font-medium text-foreground">Assigned Manager:</span> {employee.name}</div>
                  <div><span className="font-medium text-foreground">Designation:</span> {s.role}</div>
                  <div><span className="font-medium text-foreground">Assigned Project:</span> {s.project}</div>
                  <div><span className="font-medium text-foreground">Assigned Date:</span> {new Date(s.startDate).toLocaleDateString("en-GB")}</div>
                  <div><span className="font-medium text-foreground">Due Date:</span> {new Date(s.endDate).toLocaleDateString("en-GB")}</div>
                  <div><span className="font-medium text-foreground">Current Status:</span> {s.status}</div>
                  <div className="col-span-2"><span className="font-medium text-foreground">Description:</span> Building {s.project} using modern technology stack.</div>
                </div>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function internIsAvailable(intern: Student) {
  const manager = intern.manager?.trim();
  return intern.status === "Active" && (!manager || manager === "—" || manager === "-");
}

function AssignInternDialog({
  employee,
  interns,
  open,
  selectedInternId,
  assigning,
  error,
  onSelectIntern,
  onAssign,
  onClose,
}: {
  employee: Staff | null;
  interns: Student[];
  open: boolean;
  selectedInternId: string;
  assigning: boolean;
  error: string;
  onSelectIntern: (id: string) => void;
  onAssign: () => void;
  onClose: () => void;
}) {
  if (!employee) return null;
  const availableInterns = interns.filter(intern => internIsAvailable(intern) && !employee.assignedInterns.includes(intern.id));

  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Intern</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="rounded-xl border bg-muted/20 p-4 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Employee</p>
            <p className="mt-1 font-semibold">{employee.name}</p>
            <p className="text-xs text-muted-foreground">{employee.id}</p>
          </div>

          <div className="space-y-2">
            <Label>Select Intern</Label>
            <Select value={selectedInternId} onValueChange={onSelectIntern}>
              <SelectTrigger>
                <SelectValue placeholder={availableInterns.length ? "Select Intern" : "No available interns"} />
              </SelectTrigger>
              <SelectContent>
                {availableInterns.map(intern => (
                  <SelectItem key={intern.id} value={intern.id}>
                    {intern.name} — {intern.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Available Interns</p>
            <div className="mt-3 space-y-2">
              {availableInterns.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active unassigned interns are available.</p>
              ) : availableInterns.map(intern => (
                <button
                  key={intern.id}
                  type="button"
                  onClick={() => onSelectIntern(intern.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    selectedInternId === intern.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <span className="font-medium">{intern.name}</span>
                  <span className="text-xs text-muted-foreground">{intern.id}</span>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={assigning}>Cancel</Button>
          <Button onClick={onAssign} disabled={!selectedInternId || assigning}>
            {assigning ? <><Loader2 size={15} className="mr-2 animate-spin" /> Assigning...</> : "Assign Intern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function StaffManagement() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [staffList, setStaffList] = useState<Staff[]>(initialStaff);
  const [studentList, setStudentList] = useState<Student[]>(initialStudents);
  const [projectCatalog, setProjectCatalog] = useState<Project[]>(initialProjects);
  const [searchTerm, setSearchTerm] = useState("");
  const [designationFilter, setDesignationFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<typeof EMPTY_FORM>>({});
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [assignedDialogEmployee, setAssignedDialogEmployee] = useState<Staff | null>(null);
  const [assignDialogEmployee, setAssignDialogEmployee] = useState<Staff | null>(null);
  const [selectedInternId, setSelectedInternId] = useState("");
  const [assigningIntern, setAssigningIntern] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [projectDialogEmployee, setProjectDialogEmployee] = useState<Staff | null>(null);
  const [projectSelection, setProjectSelection] = useState("");
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectError, setProjectError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createdCredential, setCreatedCredential] = useState<CreatedCredential | null>(null);

  const filteredStaff = staffList.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = designationFilter === "all" || s.role === designationFilter;
    return matchesSearch && matchesDept;
  });

  const loadEmployees = async () => {
    const session = getAuthSession();
    if (!session) return;

    const response = await fetch("/api/employees", {
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
    });
    const payload = await response.json().catch(() => null) as {
      employees?: Staff[];
      error?: string;
    } | null;

    if (!response.ok || !Array.isArray(payload?.employees)) {
      throw new Error(payload?.error ?? "Unable to load employees.");
    }

    setStaffList(payload.employees);
  };

  const loadInterns = async () => {
    const session = getAuthSession();
    if (!session) return;

    const response = await fetch("/api/interns", {
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
    });
    const payload = await response.json().catch(() => null) as {
      interns?: Student[];
      error?: string;
    } | null;

    if (!response.ok || !Array.isArray(payload?.interns)) {
      throw new Error(payload?.error ?? "Unable to load interns.");
    }

    setStudentList(payload.interns);
  };

  const refreshAppData = async () => {
    const payload = await apiJson<Parameters<typeof replaceAppData>[0]>("/app-data");
    replaceAppData(payload);
  };

  useEffect(() => {
    Promise.all([loadEmployees(), loadInterns()]).catch((error) => {
      toast({
        title: "Unable to load employee data",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    });
  }, []);

  const validate = () => {
    const e: Partial<typeof EMPTY_FORM> = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.designation) e.designation = "Designation is required.";
    if (!form.role) e.role = "Role is required.";
    if (!form.temporaryPassword.trim()) e.temporaryPassword = "Temporary password is required.";
    if (form.temporaryPassword.trim() && form.temporaryPassword.trim().length < 8) e.temporaryPassword = "Use at least 8 characters.";
    if (form.phone && !/^\d{10}$/.test(form.phone)) e.phone = "Enter a 10-digit phone number.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAdd = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const session = getAuthSession();

    if (!session) {
      setSubmitting(false);
      toast({ title: "Session expired", description: "Please log in again before adding an employee.", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => null) as {
        employee?: Staff & { userId?: string };
        temporaryPassword?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.employee || !payload.temporaryPassword) {
        throw new Error(payload?.error ?? "Unable to create employee.");
      }

      await loadEmployees();
      setCreatedCredential({
        userId: payload.employee.userId ?? getEmpUserId(payload.employee.name, payload.employee.id),
        temporaryPassword: payload.temporaryPassword,
        name: payload.employee.name,
      });
      setShowAdd(false);
      setForm(EMPTY_FORM);
      setErrors({});
      toast({ title: "Employee Added", description: `${payload.employee.name} has been stored in smart_cp.` });
    } catch (error) {
      toast({
        title: "Unable to add employee",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const s = staffList.find(s => s.id === id);
    const session = getAuthSession();
    if (!session) {
      toast({ title: "Session expired", description: "Please log in again before deleting an employee.", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(`/api/employees/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to delete employee.");
      }

      await loadEmployees();
      setDeleteId(null);
      toast({ title: "Employee Removed", description: `${s?.name ?? "Employee"} has been deleted from smart_cp.`, variant: "destructive" });
    } catch (error) {
      toast({
        title: "Unable to delete employee",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const getEmployeeProjects = (employeeId: string) =>
    projectCatalog.filter(project => project.assignedStaff.includes(employeeId));

  const openAssignDialog = (employee: Staff) => {
    setAssignDialogEmployee(employee);
    setSelectedInternId("");
    setAssignError("");
    loadInterns().catch((error) => {
      setAssignError(error instanceof Error ? error.message : "Unable to load available interns.");
    });
  };

  const closeAssignDialog = () => {
    if (assigningIntern) return;
    setAssignDialogEmployee(null);
    setSelectedInternId("");
    setAssignError("");
  };

  const handleAssignIntern = async () => {
    if (!assignDialogEmployee || !selectedInternId) {
      setAssignError("Select an intern before assigning.");
      return;
    }

    setAssigningIntern(true);
    setAssignError("");
    try {
      await apiJson<{ ok: boolean; employee?: Staff; intern?: Student }>(
        `/employees/${encodeURIComponent(assignDialogEmployee.id)}/assign-intern`,
        {
          method: "POST",
          body: JSON.stringify({ internId: selectedInternId }),
        },
      );

      await Promise.all([loadEmployees(), loadInterns(), refreshAppData()]);
      const intern = studentList.find(item => item.id === selectedInternId);
      toast({
        title: "Intern assigned",
        description: `${intern?.name ?? "Intern"} is now assigned to ${assignDialogEmployee.name}.`,
      });
      setAssignDialogEmployee(null);
      setSelectedInternId("");
    } catch (error) {
      setAssignError(error instanceof Error ? error.message : "Unable to assign intern.");
    } finally {
      setAssigningIntern(false);
    }
  };

  const openProjectDialog = (employee: Staff) => {
    setProjectDialogEmployee(employee);
    setProjectSelection(getEmployeeProjects(employee.id)[0]?.id ?? "");
    setProjectError("");
    setProjectLoading(true);
    apiJson<Parameters<typeof replaceAppData>[0]>("/app-data")
      .then(payload => {
        replaceAppData(payload);
        const projects = payload.projects ?? [];
        setProjectCatalog(projects);
        const currentProject = projects.find(project => project.assignedStaff.includes(employee.id));
        setProjectSelection(currentProject?.id ?? "");
      })
      .catch(error => {
        setProjectCatalog([]);
        setProjectSelection("");
        setProjectError(error instanceof Error ? error.message : "Unable to load projects. Please try again.");
      })
      .finally(() => setProjectLoading(false));
  };

  const saveEmployeeProject = async () => {
    if (!projectDialogEmployee || !projectSelection) {
      toast({ title: "Select a project", description: "Choose a project before saving.", variant: "destructive" });
      return;
    }

    const selectedProject = projectCatalog.find(project => project.id === projectSelection);
    if (!selectedProject) {
      toast({ title: "Project unavailable", description: "Select an available project before saving.", variant: "destructive" });
      return;
    }

    setProjectSaving(true);
    setProjectError("");
    try {
      await apiJson<{ ok: boolean }>(`/employees/${encodeURIComponent(projectDialogEmployee.id)}/project`, {
        method: "POST",
        body: JSON.stringify({ projectId: projectSelection }),
      });
      await Promise.all([loadEmployees(), refreshAppData()]);
      const latest = await apiJson<Parameters<typeof replaceAppData>[0]>("/app-data");
      replaceAppData(latest);
      setProjectCatalog(latest.projects ?? []);
      toast({ title: "Project updated", description: `${projectDialogEmployee.name} is now assigned to ${selectedProject.name}.` });
      setProjectDialogEmployee(null);
      setProjectSelection("");
    } catch (error) {
      setProjectError(error instanceof Error ? error.message : "Unable to save project assignment.");
    } finally {
      setProjectSaving(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    await new Promise(r => setTimeout(r, 500));
    const headers = ["ID", "Name", "Designation", "Interns Assigned", "Status"];
    const rows = filteredStaff.map(s => [
      s.id, s.name, s.designation,
      s.assignedInterns.length.toString(), s.status
    ]);
    downloadCSV(`employees_${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
    setExporting(false);
    toast({ title: "Export Complete", description: "Employee list exported as CSV." });
  };

  const handleExportPDF = async () => {
    setExporting(true);
    await new Promise(r => setTimeout(r, 400));
    const rows = filteredStaff.map(s => `
      <tr>
        <td>${s.id}</td><td>${s.name}</td>
        <td>${s.designation}</td>
        <td>${s.assignedInterns.length}</td><td>${s.status}</td>
      </tr>`).join("");
    openPrintWindow("Employee Management Report", `
      <table>
        <thead><tr>
          <th>ID</th><th>Name</th><th>Designation</th>
          <th>Interns</th><th>Status</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`);
    setExporting(false);
  };

  const f = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2" disabled={exporting}>
                {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={handleExportCSV}>
                <FileSpreadsheet size={15} /> Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={handleExportPDF}>
                <FileText size={15} /> Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button className="gap-2" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Employee
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID..."
            className="pl-9"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <Select value={designationFilter} onValueChange={setDesignationFilter}>
            <SelectTrigger className="w-[180px]">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-muted-foreground" />
                <SelectValue placeholder="Designation" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {ROLES_LIST.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-18rem)] min-h-[360px]">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Interns Assigned</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStaff.length > 0 ? filteredStaff.map(s => (
                <motion.tr
                  key={s.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="font-medium text-muted-foreground">{s.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {s.avatarUrl && <AvatarImage src={s.avatarUrl} alt={s.name} />}
                        <AvatarFallback className="bg-secondary/10 text-secondary font-medium text-xs">
                          {s.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{s.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{getEmpUserId(s.name, s.id)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{s.designation}</TableCell>
                  <TableCell className="text-sm">
                    <button
                      type="button"
                      className="hover:text-primary hover:underline cursor-pointer text-left"
                      onClick={() => openProjectDialog(s)}
                    >
                      {getEmployeeProjects(s.id)[0]?.name ?? "Assign Project"}
                    </button>
                  </TableCell>
                  <TableCell className="text-sm">
                    <button
                      onClick={() => setAssignedDialogEmployee(s)}
                      className="flex items-center gap-1.5 hover:text-primary hover:underline transition-colors cursor-pointer"
                    >
                      <span className="font-semibold text-primary">{s.assignedInterns.length}</span>
                      <span className="text-muted-foreground">assigned</span>
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={s.status === "Active" ? "default" : "secondary"}
                      className={s.status === "Active" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-orange-100 text-orange-700 hover:bg-orange-100"}
                    >
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" asChild>
                        <Link href={`/staff/${s.id}`}><Eye size={16} /></Link>
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => navigate(`/staff/${s.id}`)}>
                            <Eye size={14} /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => openProjectDialog(s)}>
                            <Edit size={14} /> Manage Project
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => openAssignDialog(s)}>
                            <UserPlus size={14} /> Assign
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 cursor-pointer text-orange-600 focus:text-orange-600">
                            <UserX size={14} /> Remove
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive" onClick={() => setDeleteId(s.id)}>
                            <Trash2 size={14} /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </motion.tr>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No employees found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="p-4 border-t flex items-center justify-between text-sm text-muted-foreground">
          <div>Showing {filteredStaff.length} of {staffList.length} entries</div>
        </div>
      </div>

      {/* Assigned Interns Dialog */}
      <AssignedInternsDialog
        employee={assignedDialogEmployee}
        interns={studentList}
        open={!!assignedDialogEmployee}
        onClose={() => setAssignedDialogEmployee(null)}
      />

      <AssignInternDialog
        employee={assignDialogEmployee}
        interns={studentList}
        open={!!assignDialogEmployee}
        selectedInternId={selectedInternId}
        assigning={assigningIntern}
        error={assignError}
        onSelectIntern={setSelectedInternId}
        onAssign={handleAssignIntern}
        onClose={closeAssignDialog}
      />

      <Dialog open={!!projectDialogEmployee} onOpenChange={open => !open && setProjectDialogEmployee(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Employee Project Management</DialogTitle>
          </DialogHeader>
          {projectDialogEmployee && (
            <div className="space-y-5 py-2">
              <div className="grid gap-2 rounded-xl border bg-muted/20 p-4 text-sm">
                <div><span className="text-muted-foreground">Employee:</span> <span className="font-semibold ml-2">{projectDialogEmployee.name}</span></div>
                <div><span className="text-muted-foreground">Designation:</span> <span className="font-semibold ml-2">{projectDialogEmployee.designation}</span></div>
                <div><span className="text-muted-foreground">Current Project:</span> <span className="font-semibold ml-2">{getEmployeeProjects(projectDialogEmployee.id)[0]?.name ?? "Not assigned"}</span></div>
              </div>
              <div className="space-y-2">
                <Label>Assign or Change Project</Label>
                <Select value={projectSelection} onValueChange={setProjectSelection} disabled={projectLoading || projectSaving}>
                  <SelectTrigger><SelectValue placeholder={projectLoading ? "Loading projects..." : "Select project"} /></SelectTrigger>
                  <SelectContent>
                    {projectCatalog.length === 0 ? (
                      <SelectItem value="none" disabled>No projects available.</SelectItem>
                    ) : projectCatalog.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} — {project.id} ({project.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-xl border p-4 space-y-2">
                <p className="text-sm font-semibold">Project View</p>
                {projectSelection ? (
                  (() => {
                    const project = projectCatalog.find(item => item.id === projectSelection);
                    return project ? (
                      <div className="space-y-2 text-sm">
                        <div><span className="text-muted-foreground">Project ID:</span> <span className="font-medium ml-2">{project.id}</span></div>
                        <div><span className="text-muted-foreground">Project Name:</span> <span className="font-medium ml-2">{project.name}</span></div>
                        {project.description && <div><span className="text-muted-foreground">Description:</span> <span className="ml-2">{project.description}</span></div>}
                        {project.status && <div><span className="text-muted-foreground">Status:</span> <span className="font-medium ml-2">{project.status}</span></div>}
                        {project.createdBy && <div><span className="text-muted-foreground">Created By:</span> <span className="ml-2">{project.createdBy}</span></div>}
                        {project.startDate && <div><span className="text-muted-foreground">Start Date:</span> <span className="ml-2">{project.startDate}</span></div>}
                        {project.endDate && <div><span className="text-muted-foreground">End Date:</span> <span className="ml-2">{project.endDate}</span></div>}
                      </div>
                    ) : <p className="text-sm text-destructive">Unable to load project details.</p>;
                  })()
                ) : projectLoading ? (
                  <p className="text-sm text-muted-foreground">Loading projects...</p>
                ) : projectCatalog.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No projects available.</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Select a project to view details.</p>
                )}
                {projectError && <p className="text-sm text-destructive">{projectError}</p>}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectDialogEmployee(null)}>Close</Button>
            <Button onClick={saveEmployeeProject} disabled={projectLoading || projectSaving || !projectSelection}>
              {projectSaving ? <><Loader2 size={15} className="mr-2 animate-spin" /> Saving...</> : "Save Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><X size={18} /> Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently remove the employee record. This action cannot be undone.</p>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdCredential} onOpenChange={open => !open && setCreatedCredential(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Temporary Employee Password</DialogTitle>
          </DialogHeader>
          {createdCredential && (
            <div className="space-y-3 text-sm">
              <p>
                {createdCredential.name} was created successfully. Share this temporary password once and ask the employee to change it after login.
              </p>
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div><span className="text-muted-foreground">User ID:</span> <span className="font-mono font-semibold">{createdCredential.userId}</span></div>
                <div><span className="text-muted-foreground">Temporary Password:</span> <span className="font-mono font-semibold">{createdCredential.temporaryPassword}</span></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCreatedCredential(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Staff Dialog */}
      <Dialog open={showAdd} onOpenChange={open => { setShowAdd(open); if (!open) { setForm(EMPTY_FORM); setErrors({}); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus size={18} /> Add New Employee</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input placeholder="Name" value={form.name} onChange={f("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Designation <span className="text-destructive">*</span></Label>
              <Select value={form.designation} onValueChange={v => setForm(p => ({ ...p, designation: v }))}>
                <SelectTrigger><SelectValue placeholder="Select designation" /></SelectTrigger>
                <SelectContent>{STAFF_DESIGNATIONS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
              {errors.designation && <p className="text-xs text-destructive">{errors.designation}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Role <span className="text-destructive">*</span></Label>
              <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>{ROLES_LIST.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
              {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input placeholder="10 digits" value={form.phone} onChange={f("phone")} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Temporary Password <span className="text-destructive">*</span></Label>
              <Input type="password" placeholder="Minimum 8 characters" value={form.temporaryPassword} onChange={f("temporaryPassword")} />
              {errors.temporaryPassword && <p className="text-xs text-destructive">{errors.temporaryPassword}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as "Active" | "On Leave" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Bio</Label>
              <Textarea placeholder="Brief professional bio…" rows={3} value={form.bio} onChange={f("bio")} />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); setErrors({}); }}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting ? <><Loader2 size={15} className="animate-spin mr-2" /> Saving…</> : "Add Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
