import { useState } from "react";
import { Link } from "wouter";
import {
  Plus, Search, Filter, Eye, Edit, Trash2,
  Download, FileText, FileSpreadsheet, Loader2, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { students as initialStudents } from "@/data/mockData";
import { motion } from "framer-motion";

type Student = typeof initialStudents[0];
type StudentStatus = "Active" | "Completed" | "Pending";

const ROLES = ["Intern", "Trainee", "Employee", "HR", "Manager", "Admin", "Mentor", "Project Lead", "Coordinator"];
const MENTORS = ["Dr. Smith", "Prof. Davis", "Sarah Lee", "Raj Mehta"];
const STATUSES: StudentStatus[] = ["Active", "Pending", "Completed"];

const EMPTY_FORM = {
  name: "", email: "", phone: "", college: "",
  role: "", project: "", mentor: "",
  startDate: "", endDate: "", cgpa: "", degree: "B.Tech",
  year: "", gender: "", dob: "", address: "", status: "Active" as StudentStatus,
};

function getUserId(name: string, id: string): string {
  const firstName = name.split(" ")[0];
  const num = id.slice(-3);
  return `${firstName}CC${num}`;
}

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [
    headers.join(","),
    ...rows.map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function openPrintWindow(title: string, html: string) {
  const win = window.open("", "_blank", "width=1000,height=700");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
    body{font-family:Arial,sans-serif;padding:24px;color:#111}
    h1{font-size:18px;margin-bottom:4px}
    .sub{font-size:11px;color:#666;margin-bottom:16px}
    table{border-collapse:collapse;width:100%;font-size:12px}
    th,td{border:1px solid #ddd;padding:7px 10px;text-align:left}
    th{background:#f5f5f5;font-weight:600}
    tr:nth-child(even){background:#fafafa}
  </style></head><body>
  <h1>${title}</h1>
  <div class="sub">Exported on ${new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}</div>
  ${html}
  </body></html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 400);
}

export default function StudentManagement() {
  const { toast } = useToast();
  const [studentList, setStudentList] = useState<Student[]>(initialStudents);
  const [searchTerm, setSearchTerm] = useState("");
  const [designationFilter, setDesignationFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<typeof EMPTY_FORM>>({});
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);

  const filteredStudents = studentList.filter(s => {
    const userId = getUserId(s.name, s.id);
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          userId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = designationFilter === "all" || s.role === designationFilter;
    return matchesSearch && matchesDept;
  });

  const validate = () => {
    const e: Partial<typeof EMPTY_FORM> = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.role) e.role = "Designation is required.";
    if (!form.project.trim()) e.project = "Project is required.";
    if (!form.startDate) e.startDate = "Start date is required.";
    if (!form.endDate) e.endDate = "End date is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAdd = async () => {
    if (!validate()) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    const newId = `INT${String(studentList.length + 1).padStart(3, "0")}`;
    const newStudent: Student = {
      id: newId,
      name: form.name.trim(),
      email: form.email.trim() || `${form.name.toLowerCase().replace(/\s/g, ".")}@corecode.global`,
      phone: form.phone || "—",
      college: form.college || "—",
      department: form.role,
      project: form.project.trim(),
      mentor: form.mentor || "—",
      startDate: form.startDate,
      endDate: form.endDate,
      progress: 0,
      status: form.status,
      cgpa: parseFloat(form.cgpa) || 0,
      dob: form.dob || "",
      gender: form.gender || "",
      address: form.address || "",
      degree: form.degree || "B.Tech",
      year: form.year || "",
      skills: [],
    };
    setStudentList(prev => [newStudent, ...prev]);
    setSubmitting(false);
    setShowAdd(false);
    setForm(EMPTY_FORM);
    setErrors({});
    toast({ title: "Intern Added", description: `${newStudent.name} has been successfully added.` });
  };

  const handleDelete = (id: string) => {
    const s = studentList.find(s => s.id === id);
    setStudentList(prev => prev.filter(s => s.id !== id));
    setDeleteId(null);
    toast({ title: "Intern Removed", description: `${s?.name ?? "Intern"} record has been deleted.`, variant: "destructive" });
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
    const headers = ["ID", "User ID", "Name", "Designation", "Project", "College", "Mentor", "Start Date", "End Date", "Progress", "Status", "CGPA"];
    const rows = filteredStudents.map(s => [
      s.id, getUserId(s.name, s.id), s.name, s.role, s.project, s.college,
      s.mentor, s.startDate, s.endDate, s.progress.toString(), s.status, s.cgpa.toString()
    ]);
    downloadCSV(`interns_${new Date().toISOString().slice(0,10)}.csv`, headers, rows);
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
    openPrintWindow("Intern Management Report", `
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
          <h1 className="text-3xl font-bold tracking-tight">Intern Management</h1>
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
            placeholder="Search by name or User ID..."
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
                    <Link href={`/projects`} className="hover:text-primary hover:underline cursor-pointer">
                      {student.project}
                    </Link>
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
                        onClick={() => setEditStudent(student)}
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
                    No interns found matching your criteria.
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
              <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, department: v }))}>
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
              <Input placeholder="555-0101" value={form.phone} onChange={f("phone")} />
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
              <Label>College / University</Label>
              <Input placeholder="e.g. MIT" value={form.college} onChange={f("college")} />
            </div>
            <div className="space-y-1.5">
              <Label>Mentor</Label>
              <Select value={form.mentor} onValueChange={v => setForm(p => ({ ...p, mentor: v }))}>
                <SelectTrigger><SelectValue placeholder="Assign mentor" /></SelectTrigger>
                <SelectContent>{MENTORS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as StudentStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>CGPA</Label>
              <Input type="number" step="0.1" min="0" max="4" placeholder="3.8" value={form.cgpa} onChange={f("cgpa")} />
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
      <Dialog open={!!editStudent} onOpenChange={open => !open && setEditStudent(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Intern</DialogTitle>
          </DialogHeader>
          {editStudent && (
            <div className="space-y-3 py-2 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <span className="ml-2 font-semibold">{editStudent.name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">User ID:</span>
                <span className="ml-2 font-mono font-semibold">{getUserId(editStudent.name, editStudent.id)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Designation:</span>
                <span className="ml-2">{editStudent.role}</span>
              </div>
              <p className="text-xs text-muted-foreground pt-2">Full edit form coming soon.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStudent(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><X size={18} /> Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently remove the intern record. This action cannot be undone.</p>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
