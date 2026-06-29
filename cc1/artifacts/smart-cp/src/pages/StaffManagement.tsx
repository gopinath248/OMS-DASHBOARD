import { useState } from "react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { staff as initialStaff, students } from "@/data/mockData";
import { motion } from "framer-motion";

type Staff = typeof initialStaff[0];

const ROLES_LIST = ["Intern", "Trainee", "Employee", "HR", "Manager", "Admin", "Mentor", "Project Lead", "Coordinator"];
const STAFF_DESIGNATIONS = [
  "Senior Engineer", "Lead Data Scientist", "Product Manager", "DevOps Lead",
  "ML Research Engineer", "Full Stack Engineer", "HR Coordinator", "Hardware Engineer",
  "Power Systems Expert", "Security Engineer", "Junior Engineer",
];
const STATUSES = ["Active", "On Leave"] as const;

const EMPTY_FORM = {
  name: "", email: "", phone: "", designation: "",
  role: "", bio: "", status: "Active" as "Active" | "On Leave",
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

function AssignedInternsDialog({ employee, open, onClose }: { employee: Staff | null; open: boolean; onClose: () => void }) {
  if (!employee) return null;
  const assignedStudents = students.filter(s => employee.assignedInterns.includes(s.id));
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assigned Interns — {employee.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {assignedStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No interns currently assigned.</p>
          ) : assignedStudents.map(s => {
            const userId = `${s.name.split(" ")[0]}CC${s.id.slice(-3)}`;
            return (
              <div key={s.id} className="bg-muted/30 rounded-xl p-4 space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
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
                  <div><span className="font-medium text-foreground">Assigned Mentor:</span> {employee.name}</div>
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

export default function StaffManagement() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [staffList, setStaffList] = useState<Staff[]>(initialStaff);
  const [searchTerm, setSearchTerm] = useState("");
  const [designationFilter, setDesignationFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<typeof EMPTY_FORM>>({});
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [assignedDialogEmployee, setAssignedDialogEmployee] = useState<Staff | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredStaff = staffList.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = designationFilter === "all" || s.role === designationFilter;
    return matchesSearch && matchesDept;
  });

  const validate = () => {
    const e: Partial<typeof EMPTY_FORM> = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.designation) e.designation = "Designation is required.";
    if (!form.role) e.role = "Role is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAdd = async () => {
    if (!validate()) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    const newStaff: Staff = {
      id: `EMP${String(staffList.length + 1).padStart(3, "0")}`,
      name: form.name.trim(),
      email: form.email.trim() || `${form.name.toLowerCase().replace(/\s/g, ".")}@corecode.global`,
      phone: form.phone || "—",
      designation: form.designation,
      role: form.role,
      bio: form.bio.trim() || "—",
      status: form.status,
      assignedInterns: [],
    };
    setStaffList(prev => [newStaff, ...prev]);
    setSubmitting(false);
    setShowAdd(false);
    setForm(EMPTY_FORM);
    setErrors({});
    toast({ title: "Employee Added", description: `${newStaff.name} has been successfully added.` });
  };

  const handleDelete = (id: string) => {
    const s = staffList.find(s => s.id === id);
    setStaffList(prev => prev.filter(s => s.id !== id));
    setDeleteId(null);
    toast({ title: "Employee Removed", description: `${s?.name} has been deleted.`, variant: "destructive" });
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
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Designation</TableHead>
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
                          <DropdownMenuItem className="gap-2 cursor-pointer">
                            <Edit size={14} /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setAssignedDialogEmployee(s)}>
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
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
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
        open={!!assignedDialogEmployee}
        onClose={() => setAssignedDialogEmployee(null)}
      />

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

      {/* Add Staff Dialog */}
      <Dialog open={showAdd} onOpenChange={open => { setShowAdd(open); if (!open) { setForm(EMPTY_FORM); setErrors({}); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus size={18} /> Add New Employee</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Dr. Smith" value={form.name} onChange={f("name")} />
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
              <Input placeholder="555-0201" value={form.phone} onChange={f("phone")} />
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
