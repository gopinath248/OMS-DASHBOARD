import { useState } from "react";
import {
  Download, Printer, Share2, FileText, FileSpreadsheet,
  Mail, Link2, MessageCircle, MonitorPlay, Loader2, CheckCircle2
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
const ROLES = ["Intern", "Trainee"];

function getReportData(type: string) {
  switch (type) {
    case "attendance": {
      const data = ROLES.map(dept => {
        const deptStudents = students.filter(s => s.role === dept);
        if (!deptStudents.length) return null;
        const ids = deptStudents.map(s => s.id);
        const perf = performanceData.filter(p => ids.includes(p.internId));
        const avg = perf.length ? Math.round(perf.reduce((s, p) => s + p.attendance, 0) / perf.length) : 0;
        return { name: dept, value: avg };
      }).filter(Boolean) as { name: string; value: number }[];
      const avg = data.length ? Math.round(data.reduce((s, d) => s + d.value, 0) / data.length) : 0;
      const best = data.length ? data.reduce((a, b) => a.value > b.value ? a : b) : { name: "N/A" };
      return { data, summary: { total: students.length, avg: `${avg}%`, best: `${best.name}`, trend: "+1%" } };
    }
    case "performance": {
      const data = ROLES.map(dept => {
        const deptStudents = students.filter(s => s.role === dept);
        if (!deptStudents.length) return null;
        const ids = deptStudents.map(s => s.id);
        const perf = performanceData.filter(p => ids.includes(p.internId));
        const avg = perf.length ? Math.round(perf.reduce((s, p) => s + (p.attendance + p.taskCompletion + p.communication + p.discipline + p.learning + p.innovation) / 6, 0) / perf.length) : 0;
        return { name: dept, value: avg };
      }).filter(Boolean) as { name: string; value: number }[];
      const avg = data.length ? Math.round(data.reduce((s, d) => s + d.value, 0) / data.length) : 0;
      const best = data.length ? data.reduce((a, b) => a.value > b.value ? a : b) : { name: "N/A" };
      return { data, summary: { total: students.length, avg: `${avg}%`, best: `${best.name}`, trend: "+4%" } };
    }
    case "leave": {
      const types = ["Casual", "Sick", "Personal", "Emergency"];
      const data = types.map(t => ({
        name: t, value: leaveRequests.filter(l => l.type === t).length,
      }));
      const statuses = [
        { name: "Approved", value: leaveRequests.filter(l => l.status === "Approved").length },
        { name: "Pending",  value: leaveRequests.filter(l => l.status === "Pending").length },
        { name: "Rejected", value: leaveRequests.filter(l => l.status === "Rejected").length },
      ];
      return {
        data, pieData: statuses,
        summary: {
          total: leaveRequests.length,
          avg: `${leaveRequests.filter(l => l.status === "Pending").length} pending`,
          best: `${leaveRequests.filter(l => l.status === "Approved").length} approved`,
          trend: "+2%",
        },
      };
    }
    case "task": {
      const statuses = ["To Do", "In Progress", "Completed"];
      const data = statuses.map(s => ({
        name: s === "In Progress" ? "In Prog." : s,
        value: tasks.filter(t => {
          if (s === "In Progress") return t.status === "In Progress" || t.status === "Review" || t.status === "Testing";
          return t.status === s;
        }).length,
      }));
      const completed = tasks.filter(t => t.status === "Completed").length;
      return {
        data,
        summary: {
          total: tasks.length,
          avg: `${tasks.length ? Math.round((completed / tasks.length) * 100) : 0}%`,
          best: `${completed} done`,
          trend: "+3%",
        },
      };
    }
    case "completion": {
      const data = ROLES.map(dept => ({
        name: dept,
        value: students.filter(s => s.role === dept && s.status === "Completed").length,
      })).filter(d => d.value > 0);
      const completed = students.filter(s => s.status === "Completed").length;
      return {
        data,
        summary: {
          total: students.length,
          avg: `${students.length ? Math.round((completed / students.length) * 100) : 0}%`,
          best: `${completed} completed`,
          trend: "+8%",
        },
      };
    }
    default:
      return { data: [], summary: { total: 0, avg: "—", best: "—", trend: "—" } };
  }
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
    .summary{display:flex;gap:24px;flex-wrap:wrap;margin-top:16px;padding:12px;background:#f9f9f9;border:1px solid #eee;border-radius:6px}
    .summary-item{min-width:100px} .summary-label{font-size:10px;color:#888;margin-bottom:2px} .summary-value{font-size:16px;font-weight:600}
  </style></head><body>
  <h1>${title}</h1>
  <div class="sub">Code Core Global Hi-Tech Solutions — Exported on ${new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}</div>
  ${html}
  </body></html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 400);
}

export default function Reports() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState("attendance");
  const [exporting, setExporting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const reportTypes = [
    { id: "attendance",  label: "Attendance Report" },
    { id: "performance", label: "Performance Report" },
    { id: "leave",       label: "Leave Summary" },
    { id: "task",        label: "Task Completion" },
    { id: "completion",  label: "Program Completion" },
  ];

  const report = getReportData(reportType);
  const currentLabel = reportTypes.find(r => r.id === reportType)?.label ?? "Report";

  const summaryLabels: Record<string, [string, string, string, string]> = {
    attendance:  ["Total Interns", "Avg Attendance",   "Best Dept",       "Trend"],
    performance: ["Total Interns", "Avg Performance",  "Best Dept",       "Trend"],
    leave:       ["Total Requests","Pending",           "Approved",        "Trend"],
    task:        ["Total Tasks",   "Completion Rate",  "Completed",       "Trend"],
    completion:  ["Total Interns", "Completion %",     "Completed",       "Trend"],
  };
  const labels = summaryLabels[reportType] ?? ["Total", "Average", "Best", "Trend"];

  const handleExportCSV = async () => {
    setExporting(true);
    await new Promise(r => setTimeout(r, 500));
    const headers = ["Category / Name", "Value"];
    const rows = report.data.map(d => [d.name, d.value.toString()]);
    rows.push(
      ["---", "---"],
      [labels[0], String(report.summary.total)],
      [labels[1], report.summary.avg],
      [labels[2], report.summary.best],
      [labels[3], report.summary.trend],
    );
    downloadCSV(`${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    setExporting(false);
    toast({ title: "Exported as CSV", description: `${currentLabel} downloaded successfully.` });
  };

  const handleExportPDF = async () => {
    setExporting(true);
    await new Promise(r => setTimeout(r, 400));
    const tableRows = report.data.map(d => `<tr><td>${d.name}</td><td>${d.value}</td></tr>`).join("");
    openPrintWindow(`${currentLabel} — Code Core IMS`, `
      <table>
        <thead><tr><th>Name / Category</th><th>Value</th></tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
      <div class="summary">
        ${[
          [labels[0], report.summary.total],
          [labels[1], report.summary.avg],
          [labels[2], report.summary.best],
          [labels[3], report.summary.trend],
        ].map(([label, val]) => `
          <div class="summary-item">
            <div class="summary-label">${label}</div>
            <div class="summary-value">${val}</div>
          </div>`).join("")}
      </div>`);
    setExporting(false);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast({ title: "Link Copied", description: "Report link copied to clipboard." });
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent(`Code Core IMS — ${currentLabel}`);
    const body = encodeURIComponent(
      `Please find the ${currentLabel} from Code Core IMS.\n\nReport URL: ${window.location.href}\n\nGenerated on: ${new Date().toLocaleDateString()}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
    setShareOpen(false);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`Code Core IMS — ${currentLabel}\n${window.location.href}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
    setShareOpen(false);
  };

  const handleShareTeams = () => {
    const url = encodeURIComponent(window.location.href);
    window.open(`https://teams.microsoft.com/share?href=${url}`, "_blank");
    setShareOpen(false);
  };

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" title="Print" onClick={() => window.print()}>
            <Printer size={18} />
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setShareOpen(true)}>
            <Share2 size={16} /> Share
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2" disabled={exporting}>
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
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        <Card className="w-full md:w-64 shrink-0 flex flex-col overflow-hidden">
          <CardHeader className="py-4 border-b bg-muted/30">
            <CardTitle className="text-base font-semibold">Report Types</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto">
            <div className="flex flex-col">
              {reportTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setReportType(type.id)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left border-b last:border-0 ${
                    reportType === type.id
                      ? "bg-primary/10 text-primary font-medium border-l-2 border-l-primary"
                      : "hover:bg-muted/50 text-muted-foreground border-l-2 border-l-transparent"
                  }`}
                >
                  <FileText size={16} />
                  {type.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="py-4 border-b bg-muted/30 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg font-semibold">{currentLabel}</CardTitle>
            <div className="flex gap-3">
              <Input type="date" className="w-36 h-8 text-xs" />
              <span className="text-muted-foreground self-center text-sm">to</span>
              <Input type="date" className="w-36 h-8 text-xs" />
              <Select defaultValue="all">
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Dept" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Designations</SelectItem>
                  {DEPTS.map(d => <SelectItem key={d} value={d.toLowerCase()}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-6 flex-1 overflow-y-auto flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-[300px] border rounded-xl p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} fontSize={12} />
                    <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {"pieData" in report && report.pieData ? (
                <div className="h-[300px] border rounded-xl p-4 flex flex-col items-center justify-center">
                  <ResponsiveContainer width="100%" height="80%">
                    <PieChart>
                      <Pie data={report.pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                        {report.pieData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 mt-2">
                    {report.pieData.map((d, idx) => (
                      <div key={d.name} className="flex items-center gap-1 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        {d.name} ({d.value})
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="border rounded-xl p-4 flex flex-col gap-3 justify-center">
                  {report.data.map((d, idx) => (
                    <div key={d.name}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="font-semibold">{d.value}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(d.value / Math.max(...report.data.map(x => x.value), 1)) * 100}%`,
                            backgroundColor: COLORS[idx % COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border rounded-xl overflow-hidden shrink-0">
              <div className="bg-muted px-4 py-2 font-semibold text-sm border-b">Summary</div>
              <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  [labels[0], report.summary.total.toString()],
                  [labels[1], report.summary.avg],
                  [labels[2], report.summary.best],
                  [labels[3], report.summary.trend],
                ].map(([label, val]) => (
                  <div key={label} className="space-y-1">
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className={`text-xl font-semibold ${String(val).startsWith("+") ? "text-green-500" : ""}`}>{val}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Share2 size={18} /> Share Report</DialogTitle>
            <DialogDescription>Share the <strong>{currentLabel}</strong> via your preferred channel.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Button className="w-full gap-3 justify-start" variant="outline" onClick={handleShareEmail}>
              <Mail size={18} className="text-blue-500" />
              <div className="text-left">
                <p className="font-medium text-sm">Email</p>
                <p className="text-xs text-muted-foreground">Send via your email client</p>
              </div>
            </Button>
            <Button className="w-full gap-3 justify-start" variant="outline" onClick={handleCopyLink}>
              {copied ? <CheckCircle2 size={18} className="text-green-500" /> : <Link2 size={18} className="text-gray-500" />}
              <div className="text-left">
                <p className="font-medium text-sm">{copied ? "Copied!" : "Copy Link"}</p>
                <p className="text-xs text-muted-foreground">Copy report URL to clipboard</p>
              </div>
            </Button>
            <Button className="w-full gap-3 justify-start" variant="outline" onClick={handleShareWhatsApp}>
              <MessageCircle size={18} className="text-green-500" />
              <div className="text-left">
                <p className="font-medium text-sm">WhatsApp</p>
                <p className="text-xs text-muted-foreground">Share via WhatsApp</p>
              </div>
            </Button>
            <Button className="w-full gap-3 justify-start" variant="outline" onClick={handleShareTeams}>
              <MonitorPlay size={18} className="text-indigo-500" />
              <div className="text-left">
                <p className="font-medium text-sm">Microsoft Teams</p>
                <p className="text-xs text-muted-foreground">Share in Teams channel</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
