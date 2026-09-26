import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Plus, Search, Filter, Eye, Edit, Trash2,
  Download, FileText, FileSpreadsheet, Loader2, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { students as initialStudents, staff as initialStaff, projects as initialProjects, type Project } from "@/data/mockData";
import { getAuthSession } from "@/lib/auth";
import { motion } from "framer-motion";

type Student = typeof initialStudents[0];
type Staff = typeof initialStaff[0];
type StudentStatus = "Active" | "Completed" | "Pending";
type CreatedCredential = { userId: string; temporaryPassword: string; name: string };

const ROLES = ["INTERN"];
const STATUSES: StudentStatus[] = ["Active", "Pending", "Completed"];

const EMPTY_FORM = {
  name: "", email: "", phone: "", college: "",
  role: "", project: "", manager: "",
  startDate: "", endDate: "", cgpa: "", degree: "B.Tech",
  year: "", gender: "", dob: "", address: "", salary: "", temporaryPassword: "", status: "Active" as StudentStatus,
};

function getUserId(name: string, id: string): string {
  const firstName = name.split(" ")[0];
  const num = id.slice(-3);
  return `${firstName}CC${num}`;
}

function studentToForm(student: Student) {
  return {
    name: student.name,
    email: student.email,
    phone: student.phone,
    college: student.college,
    role: student.role,
    project: student.project,
    manager: student.manager,
    startDate: student.startDate,
    endDate: student.endDate,
    cgpa: String(student.cgpa ?? ""),
    degree: student.degree,
    year: student.year,
    gender: student.gender,
    dob: student.dob,
    address: student.address,
    salary: String(student.salary ?? 0),
    temporaryPassword: "",
    status: student.status as StudentStatus,
  };
}

function fallback(value: string | number | undefined | null) {
  return value === undefined || value === null || value === "" ? "Not available" : String(value);
}

function projectAssignees(project: Project, students: Student[], staff: Staff[]) {
  const interns = students.filter(student =>
    project.assignedInterns.includes(student.id) || student.project.toLowerCase() === project.name.toLowerCase()
  );
  const employees = staff.filter(employee => project.assignedStaff.includes(employee.id));
  return { interns, employees };
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

export default function StudentManagement() {
  const { toast } = useToast();
  const [studentList, setStudentList] = useState<Student[]>(initialStudents);
  const [projectCatalog, setProjectCatalog] = useState<Project[]>(initialProjects);
  const [searchTerm, setSearchTerm] = useState("");
  const [designationFilter, setDesignationFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<typeof EMPTY_FORM>>({});
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editErrors, setEditErrors] = useState<Partial<typeof EMPTY_FORM>>({});
  const [projectDialogStudent, setProjectDialogStudent] = useState<Student | null>(null);
  const [projectSelection, setProjectSelection] = useState("");
  const [createdCredential, setCreatedCredential] = useState<CreatedCredential | null>(null);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredStudents = studentList.filter(s => {
    const userId = getUserId(s.name, s.id);
    const assignedProject = projectCatalog.find(project => project.name.toLowerCase() === s.project.toLowerCase());
    const managerName = assignedProject?.createdBy ?? s.manager;
    const matchesSearch = normalizedSearch === "" ||
                          s.name.toLowerCase().includes(normalizedSearch) ||
                          s.id.toLowerCase().includes(normalizedSearch) ||
                          userId.toLowerCase().includes(normalizedSearch) ||
                          s.role.toLowerCase().includes(normalizedSearch) ||
                          s.status.toLowerCase().includes(normalizedSearch) ||
                          s.project.toLowerCase().includes(normalizedSearch) ||
                          s.manager.toLowerCase().includes(normalizedSearch) ||
                          managerName.toLowerCase().includes(normalizedSearch) ||
                          assignedProject?.description.toLowerCase().includes(normalizedSearch) ||
                          assignedProject?.status.toLowerCase().includes(normalizedSearch) ||
                          assignedProject?.category.toLowerCase().includes(normalizedSearch);
    const matchesDept = designationFilter === "all"
      || s.role.trim().toLowerCase() === designationFilter.trim().toLowerCase();
    return matchesSearch && matchesDept;
  });

  const matchingProjects = normalizedSearch === "" ? [] : projectCatalog.filter(project => {
    const { interns, employees } = projectAssignees(project, studentList, initialStaff);
    const haystack = [
      project.name,
      project.description,
      project.category,
      project.status,
      project.startDate,
      project.endDate,
      project.createdBy,
      ...interns.flatMap(intern => [intern.name, intern.role, intern.status, intern.project, intern.manager]),
      ...employees.flatMap(employee => [employee.name, employee.designation, employee.role, employee.status, employee.bio]),
    ].filter(Boolean).join(" ").toLowerCase();

    return haystack.includes(normalizedSearch);
  });

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

  useEffect(() => {
    loadInterns().catch((error) => {
      toast({
        title: "Unable to load interns",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    });
  }, []);

  const validate = () => {
    const e: Partial<typeof EMPTY_FORM> = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.role) e.role = "Designation is required.";
    if (!form.project.trim()) e.project = "Project is required.";
    if (form.salary === "" || Number.isNaN(Number(form.salary)) || Number(form.salary) < 0) e.salary = "Salary is required and must be non-negative.";
    if (!form.startDate) e.startDate = "Start date is required.";
    if (!form.endDate) e.endDate = "End date is required.";
    if (!form.temporaryPassword.trim()) e.temporaryPassword = "Temporary password is required.";
    if (form.temporaryPassword.trim() && form.temporaryPassword.trim().length < 8) e.temporaryPassword = "Use at least 8 characters.";
    if (form.phone && !/^\d{10}$/.test(form.phone)) e.phone = "Please enter a valid 10-digit phone number.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAdd = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const session = getAuthSession();

    if (!session) {
      setSubmitting(false);
      toast({ title: "Session expired", description: "Please log in again before adding an intern.", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch("/api/interns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ ...form, salary: Number(form.salary) }),
      });
      const payload = await response.json().catch(() => null) as {
        intern?: Student & { userId?: string };
        temporaryPassword?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.intern || !payload.temporaryPassword) {
        throw new Error(payload?.error ?? "Unable to create intern.");
      }

      await loadInterns();
      setCreatedCredential({
        userId: payload.intern.userId ?? getUserId(payload.intern.name, payload.intern.id),
        temporaryPassword: payload.temporaryPassword,
        name: payload.intern.name,
      });
      setShowAdd(false);
      setForm(EMPTY_FORM);
      setErrors({});
      toast({ title: "Intern Added", description: `${payload.intern.name} has been stored in smart_cp.` });
    } catch (error) {
      toast({
        title: "Unable to add intern",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const s = studentList.find(s => s.id === id);
    const session = getAuthSession();
    if (!session) {
      toast({ title: "Session expired", description: "Please log in again before deleting an intern.", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(`/api/interns/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to delete intern.");
      }

      await loadInterns();
      setDeleteId(null);
      toast({ title: "Intern Removed", description: `${s?.name ?? "Intern"} record has been deleted from smart_cp.`, variant: "destructive" });
    } catch (error) {
      toast({
        title: "Unable to delete intern",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (student: Student) => {
    setEditStudent(student);
    setEditForm(studentToForm(student));
    setEditErrors({});
  };

  const closeEditDialog = () => {
    setEditStudent(null);
    setEditForm(EMPTY_FORM);
    setEditErrors({});
  };

  const validateEdit = () => {
    const e: Partial<typeof EMPTY_FORM> = {};
    if (!editForm.name.trim()) e.name = "Name is required.";
    if (!editForm.role) e.role = "Designation is required.";
    if (!editForm.project.trim()) e.project = "Project is required.";
    if (!editForm.startDate) e.startDate = "Start date is required.";
    if (!editForm.endDate) e.endDate = "End date is required.";
    if (editForm.phone && !/^\d{10}$/.test(editForm.phone)) e.phone = "Please enter a valid 10-digit phone number.";
    setEditErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveEdit = async () => {
    if (!editStudent || !validateEdit()) return;

    const session = getAuthSession();
    if (!session) {
      toast({ title: "Session expired", description: "Please log in again before updating an intern.", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(`/api/interns/${encodeURIComponent(editStudent.id)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          role: editForm.role,
          project: editForm.project,
          manager: editForm.manager,
          startDate: editForm.startDate,
          endDate: editForm.endDate,
          gender: editForm.gender,
          dob: editForm.dob,
          address: editForm.address,
          status: editForm.status,
        }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to update intern.");
      }

      await loadInterns();
      toast({ title: "Intern Updated", description: `${editForm.name.trim()} details have been saved.` });
      closeEditDialog();
    } catch (error) {
      toast({
        title: "Unable to update intern",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const openProjectDialog = (student: Student) => {
    setProjectDialogStudent(student);
    const matchedProject = projectCatalog.find(project => project.name === student.project);
    setProjectSelection(matchedProject?.id ?? "");
  };

  const saveProjectAssignment = () => {
    if (!projectDialogStudent) return;

    const selectedProject = projectCatalog.find(project => project.id === projectSelection);
    if (!selectedProject) {
      toast({ title: "Select a project", description: "Choose a project before saving.", variant: "destructive" });
      return;
    }

    setStudentList(prev => prev.map(student =>
      student.id === projectDialogStudent.id ? { ...student, project: selectedProject.name } : student
    ));

    setProjectCatalog(prev => prev.map(project => {
      const withoutStudent = project.assignedInterns.filter(id => id !== projectDialogStudent.id);
      return project.id === selectedProject.id
        ? { ...project, assignedInterns: [...withoutStudent, projectDialogStudent.id] }
        : { ...project, assignedInterns: withoutStudent };
    }));

    toast({ title: "Project updated", description: `${projectDialogStudent.name} is now assigned to ${selectedProject.name}.` });
    setProjectDialogStudent(null);
    setProjectSelection("");
  };

  const toggleActive = (id: string) => {
    setStudentList(prev => prev.map(s => {
      if (s.id !== id) return s;
      const next = s.status === "Active" ? "Pending" : "Active";
      return { ...s, status: next };
    }));
  };

  const handleExportCSV = async () => {
    setExporting(true);
    await new Promise(r => setTimeout(r, 500));
    const headers = ["ID", "User ID", "Name", "Designation", "Project", "Start Date", "End Date", "Progress", "Status"];
    const rows = filteredStudents.map(s => [
      s.id, getUserId(s.name, s.id), s.name, s.role, s.project,
      s.startDate, s.endDate, s.progress.toString(), s.status
    ]);
    downloadCSV(`Interns_${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
    setExporting(false);
    toast({ title: "Export Complete", description: "Intern list exported as CSV." });
  };

  const handleExportPDF = async () => {
    setExporting(true);
    await new Promise(r => setTimeout(r, 400));
    const rows = filteredStudents.map(s => `
      <tr>
        <td>${s.id}</td><td>${getUserId(s.name, s.id)}</td><td>${s.name}</td><td>${s.role}</td>
        <td>${s.project}</td><td>${s.startDate}</td><td>${s.endDate}</td>
        <td>${s.progress}%</td><td>${s.status}</td>
      </tr>`).join("");
    openPrintWindow("Resource Management Report", `
      <table>
        <thead><tr>
          <th>ID</th><th>User ID</th><th>Name</th><th>Designation</th>
          <th>Project</th><th>Start</th><th>End</th><th>Progress</th><th>Status</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`);
    setExporting(false);
  };

  const f = (key: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resource Management</h1>
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
            <Plus size={16} /> Add Intern
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search project, intern, employee, designation, status..."
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
              {ROLES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {normalizedSearch !== "" && (
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Matching Project Details</h2>
            <Badge variant="outline">{matchingProjects.length} found</Badge>
          </div>

          {matchingProjects.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {matchingProjects.map(project => {
                const { interns, employees } = projectAssignees(project, studentList, initialStaff);
                const assignedNames = [
                  ...interns.map(intern => `${intern.name} (${intern.role})`),
                  ...employees.map(employee => `${employee.name} (${employee.designation})`),
                ];
                const primaryPerson: Student | Staff | undefined = interns[0] ?? employees[0];
                const designation: string | undefined = primaryPerson && "designation" in primaryPerson
                  ? String(primaryPerson.designation)
                  : primaryPerson?.role;

                return (
                  <div key={project.id} className="rounded-lg border bg-muted/20 p-4 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-base font-semibold">{project.name}</p>
                        <p className="text-xs text-muted-foreground">{fallback(project.category)}</p>
                      </div>
                      <Badge variant="outline">{fallback(project.status)}</Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Assigned Name:</span> <span className="font-medium ml-1">{fallback(primaryPerson?.name)}</span></div>
                      <div><span className="text-muted-foreground">Designation:</span> <span className="font-medium ml-1">{fallback(designation)}</span></div>
                      <div><span className="text-muted-foreground">Start Date:</span> <span className="font-medium ml-1">{fallback(project.startDate)}</span></div>
                      <div><span className="text-muted-foreground">Deadline:</span> <span className="font-medium ml-1">{fallback(project.endDate)}</span></div>
                      <div><span className="text-muted-foreground">Manager:</span> <span className="font-medium ml-1">{fallback(project.createdBy)}</span></div>
                      <div><span className="text-muted-foreground">Team:</span> <span className="font-medium ml-1">{assignedNames.length ? assignedNames.join(", ") : "Not assigned"}</span></div>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {fallback(project.description)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              No matching project found.
            </div>
          )}
        </div>
      )}

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Intern</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length > 0 ? filteredStudents.map(student => (
                <motion.tr
                  key={student.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="font-medium text-muted-foreground">{student.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {student.avatarUrl && <AvatarImage src={student.avatarUrl} alt={student.name} />}
                        <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                          {student.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-medium text-sm">{student.name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded-full">
                      {getUserId(student.name, student.id)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-secondary/5 font-normal">{student.role}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <button
                      type="button"
                      className="hover:text-primary hover:underline cursor-pointer text-left"
                      onClick={() => openProjectDialog(student)}
                    >
                      {student.project}
                    </button>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(student.startDate).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })} –{" "}
                    {new Date(student.endDate).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleActive(student.id)}
                      className={`text-xs font-semibold px-3 py-1 rounded-full border transition-all cursor-pointer ${
                        student.status === "Active"
                          ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
                          : student.status === "Completed"
                          ? "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"
                          : "bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100"
                      }`}
                    >
                      {student.status}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" asChild>
                        <Link href={`/students/${student.id}`}><Eye size={16} /></Link>
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                        onClick={() => openEditDialog(student)}
                      >
                        <Edit size={16} />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(student.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              )) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    No Interns found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="p-4 border-t flex items-center justify-between text-sm text-muted-foreground">
          <div>Showing {filteredStudents.length} of {studentList.length} entries</div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">1</Button>
            <Button variant="outline" size="sm" disabled>Next</Button>
          </div>
        </div>
      </div>

      {/* Add Intern Dialog */}
      <Dialog open={showAdd} onOpenChange={open => { setShowAdd(open); if (!open) { setForm(EMPTY_FORM); setErrors({}); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus size={18} /> Add New Intern</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Alice Johnson" value={form.name} onChange={f("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Role <span className="text-destructive">*</span></Label>
              <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>{ROLES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
              {errors.role && <p className="text-xs text-destructive">{errors.role}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Project <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. AI Chatbot Platform" value={form.project} onChange={f("project")} />
              {errors.project && <p className="text-xs text-destructive">{errors.project}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input placeholder="9876543210" value={form.phone} onChange={f("phone")} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Salary <span className="text-destructive">*</span></Label>
              <Input type="number" min="0" step="1000" placeholder="e.g. 35000" value={form.salary} onChange={f("salary")} />
              {errors.salary && <p className="text-xs text-destructive">{errors.salary}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Start Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.startDate} onChange={f("startDate")} />
              {errors.startDate && <p className="text-xs text-destructive">{errors.startDate}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>End Date <span className="text-destructive">*</span></Label>
              <Input type="date" value={form.endDate} onChange={f("endDate")} />
              {errors.endDate && <p className="text-xs text-destructive">{errors.endDate}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as StudentStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Temporary Password <span className="text-destructive">*</span></Label>
              <Input type="password" placeholder="Minimum 8 characters" value={form.temporaryPassword} onChange={f("temporaryPassword")} />
              {errors.temporaryPassword && <p className="text-xs text-destructive">{errors.temporaryPassword}</p>}
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); setErrors({}); }}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting ? <><Loader2 size={15} className="animate-spin mr-2" /> Saving…</> : "Add Intern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Intern Dialog */}
      <Dialog open={!!editStudent} onOpenChange={open => !open && closeEditDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Intern</DialogTitle>
          </DialogHeader>
          {editStudent && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <span className="text-muted-foreground">User ID:</span>
                <span className="ml-2 font-mono font-semibold">{getUserId(editForm.name || editStudent.name, editStudent.id)}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Full Name <span className="text-destructive">*</span></Label>
                  <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
                  {editErrors.name && <p className="text-xs text-destructive">{editErrors.name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Role <span className="text-destructive">*</span></Label>
                  <Select value={editForm.role} onValueChange={v => setEditForm(p => ({ ...p, role: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>{ROLES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                  {editErrors.role && <p className="text-xs text-destructive">{editErrors.role}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Project <span className="text-destructive">*</span></Label>
                  <Input value={editForm.project} onChange={e => setEditForm(p => ({ ...p, project: e.target.value }))} />
                  {editErrors.project && <p className="text-xs text-destructive">{editErrors.project}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} />
                  {editErrors.phone && <p className="text-xs text-destructive">{editErrors.phone}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Start Date <span className="text-destructive">*</span></Label>
                  <Input type="date" value={editForm.startDate} onChange={e => setEditForm(p => ({ ...p, startDate: e.target.value }))} />
                  {editErrors.startDate && <p className="text-xs text-destructive">{editErrors.startDate}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>End Date <span className="text-destructive">*</span></Label>
                  <Input type="date" value={editForm.endDate} onChange={e => setEditForm(p => ({ ...p, endDate: e.target.value }))} />
                  {editErrors.endDate && <p className="text-xs text-destructive">{editErrors.endDate}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={v => setEditForm(p => ({ ...p, status: v as StudentStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>DOB</Label>
                  <Input type="date" value={editForm.dob} onChange={e => setEditForm(p => ({ ...p, dob: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Input value={editForm.gender} onChange={e => setEditForm(p => ({ ...p, gender: e.target.value }))} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Address</Label>
                  <Input value={editForm.address} onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!projectDialogStudent} onOpenChange={open => !open && setProjectDialogStudent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Project Management</DialogTitle>
          </DialogHeader>
          {projectDialogStudent && (
            <div className="space-y-5 py-2">
              <div className="grid gap-2 rounded-xl border bg-muted/20 p-4 text-sm">
                <div><span className="text-muted-foreground">Intern:</span> <span className="font-semibold ml-2">{projectDialogStudent.name}</span></div>
                <div><span className="text-muted-foreground">Current Project:</span> <span className="font-semibold ml-2">{projectDialogStudent.project}</span></div>
                <div><span className="text-muted-foreground">Current Status:</span> <span className="font-semibold ml-2">{projectDialogStudent.status}</span></div>
              </div>
              <div className="space-y-2">
                <Label>Assign or Change Project</Label>
                <Select value={projectSelection} onValueChange={setProjectSelection}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>
                    {projectCatalog.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
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
                        <div><span className="text-muted-foreground">Title:</span> <span className="font-medium ml-2">{project.name}</span></div>
                        <div><span className="text-muted-foreground">Description:</span> <span className="ml-2">{project.description}</span></div>
                        <div><span className="text-muted-foreground">Status:</span> <span className="font-medium ml-2">{project.status}</span></div>
                      </div>
                    ) : null;
                  })()
                ) : (
                  <p className="text-sm text-muted-foreground">Select a project to view details.</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectDialogStudent(null)}>Close</Button>
            <Button onClick={saveProjectAssignment}>Save Project</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdCredential} onOpenChange={open => !open && setCreatedCredential(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Temporary Intern Password</DialogTitle>
          </DialogHeader>
          {createdCredential && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                {createdCredential.name} was created successfully. Share this temporary password once and ask the intern to change it after login.
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

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><X size={18} /> Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently remove the Intern record. This action cannot be undone.</p>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
