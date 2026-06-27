import { useState } from "react";
import { IndianRupee, TrendingUp, Users, Clock, Search, Download, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { staff } from "@/data/mockData";
import { motion } from "framer-motion";

/* ─── Indian currency helpers ─────────────────────────────── */
function inr(amount: number, opts?: { compact?: boolean }): string {
  if (opts?.compact) {
    if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)}Cr`;
    if (amount >= 1_00_000)    return `₹${(amount / 1_00_000).toFixed(2)}L`;
    if (amount >= 1_000)       return `₹${(amount / 1_000).toFixed(0)}K`;
  }
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);
}

/* ─── Salary data ─────────────────────────────────────────── */
const SALARY_BASE: Record<string, number> = {
  "Senior Engineer":       95000,
  "Lead Data Scientist":  105000,
  "Product Manager":       90000,
  "DevOps Lead":           98000,
  "ML Research Engineer": 102000,
  "Full Stack Engineer":   85000,
  "HR Coordinator":        72000,
  "Hardware Engineer":     80000,
  "Power Systems Expert":  88000,
  "Security Engineer":     92000,
};

/* Component breakdown for payslip */
function getComponents(base: number) {
  const hra       = Math.round(base * 0.4);
  const travel    = Math.round(base * 0.08);
  const medical   = Math.round(base * 0.05);
  const bonus     = Math.round(base * 0.12);
  const pf        = Math.round(base * 0.12);
  const profTax   = 200;
  const gross     = base + hra + travel + medical + bonus;
  const deductions= pf + profTax;
  const net       = gross - deductions;
  return { hra, travel, medical, bonus, pf, profTax, gross, deductions, net };
}

const PAYROLL = staff.map(s => ({
  ...s,
  base:     SALARY_BASE[s.designation] ?? 80000,
  paid:     s.status === "Active",
  lastPaid: "2026-05-31",
  nextPay:  "2026-06-30",
}));

const totalAnnualPayroll = PAYROLL.reduce((a, b) => a + b.base, 0);
const totalMonthly       = Math.round(totalAnnualPayroll / 12);
const avgMonthly         = Math.round(totalMonthly / PAYROLL.length);
const paidCount          = PAYROLL.filter(p => p.paid).length;

/* ─── Payslip Dialog ──────────────────────────────────────── */
function PayslipDialog({ employee, open, onClose }: {
  employee: typeof PAYROLL[0] | null; open: boolean; onClose: () => void;
}) {
  if (!employee) return null;
  const monthly = Math.round(employee.base / 12);
  const c = getComponents(monthly);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IndianRupee size={16} className="text-green-600" /> Payslip — June 2026
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1 text-sm">
          {/* Employee info */}
          <div className="bg-muted/40 rounded-xl p-4 space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Employee Name</span>
              <span className="font-semibold">{employee.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Employee ID</span>
              <span className="font-mono text-xs font-semibold">{employee.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Designation</span>
              <span className="font-semibold">{employee.designation}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Department</span>
              <span className="font-semibold">{employee.department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pay Month</span>
              <span className="font-semibold">June 2026</span>
            </div>
          </div>

          {/* Earnings */}
          <div>
            <p className="font-bold text-xs text-muted-foreground uppercase tracking-widest mb-2">Earnings</p>
            <div className="space-y-1.5">
              {[
                { label: "Basic Salary",       value: monthly },
                { label: "HRA",                value: c.hra },
                { label: "Travel Allowance",   value: c.travel },
                { label: "Medical Allowance",  value: c.medical },
                { label: "Performance Bonus",  value: c.bonus },
              ].map(row => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium tabular-nums">{inr(row.value)}</span>
                </div>
              ))}
            </div>
            <Separator className="mt-2.5 mb-1.5" />
            <div className="flex justify-between font-semibold text-green-600">
              <span>Gross Earnings</span>
              <span className="tabular-nums">{inr(c.gross)}</span>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <p className="font-bold text-xs text-muted-foreground uppercase tracking-widest mb-2">Deductions</p>
            <div className="space-y-1.5">
              {[
                { label: "Provident Fund (PF)", value: c.pf },
                { label: "Professional Tax",    value: c.profTax },
              ].map(row => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium text-red-500 tabular-nums">−{inr(row.value)}</span>
                </div>
              ))}
            </div>
            <Separator className="mt-2.5 mb-1.5" />
            <div className="flex justify-between font-semibold text-red-500">
              <span>Total Deductions</span>
              <span className="tabular-nums">−{inr(c.deductions)}</span>
            </div>
          </div>

          {/* Net Salary */}
          <div className="bg-primary/8 border border-primary/20 rounded-xl p-4 flex justify-between items-center">
            <span className="font-bold text-base">Net Salary</span>
            <span className="font-bold text-xl text-primary tabular-nums">{inr(c.net)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          <Button size="sm" className="gap-2" onClick={() => {
            const win = window.open("", "_blank", "width=700,height=800");
            if (!win) return;
            win.document.write(`<!DOCTYPE html><html><head><title>Payslip - ${employee.name} - June 2026</title><style>body{font-family:Arial,sans-serif;padding:32px;max-width:600px;margin:0 auto;color:#111}h2{font-size:20px;margin:0}h3{font-size:14px;margin:0 0 16px;color:#555}.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #D4AF37}.badge{background:#D4AF37;color:#111;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#f9f9f9;padding:16px;border-radius:8px;margin-bottom:20px;font-size:13px}.info-item .label{color:#666;font-size:11px;margin-bottom:2px}.info-item .val{font-weight:600}.section-title{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin:16px 0 8px}.row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid #f0f0f0}.row.total{border-top:2px solid #ddd;border-bottom:none;font-weight:700;font-size:14px;padding-top:10px}.net-box{background:#D4AF37;color:#111;padding:16px 20px;border-radius:10px;display:flex;justify-content:space-between;align-items:center;margin-top:20px}.net-box .net-label{font-size:14px;font-weight:600}.net-box .net-val{font-size:22px;font-weight:800}.red{color:#c0392b}</style></head><body><div class="header"><div><h2>PAYSLIP</h2><h3>Corecode Global · PLANWAY</h3></div><div class="badge">June 2026</div></div><div class="info-grid"><div class="info-item"><div class="label">Employee Name</div><div class="val">${employee.name}</div></div><div class="info-item"><div class="label">Employee ID</div><div class="val">${employee.id}</div></div><div class="info-item"><div class="label">Designation</div><div class="val">${employee.designation}</div></div><div class="info-item"><div class="label">Pay Period</div><div class="val">01 Jun – 30 Jun 2026</div></div></div><div class="section-title">Earnings</div><div class="row"><span>Basic Salary</span><span>₹${new Intl.NumberFormat("en-IN").format(monthly)}</span></div><div class="row"><span>HRA</span><span>₹${new Intl.NumberFormat("en-IN").format(c.hra)}</span></div><div class="row"><span>Travel Allowance</span><span>₹${new Intl.NumberFormat("en-IN").format(c.travel)}</span></div><div class="row"><span>Medical Allowance</span><span>₹${new Intl.NumberFormat("en-IN").format(c.medical)}</span></div><div class="row"><span>Performance Bonus</span><span>₹${new Intl.NumberFormat("en-IN").format(c.bonus)}</span></div><div class="row total"><span>Gross Earnings</span><span>₹${new Intl.NumberFormat("en-IN").format(c.gross)}</span></div><div class="section-title">Deductions</div><div class="row"><span>Provident Fund (PF)</span><span class="red">−₹${new Intl.NumberFormat("en-IN").format(c.pf)}</span></div><div class="row"><span>Professional Tax</span><span class="red">−₹${new Intl.NumberFormat("en-IN").format(c.profTax)}</span></div><div class="row total"><span>Total Deductions</span><span class="red">−₹${new Intl.NumberFormat("en-IN").format(c.deductions)}</span></div><div class="net-box"><span class="net-label">Net Salary</span><span class="net-val">₹${new Intl.NumberFormat("en-IN").format(c.net)}</span></div></body></html>`);
            win.document.close(); setTimeout(() => { win.focus(); win.print(); }, 400);
          }}>
            <Download size={13} /> Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main Component ──────────────────────────────────────── */
export default function SalaryManagement() {
  const [search, setSearch]       = useState("");
  const [sortAsc, setSortAsc]     = useState(true);
  const [payslipEmployee, setPayslipEmployee] = useState<typeof PAYROLL[0] | null>(null);

  const filtered = PAYROLL
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.department.toLowerCase().includes(search.toLowerCase()) ||
      p.designation.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => sortAsc ? a.base - b.base : b.base - a.base);

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Salary Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Payroll, compensation &amp; payment schedules · Indian Rupees (INR)
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => {
          const win = window.open("", "_blank", "width=900,height=600");
          if (!win) return;
          const rows = PAYROLL.map(p => {
            const m = Math.round(p.base / 12);
            const c = getComponents(m);
            return `<tr><td>${p.id}</td><td>${p.name}</td><td>${p.designation}</td><td>₹${new Intl.NumberFormat("en-IN").format(p.base)}</td><td>₹${new Intl.NumberFormat("en-IN").format(m)}</td><td>₹${new Intl.NumberFormat("en-IN").format(c.net)}</td><td>${p.status}</td></tr>`;
          }).join("");
          win.document.write(`<!DOCTYPE html><html><head><title>Payroll Report — June 2026</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1{font-size:18px;margin-bottom:4px}.sub{font-size:11px;color:#666;margin-bottom:16px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #ddd;padding:7px 10px;text-align:left}th{background:#f5f5f5;font-weight:600}tr:nth-child(even){background:#fafafa}</style></head><body><h1>Payroll Report — June 2026</h1><div class="sub">Total Monthly: ₹${new Intl.NumberFormat("en-IN").format(totalMonthly)} · Exported ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}</div><table><thead><tr><th>ID</th><th>Name</th><th>Designation</th><th>Annual Salary</th><th>Monthly</th><th>Net/Month</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
          win.document.close(); setTimeout(() => { win.focus(); win.print(); }, 400);
        }}>
          <Download size={14} /> Export Payroll
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Monthly Payroll",
            value: inr(totalMonthly),
            sub:   `${inr(totalAnnualPayroll, { compact: true })} annually`,
            icon:  IndianRupee,
            color: "text-green-600",
            bg:    "bg-green-100",
          },
          {
            label: "Avg Monthly Salary",
            value: inr(avgMonthly),
            sub:   `${inr(avgMonthly * 12)} per year`,
            icon:  TrendingUp,
            color: "text-blue-600",
            bg:    "bg-blue-100",
          },
          {
            label: "Paid This Month",
            value: `${paidCount} / ${PAYROLL.length}`,
            sub:   `${PAYROLL.length - paidCount} on leave`,
            icon:  Users,
            color: "text-purple-600",
            bg:    "bg-purple-100",
          },
          {
            label: "Next Pay Date",
            value: "30 Jun 2026",
            sub:   "On time",
            icon:  Clock,
            color: "text-orange-600",
            bg:    "bg-orange-100",
          },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="border shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                  <h3 className="text-lg font-bold mt-1 truncate">{stat.value}</h3>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">{stat.sub}</p>
                </div>
                <div className={`p-2.5 rounded-xl shrink-0 ${stat.bg} ${stat.color}`}>
                  <stat.icon size={18} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b bg-muted/20 py-3 px-5">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold">Employee Salary Records</CardTitle>
            <div className="relative w-56">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search employees…"
                className="pl-9 h-8 text-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="text-xs">Employee</TableHead>
                <TableHead className="text-xs">Designation</TableHead>
                <TableHead
                  className="text-xs cursor-pointer select-none"
                  onClick={() => setSortAsc(s => !s)}
                >
                  <div className="flex items-center gap-1">
                    Annual Salary
                    {sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </div>
                </TableHead>
                <TableHead className="text-xs">Monthly (₹)</TableHead>
                <TableHead className="text-xs">Net / Month</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Next Pay</TableHead>
                <TableHead className="w-20 text-xs">Payslip</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground text-sm">
                    No employees found.
                  </TableCell>
                </TableRow>
              ) : filtered.map((p, i) => {
                const monthly = Math.round(p.base / 12);
                const net     = getComponents(monthly).net;
                return (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b hover:bg-muted/20 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {p.name.split(" ").map(n => n[0]).join("").substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm leading-tight">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground">{p.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{p.designation}</TableCell>
                    <TableCell className="font-bold text-sm tabular-nums">{inr(p.base)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground tabular-nums">{inr(monthly)}</TableCell>
                    <TableCell className="text-sm font-semibold text-green-700 tabular-nums">{inr(net)}</TableCell>
                    <TableCell>
                      <Badge className={p.paid
                        ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200"
                        : "bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200"
                      }>
                        {p.paid ? "Paid" : "On Leave"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.nextPay}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs px-2 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => setPayslipEmployee(p)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="px-5 py-3 border-t bg-muted/10 flex justify-between items-center text-xs text-muted-foreground">
          <span>Showing {filtered.length} of {PAYROLL.length} employees</span>
          <span className="font-semibold">
            Total Monthly: <span className="text-foreground">{inr(totalMonthly)}</span>
          </span>
        </div>
      </Card>

      {/* Payslip Dialog */}
      <PayslipDialog
        employee={payslipEmployee}
        open={!!payslipEmployee}
        onClose={() => setPayslipEmployee(null)}
      />
    </div>
  );
}
