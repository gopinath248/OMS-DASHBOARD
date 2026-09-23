import { useMemo, useState } from "react";
import {
  Download, Printer, Share2, FileText, FileSpreadsheet,
  Mail, Link2, MessageCircle, MonitorPlay, Loader2, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { students, staff, leaveRequests, tasks, performanceData } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
const REPORT_TYPES = [
  { id: "attendance", label: "Attendance Report" },
  { id: "performance", label: "Performance Report" },
  { id: "leave", label: "Leave Summary" },
  { id: "task", label: "Task Completion" },
  { id: "ticketType", label: "Ticket by Type" },
  { id: "completion", label: "Program Completion" },
];

type ReportValue = string | number;
type ReportRow = Record<string, ReportValue>;
type Filters = { fromDate: string; toDate: string; role: string };
type ReportResult = {
  data: Array<{ name: string; value: number }>;
  details: ReportRow[];
  pieData?: Array<{ name: string; value: number }>;
  summary: { total: number; avg: string; best: string; trend: string };
};

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function inDateRange(value: string, filters: Filters) {
  if (!value) return true;
  return (!filters.fromDate || value >= filters.fromDate) && (!filters.toDate || value <= filters.toDate);
}

function roleMatches(value: string, role: string) {
  return role === "all" || normalize(value) === normalize(role);
}

function getPerformanceAverage(performance: typeof performanceData[number]) {
  const values = [
    performance.attendance, performance.taskCompletion, performance.communication,
    performance.discipline, performance.learning, performance.innovation,
    performance.leadership, performance.collaboration,
  ];
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function getReportData(type: string, filters: Filters): ReportResult {
  const filteredStudents = students.filter(student =>
    roleMatches(student.role, filters.role) && inDateRange(student.startDate, filters)
  );
  const studentIds = new Set(filteredStudents.map(student => student.id));
  const filteredPerformance = performanceData.filter(performance => studentIds.has(performance.internId));
  const staffByName = new Map(staff.map(employee => [normalize(employee.name), employee]));
  const studentByName = new Map(students.map(student => [normalize(student.name), student]));
  const filteredLeaves = leaveRequests.filter(leave =>
    roleMatches(leave.applicantRole ?? "", filters.role) && inDateRange(leave.startDate, filters)
  );
  const filteredTasks = tasks.filter(task => {
    if (!inDateRange(task.dueDate, filters)) return false;
    if (filters.role === "all") return true;
    const person = staffByName.get(normalize(task.assignedTo)) ?? studentByName.get(normalize(task.assignedTo));
    return roleMatches(person?.role ?? "", filters.role);
  });

  switch (type) {
    case "attendance": {
      const details = filteredPerformance.map(performance => {
        const student = filteredStudents.find(item => item.id === performance.internId);
        return { intern: student?.name ?? performance.internId, attendance: performance.attendance };
      });
      const data = details.map(row => ({ name: String(row.intern), value: Number(row.attendance) }));
      const average = data.length ? Math.round(data.reduce((sum, row) => sum + row.value, 0) / data.length) : 0;
      return {
        data, details,
        summary: { total: filteredStudents.length, avg: `${average}%`, best: data.length ? `${Math.max(...data.map(row => row.value))}%` : "—", trend: "—" },
      };
    }
    case "performance": {
      const details = filteredPerformance.map(performance => {
        const student = filteredStudents.find(item => item.id === performance.internId);
        return {
          intern: student?.name ?? performance.internId,
          performance: getPerformanceAverage(performance),
          attendance: performance.attendance,
          taskCompletion: performance.taskCompletion,
          communication: performance.communication,
          discipline: performance.discipline,
          learning: performance.learning,
          innovation: performance.innovation,
          leadership: performance.leadership,
          collaboration: performance.collaboration,
        };
      });
      const data = details.map(row => ({ name: String(row.intern), value: Number(row.performance) }));
      const average = data.length ? Math.round(data.reduce((sum, row) => sum + row.value, 0) / data.length) : 0;
      return {
        data, details,
        summary: { total: filteredStudents.length, avg: `${average}%`, best: data.length ? `${Math.max(...data.map(row => row.value))}%` : "—", trend: "—" },
      };
    }
    case "leave": {
      const types = [...new Set(filteredLeaves.map(leave => leave.type))].sort();
      const data = types.map(name => ({ name, value: filteredLeaves.filter(leave => leave.type === name).length }));
      const pieData = ["Approved", "Pending", "Rejected"].map(name => ({
        name, value: filteredLeaves.filter(leave => normalize(leave.status) === normalize(name)).length,
      }));
      const details = filteredLeaves.map(leave => ({
        id: leave.id, employee: leave.employeeName ?? leave.internName, type: leave.type,
        startDate: leave.startDate, endDate: leave.endDate, status: leave.status, duration: leave.duration,
      }));
      return {
        data, pieData, details,
        summary: { total: filteredLeaves.length, avg: `${pieData.find(item => item.name === "Pending")?.value ?? 0} pending`, best: `${pieData.find(item => item.name === "Approved")?.value ?? 0} approved`, trend: "—" },
      };
    }
    case "task": {
      const statuses = ["To Do", "In Progress", "Completed", "Overdue"];
      const isOverdue = (task: typeof tasks[number]) =>
        Boolean(task.dueDate) && task.dueDate < new Date().toISOString().slice(0, 10) && normalize(task.status) !== "completed";
      const data = statuses.map(name => ({
        name,
        value: filteredTasks.filter(task => name === "Overdue" ? isOverdue(task) : (
          name === "In Progress"
            ? ["in progress", "review", "testing"].includes(normalize(task.status))
            : normalize(task.status) === normalize(name)
        )).length,
      }));
      const details = filteredTasks.map(task => ({
        id: task.id, title: task.title, assignedTo: task.assignedTo, status: task.status,
        priority: task.priority, dueDate: task.dueDate, overdue: isOverdue(task) ? "Yes" : "No",
      }));
      const completed = data.find(item => item.name === "Completed")?.value ?? 0;
      return {
        data, details,
        summary: { total: filteredTasks.length, avg: `${filteredTasks.length ? Math.round((completed / filteredTasks.length) * 100) : 0}%`, best: `${completed} completed`, trend: "—" },
      };
    }
    case "completion": {
      const statuses = [...new Set(filteredStudents.map(student => student.status))].sort();
      const data = statuses.map(name => ({ name, value: filteredStudents.filter(student => student.status === name).length }));
      const details = filteredStudents.map(student => ({
        id: student.id, intern: student.name, role: student.role, status: student.status,
        startDate: student.startDate, endDate: student.endDate, progress: student.progress,
      }));
      const completed = filteredStudents.filter(student => normalize(student.status) === "completed").length;
      return {
        data, details,
        summary: { total: filteredStudents.length, avg: `${filteredStudents.length ? Math.round((completed / filteredStudents.length) * 100) : 0}%`, best: `${completed} completed`, trend: "—" },
      };
    }
    case "ticketType":
      return { data: [], details: [], summary: { total: 0, avg: "—", best: "—", trend: "—" } };
    default:
      return { data: [], details: [], summary: { total: 0, avg: "—", best: "—", trend: "—" } };
  }
}

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.map(value => `"${value.replace(/"/g, '""')}"`).join(","), ...rows.map(row =>
    row.map(value => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")
  )].join("\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character] ?? character));
}

function openPrintWindow(title: string, html: string) {
  const win = window.open("", "_blank", "width=1000,height=700");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title><style>
    body{font-family:Arial,sans-serif;margin:0;padding:28px;color:#111;background:#f4f7fb}
    .page{max-width:1100px;margin:0 auto;background:#fff;border:1px solid #d8dee9;border-radius:16px;padding:28px}
    h1{font-size:21px;margin:0 0 6px}.sub{font-size:11px;color:#666;margin-bottom:16px}
    table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
    th{background:#f5f5f5;font-weight:600}.summary{display:flex;gap:24px;flex-wrap:wrap;margin:16px 0;padding:12px;background:#f9f9f9;border:1px solid #eee}
    .summary-item{min-width:100px}.summary-label{font-size:10px;color:#888}.summary-value{font-size:16px;font-weight:600}
  </style></head><body><div class="page"><h1>${escapeHtml(title)}</h1>
  <div class="sub">Generated ${escapeHtml(new Date().toLocaleString())}</div>${html}</div></body></html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 400);
}

export default function Reports() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState("attendance");
  const [filters, setFilters] = useState<Filters>({ fromDate: "", toDate: "", role: "all" });
  const [exporting, setExporting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const report = useMemo(() => getReportData(reportType, filters), [reportType, filters]);
  const currentLabel = REPORT_TYPES.find(reportTypeItem => reportTypeItem.id === reportType)?.label ?? "Report";
  const roleOptions = [...new Set([...students.map(student => student.role), ...staff.map(employee => employee.role)])].filter(Boolean).sort();
  const summaryLabels: Record<string, [string, string, string, string]> = {
    attendance: ["Total Interns", "Avg Attendance", "Best Attendance", "Trend"],
    performance: ["Total Interns", "Avg Performance", "Best Performance", "Trend"],
    leave: ["Total Requests", "Pending", "Approved", "Trend"],
    task: ["Total Tasks", "Completion Rate", "Completed", "Trend"],
    ticketType: ["Total Tickets", "Available Data", "Top Type", "Trend"],
    completion: ["Total Interns", "Completion %", "Completed", "Trend"],
  };
  const labels = summaryLabels[reportType] ?? ["Total", "Average", "Best", "Trend"];

  const updateFilter = (key: keyof Filters, value: string) => setFilters(previous => ({ ...previous, [key]: value }));
  const exportRows: ReportRow[] = report.details.length
    ? report.details
    : report.data.map(row => ({ category: row.name, value: row.value }));

  const handleExportCSV = () => {
    setExporting(true);
    const headers = [...new Set(exportRows.flatMap(row => Object.keys(row)))];
    const rows = exportRows.map(row => headers.map(header => String(row[header] ?? "")));
    rows.push([], ["Summary", ""], [labels[0], String(report.summary.total)], [labels[1], report.summary.avg], [labels[2], report.summary.best], [labels[3], report.summary.trend]);
    downloadCSV(`${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    setExporting(false);
    toast({ title: "Exported as CSV", description: `${currentLabel} downloaded successfully.` });
  };

  const handleExportPDF = () => {
    setExporting(true);
    const headers = [...new Set(exportRows.flatMap(row => Object.keys(row)))];
    const table = `<table><thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${
      exportRows.map(row => `<tr>${headers.map(header => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`).join("")
    }</tbody></table><div class="summary">${[
      [labels[0], report.summary.total], [labels[1], report.summary.avg],
      [labels[2], report.summary.best], [labels[3], report.summary.trend],
    ].map(([label, value]) => `<div class="summary-item"><div class="summary-label">${escapeHtml(label)}</div><div class="summary-value">${escapeHtml(value)}</div></div>`).join("")}</div>`;
    openPrintWindow(`${currentLabel} - Planway`, table);
    setExporting(false);
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" title="Print" onClick={() => window.print()}><Printer size={18} /></Button>
          <Button variant="outline" className="gap-2" onClick={() => setShareOpen(true)}><Share2 size={16} /> Share</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button className="gap-2" disabled={exporting}>{exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Export</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={handleExportCSV}><FileSpreadsheet size={15} /> Export as CSV</DropdownMenuItem>
              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={handleExportPDF}><FileText size={15} /> Export as PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        <Card className="w-full md:w-64 shrink-0 flex flex-col overflow-hidden">
          <CardHeader className="py-4 border-b bg-muted/30"><CardTitle className="text-base font-semibold">Report Types</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-y-auto"><div className="flex flex-col">
            {REPORT_TYPES.map(type => <button key={type.id} onClick={() => setReportType(type.id)} className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left border-b last:border-0 ${reportType === type.id ? "bg-primary/10 text-primary font-medium border-l-2 border-l-primary" : "hover:bg-muted/50 text-muted-foreground border-l-2 border-l-transparent"}`}><FileText size={16} />{type.label}</button>)}
          </div></CardContent>
        </Card>
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="py-4 border-b bg-muted/30 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg font-semibold">{currentLabel}</CardTitle>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <Input type="date" value={filters.fromDate} onChange={event => updateFilter("fromDate", event.target.value)} className="h-9 w-[10.5rem] min-w-[10.5rem] pr-8 text-sm" aria-label="From date" />
              <span className="text-muted-foreground self-center text-sm">to</span>
              <Input type="date" value={filters.toDate} onChange={event => updateFilter("toDate", event.target.value)} className="h-9 w-[10.5rem] min-w-[10.5rem] pr-8 text-sm" aria-label="To date" />
              <Select value={filters.role} onValueChange={value => updateFilter("role", value)}>
                <SelectTrigger className="h-9 w-32 text-xs"><SelectValue placeholder="Role" /></SelectTrigger>
                <SelectContent><SelectItem value="all">All Roles</SelectItem>{roleOptions.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
            {report.data.length || report.details.length ? <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-[300px] border rounded-xl p-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={report.data}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" /><XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={12} /><YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={12} /><Tooltip /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} /></BarChart></ResponsiveContainer></div>
              {report.pieData ? <div className="h-[300px] border rounded-xl p-4 flex flex-col items-center justify-center"><ResponsiveContainer width="100%" height="80%"><PieChart><Pie data={report.pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">{report.pieData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="flex gap-4 mt-2">{report.pieData.map((item, index) => <div key={item.name} className="flex items-center gap-1 text-xs"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />{item.name} ({item.value})</div>)}</div></div> : <div className="border rounded-xl p-4 flex flex-col gap-3 justify-center">{report.data.map((item, index) => <div key={item.name}><div className="flex justify-between text-sm mb-1.5"><span className="text-muted-foreground">{item.name}</span><span className="font-semibold">{item.value}</span></div><div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${(item.value / Math.max(...report.data.map(row => row.value), 1)) * 100}%`, backgroundColor: COLORS[index % COLORS.length] }} /></div></div>)}</div>}
            </div> : <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">No data available for the selected filters.</div>}
            <div className="border rounded-xl overflow-hidden shrink-0"><div className="bg-muted px-4 py-2 font-semibold text-sm border-b">Summary</div><div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">{[[labels[0], report.summary.total], [labels[1], report.summary.avg], [labels[2], report.summary.best], [labels[3], report.summary.trend]].map(([label, value]) => <div key={label} className="space-y-1"><p className="text-sm text-muted-foreground">{label}</p><p className="text-xl font-semibold">{value}</p></div>)}</div></div>
          </CardContent>
        </Card>
      </div>
      <Dialog open={shareOpen} onOpenChange={setShareOpen}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle className="flex items-center gap-2"><Share2 size={18} /> Share Report</DialogTitle><DialogDescription>Share the <strong>{currentLabel}</strong> via your preferred channel.</DialogDescription></DialogHeader><div className="space-y-3 py-2">
        <Button className="w-full gap-3 justify-start" variant="outline" onClick={() => { const subject = encodeURIComponent(`Planway - ${currentLabel}`); window.open(`mailto:?subject=${subject}&body=${encodeURIComponent(window.location.href)}`, "_self"); setShareOpen(false); }}><Mail size={18} className="text-blue-500" />Email</Button>
        <Button className="w-full gap-3 justify-start" variant="outline" onClick={async () => { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2500); toast({ title: "Link Copied", description: "Report link copied to clipboard." }); }} >{copied ? <CheckCircle2 size={18} className="text-green-500" /> : <Link2 size={18} />} {copied ? "Copied!" : "Copy Link"}</Button>
        <Button className="w-full gap-3 justify-start" variant="outline" onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent(`Planway - ${currentLabel}\n${window.location.href}`)}`, "_blank"); setShareOpen(false); }}><MessageCircle size={18} className="text-green-500" />WhatsApp</Button>
        <Button className="w-full gap-3 justify-start" variant="outline" onClick={() => { window.open(`https://teams.microsoft.com/share?href=${encodeURIComponent(window.location.href)}`, "_blank"); setShareOpen(false); }}><MonitorPlay size={18} className="text-indigo-500" />Microsoft Teams</Button>
      </div></DialogContent></Dialog>
    </div>
  );
}
