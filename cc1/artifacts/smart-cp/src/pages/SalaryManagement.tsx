import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  IndianRupee,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getAuthSession } from "@/lib/auth";
import { motion } from "framer-motion";

type SalaryRecord = {
  id: string;
  source: string;
  userId: string | null;
  name: string;
  email: string;
  avatarUrl?: string | null;
  department: string;
  designation: string;
  role: string;
  status: string;
  monthlySalary: number;
  grossSalary: number;
  netSalary: number;
  leaveDeduction: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  assignment: { exists: boolean; id?: number; assignedAt?: string; netSalary?: number };
};

type SalaryCalculation = {
  employee: SalaryRecord;
  month: string;
  monthLabel: string;
  payMonth: string;
  salary: {
    monthlySalary: number;
    hra: number;
    travel: number;
    medical: number;
    bonus: number;
    grossSalary: number;
    dailyRate: number;
    providentFund: number;
    professionalTax: number;
    leaveDeduction: number;
    totalDeductions: number;
    netSalary: number;
  };
  attendance: {
    source: string;
    calendarDays: number;
    weeklyOffs: number;
    companyHolidays: number;
    workingDays: number;
    presentDays: number;
    absentDays: number;
    holidayDates: string[];
    weeklyOffDates: string[];
  };
  leave: {
    summary: Array<{ type: string; days: number; paid: boolean }>;
    totalLeaveDays: number;
    paidLeaveDays: number;
    unpaidLeaveDays: number;
    duplicateHandling: string;
    unknownLeavePaid: boolean;
  };
  assignment: { exists: boolean; id?: number; assignedAt?: string; netSalary?: number };
};

type DashboardResponse = {
  month: string;
  records: SalaryRecord[];
  summary: {
    employeeCount: number;
    totalMonthlySalary: number;
    avgMonthlySalary: number;
    assignedCount: number;
    pendingCount: number;
  };
};

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  const session = getAuthSession();
  if (session) headers.set("Authorization", `Bearer ${session.token}`);

  const response = await fetch(path, {
    ...init,
    headers,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error ?? "Request failed") as Error & { status?: number; data?: unknown };
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data as T;
}

function inr(amount: number): string {
  return "\u20b9" + new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function csvEscape(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadTextFile(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const blobParts = type.toLowerCase().includes("text/csv") ? ["\uFEFF", content] : [content];
  const blob = new Blob(blobParts, { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function defaultLeaveRows(calculation: SalaryCalculation | null) {
  const known = ["Sick Leave", "Personal Leave", "Emergency Leave", "Casual Leave"];
  const rows = new Map(known.map((type) => [type, { type, days: 0, paid: false }]));
  for (const item of calculation?.leave.summary ?? []) rows.set(item.type, item);
  const otherDays = [...rows.values()]
    .filter((item) => !known.includes(item.type))
    .reduce((sum, item) => sum + item.days, 0);
  return [
    ...known.map((type) => rows.get(type)!),
    { type: "Other Leave", days: otherDays, paid: calculation?.leave.unknownLeavePaid ?? false },
  ];
}

function Row({ label, value, strong }: { label: string; value: string | number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-bold tabular-nums" : "font-medium tabular-nums"}>{value}</span>
    </div>
  );
}

function SalaryCalculationDialog({
  open,
  records,
  month,
  initialEmployeeId,
  onClose,
  onAssigned,
}: {
  open: boolean;
  records: SalaryRecord[];
  month: string;
  initialEmployeeId: string;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const { toast } = useToast();
  const [employeeId, setEmployeeId] = useState(initialEmployeeId);
  const [calculation, setCalculation] = useState<SalaryCalculation | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [existingSalary, setExistingSalary] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmployeeId(initialEmployeeId || records[0]?.id || "");
    setCalculation(null);
    setExistingSalary(false);
  }, [initialEmployeeId, open, records]);

  const selected = records.find((record) => record.id === employeeId);

  const calculate = async () => {
    if (!employeeId) return;
    setLoading(true);
    setExistingSalary(false);
    try {
      const result = await apiJson<SalaryCalculation>(`/api/salary/calculation/${encodeURIComponent(employeeId)}?month=${month}`);
      setCalculation(result);
      setExistingSalary(Boolean(result.assignment.exists));
    } catch (error) {
      toast({ title: "Salary calculation failed", description: error instanceof Error ? error.message : "Unable to calculate salary.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const assign = async (updateExisting = false) => {
    if (!employeeId) return;
    setAssigning(true);
    try {
      const result = await apiJson<{ calculation: SalaryCalculation }>("/api/salary/assign", {
        method: "POST",
        body: JSON.stringify({ employeeId, month, updateExisting }),
      });
      setCalculation(result.calculation);
      setExistingSalary(false);
      onAssigned();
      toast({ title: updateExisting ? "Salary Updated" : "Salary Assigned", description: "The salary record was saved in smart_cp." });
    } catch (error) {
      const maybe = error as Error & { status?: number; data?: { calculation?: SalaryCalculation } };
      if (maybe.status === 409) {
        setExistingSalary(true);
        if (maybe.data?.calculation) setCalculation(maybe.data.calculation);
        toast({ title: "Existing Salary Found", description: "Review the calculation and choose Update if you want to replace the existing monthly record." });
      } else {
        toast({ title: "Salary assignment failed", description: error instanceof Error ? error.message : "Unable to assign salary.", variant: "destructive" });
      }
    } finally {
      setAssigning(false);
    }
  };

  const leaveRows = defaultLeaveRows(calculation);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator size={18} className="text-primary" /> Salary Calculation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
            <Select value={employeeId} onValueChange={(value) => { setEmployeeId(value); setCalculation(null); setExistingSalary(false); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {records.map((record) => (
                  <SelectItem key={record.id} value={record.id}>
                    {record.name} - {record.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={calculate} disabled={!employeeId || loading} className="gap-2">
              <Calculator size={15} /> {loading ? "Calculating..." : "Calculate"}
            </Button>
          </div>

          {selected && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 rounded-md border bg-muted/20 p-4 text-sm">
              <div><span className="text-muted-foreground block">Employee</span><span className="font-semibold">{selected.name}</span></div>
              <div><span className="text-muted-foreground block">Employee ID</span><span className="font-mono font-semibold">{selected.id}</span></div>
              <div><span className="text-muted-foreground block">Department</span><span className="font-semibold">{selected.department}</span></div>
              <div><span className="text-muted-foreground block">Designation</span><span className="font-semibold">{selected.designation}</span></div>
            </div>
          )}

          {existingSalary && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Existing Salary Found</p>
                <p>This employee already has a salary record for this month. Use Update only after review.</p>
              </div>
            </div>
          )}

          {calculation ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Salary</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Monthly Salary" value={inr(calculation.salary.monthlySalary)} />
                  <Row label="Selected Month" value={calculation.monthLabel} />
                  <Row label="Daily Rate" value={inr(calculation.salary.dailyRate)} />
                  <Separator />
                  <Row label="Gross Salary" value={inr(calculation.salary.grossSalary)} strong />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Attendance Summary</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Calendar Days" value={calculation.attendance.calendarDays} />
                  <Row label="Working Days" value={calculation.attendance.workingDays} />
                  <Row label="Present Days" value={calculation.attendance.presentDays} />
                  <Row label="Absent Days" value={calculation.attendance.absentDays} />
                  <Row label="Weekly Offs" value={calculation.attendance.weeklyOffs} />
                  <Row label="Company Holidays" value={calculation.attendance.companyHolidays} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Leave Summary</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {leaveRows.map((leave) => (
                    <Row key={leave.type} label={leave.type} value={`${leave.days} ${leave.paid ? "paid" : "unpaid"}`} />
                  ))}
                  <Separator />
                  <Row label="Total Paid Leave" value={calculation.leave.paidLeaveDays} strong />
                  <Row label="Total Unpaid Leave" value={calculation.leave.unpaidLeaveDays} strong />
                </CardContent>
              </Card>

              <Card className="xl:col-span-3">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Salary Calculation</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-center text-sm">
                    {[
                      ["Monthly Salary", inr(calculation.salary.monthlySalary)],
                      ["Payable Working Days", calculation.attendance.workingDays],
                      ["Leave / Attendance Adjustment", `${calculation.leave.unpaidLeaveDays} unpaid days`],
                      ["Leave Deduction", inr(calculation.salary.leaveDeduction)],
                      ["Final Salary", inr(calculation.salary.netSalary)],
                    ].map(([label, value], index) => (
                      <div key={label} className="rounded-md border bg-muted/20 p-3 relative">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="font-bold mt-1">{value}</p>
                        {index < 4 && <span className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 text-muted-foreground">-&gt;</span>}
                      </div>
                    ))}
                  </div>
                  <div className="rounded-md border p-4 space-y-2 text-sm">
                    <Row label="Gross Salary" value={inr(calculation.salary.grossSalary)} />
                    <Row label="Deductions" value={inr(calculation.salary.totalDeductions)} />
                    <Separator />
                    <Row label="Net / Final Salary" value={inr(calculation.salary.netSalary)} strong />
                  </div>
                  <p className="lg:col-span-2 text-xs text-muted-foreground">
                    {calculation.attendance.source} {calculation.leave.duplicateHandling}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
              Select an employee and click Calculate to review trusted backend salary details.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {existingSalary ? (
            <Button onClick={() => assign(true)} disabled={!calculation || assigning} className="gap-2">
              <CheckCircle2 size={15} /> {assigning ? "Updating..." : "Update Salary"}
            </Button>
          ) : (
            <Button onClick={() => assign(false)} disabled={!calculation || assigning} className="gap-2">
              <CheckCircle2 size={15} /> {assigning ? "Assigning..." : "Assign Salary"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function SalaryManagement() {
  const { toast } = useToast();
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [designationFilter, setDesignationFilter] = useState("all");
  const [sortAsc, setSortAsc] = useState(true);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeEmployeeId, setActiveEmployeeId] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    try {
      setData(await apiJson<DashboardResponse>(`/api/salary/dashboard?month=${month}`));
    } catch (error) {
      toast({ title: "Unable to load salary data", description: error instanceof Error ? error.message : "Backend request failed.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [month]);

  const records = data?.records ?? [];
  const designations = useMemo(() => Array.from(new Set(records.map((record) => record.designation))).sort(), [records]);
  const statusOptions = useMemo(() => Array.from(new Set(records.map((record) => record.status))).sort(), [records]);

  const filtered = records
    .filter((record) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        record.name.toLowerCase().includes(q) ||
        record.id.toLowerCase().includes(q) ||
        record.designation.toLowerCase().includes(q) ||
        record.department.toLowerCase().includes(q) ||
        record.status.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      const matchesDesignation = designationFilter === "all" || record.designation === designationFilter;
      return matchesSearch && matchesStatus && matchesDesignation;
    })
    .sort((a, b) => sortAsc ? a.netSalary - b.netSalary : b.netSalary - a.netSalary);

  const exportSalaryReport = () => {
    const header = ["ID", "Name", "Department", "Designation", "Monthly Salary", "Gross Salary", "Paid Leave", "Unpaid Leave", "Leave Deduction", "Net Salary", "Assigned"];
    const rows = records.map((record) => [
      record.id,
      record.name,
      record.department,
      record.designation,
      record.monthlySalary,
      record.grossSalary,
      record.paidLeaveDays,
      record.unpaidLeaveDays,
      record.leaveDeduction,
      record.netSalary,
      record.assignment.exists ? "Yes" : "No",
    ]);
    downloadTextFile(`CODE-CORE-Salary-${month}.csv`, [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n"));
  };

  const openCalculation = (employeeId?: string) => {
    setActiveEmployeeId(employeeId ?? filtered[0]?.id ?? records[0]?.id ?? "");
    setDialogOpen(true);
  };

  const summary = data?.summary ?? {
    employeeCount: 0,
    totalMonthlySalary: 0,
    avgMonthlySalary: 0,
    assignedCount: 0,
    pendingCount: 0,
  };

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Salary Management</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">Salary Assign</span>
            <Button size="sm" className="h-8 gap-2" onClick={() => openCalculation()}>
              <Calculator size={14} /> Calculate Salary
            </Button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="h-8 w-full sm:w-40" />
          <Button variant="outline" size="sm" className="gap-2" onClick={exportSalaryReport} disabled={!records.length}>
            <Download size={14} /> Export Salary Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Total Net Salary", value: inr(summary.totalMonthlySalary), sub: `${summary.employeeCount} employees`, icon: IndianRupee, color: "text-green-600", bg: "bg-green-100" },
          { label: "Average Net Salary", value: inr(summary.avgMonthlySalary), sub: "Current month", icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-100" },
          { label: "Assigned", value: `${summary.assignedCount} / ${summary.employeeCount}`, sub: `${summary.pendingCount} pending`, icon: Users, color: "text-purple-600", bg: "bg-purple-100" },
        ].map((stat, index) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
            <Card className="border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="min-h-32 p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <h3 className="text-2xl font-bold mt-2 truncate tabular-nums">{stat.value}</h3>
                  <p className="text-xs text-muted-foreground/75 mt-1">{stat.sub}</p>
                </div>
                <div className={`p-3 rounded-full shrink-0 ${stat.bg} ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-muted/20 py-3 px-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold">Employee Salary Records</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search employees..." className="pl-9 h-8 text-sm" value={search} onChange={(event) => setSearch(event.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {statusOptions.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={designationFilter} onValueChange={setDesignationFilter}>
                <SelectTrigger className="h-8 text-xs sm:w-52"><SelectValue placeholder="Designation" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Designations</SelectItem>
                  {designations.map((designation) => <SelectItem key={designation} value={designation}>{designation}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs">Department</TableHead>
                <TableHead className="text-xs">Designation</TableHead>
                <TableHead className="text-xs">Monthly Salary</TableHead>
                <TableHead className="text-xs">Gross</TableHead>
                <TableHead className="text-xs">Leave / LOP</TableHead>
                <TableHead className="text-xs">Leave Deduction</TableHead>
                <TableHead className="text-xs cursor-pointer select-none" onClick={() => setSortAsc((value) => !value)}>
                  <div className="flex items-center gap-1">
                    Net Salary {sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </div>
                </TableHead>
                <TableHead className="text-xs">Assignment</TableHead>
                <TableHead className="w-24 text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="h-24 text-center text-muted-foreground text-sm">Loading salary data...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="h-24 text-center text-muted-foreground text-sm">No employees found.</TableCell></TableRow>
              ) : filtered.map((record, index) => (
                <motion.tr key={record.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.03 }} className="border-b hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {record.avatarUrl && <AvatarImage src={record.avatarUrl} alt={record.name} />}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                          {record.name.split(" ").map((part) => part[0]).join("").substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm leading-tight">{record.name}</p>
                        <p className="text-[10px] text-muted-foreground">{record.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{record.department}</TableCell>
                  <TableCell className="text-sm">{record.designation}</TableCell>
                  <TableCell className="text-sm tabular-nums">{inr(record.monthlySalary)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">{inr(record.grossSalary)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{record.paidLeaveDays + record.unpaidLeaveDays} / {record.unpaidLeaveDays}</TableCell>
                  <TableCell className="text-sm text-red-500 tabular-nums">{inr(record.leaveDeduction)}</TableCell>
                  <TableCell className="font-bold text-sm tabular-nums">{inr(record.netSalary)}</TableCell>
                  <TableCell>
                    <Badge className={record.assignment.exists ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200" : "bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200"}>
                      {record.assignment.exists ? "Assigned" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-primary hover:text-primary hover:bg-primary/10" onClick={() => openCalculation(record.id)}>
                      Review
                    </Button>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="px-5 py-3 border-t bg-muted/10 flex justify-between items-center text-xs text-muted-foreground">
          <span>Showing {filtered.length} of {records.length} employees</span>
          <span className="font-semibold">Total Net: <span className="text-foreground">{inr(summary.totalMonthlySalary)}</span></span>
        </div>
      </Card>

      <SalaryCalculationDialog
        open={dialogOpen}
        records={records}
        month={month}
        initialEmployeeId={activeEmployeeId}
        onClose={() => setDialogOpen(false)}
        onAssigned={loadDashboard}
      />
    </div>
  );
}