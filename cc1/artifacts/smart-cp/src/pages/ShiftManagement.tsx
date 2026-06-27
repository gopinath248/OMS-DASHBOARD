import { Clock, Sun, Moon, Sunrise } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { shifts as initialShifts } from "@/data/mockData";

const SHIFT_TYPES = ["Morning", "General", "Evening", "Night", "Weekend"];

export default function ShiftManagement() {
  const [shifts, setShifts] = useState(initialShifts);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ internName: "", currentShift: "General", requestedShift: "Morning", reason: "", effectiveDate: "" });

  const approve = (id: string) => setShifts(prev => prev.map(s => s.id === id ? { ...s, status: "Approved" } : s));
  const reject = (id: string) => setShifts(prev => prev.map(s => s.id === id ? { ...s, status: "Rejected" } : s));

  const handleSubmit = () => {
    if (!form.internName || !form.reason) return;
    const newShift = {
      id: `SHF${String(shifts.length + 1).padStart(3, "0")}`,
      internName: form.internName,
      currentShift: form.currentShift,
      requestedShift: form.requestedShift,
      effectiveDate: form.effectiveDate || new Date().toISOString().split("T")[0],
      reason: form.reason,
      status: "Pending",
    };
    setShifts([newShift, ...shifts]);
    setForm({ internName: "", currentShift: "General", requestedShift: "Morning", reason: "", effectiveDate: "" });
    setDialogOpen(false);
  };

  const shiftCounts = {
    Morning: shifts.filter(s => s.currentShift === "Morning").length + 45,
    General: shifts.filter(s => s.currentShift === "General").length + 120,
    Evening: shifts.filter(s => s.currentShift === "Evening").length + 35,
    Night: shifts.filter(s => s.currentShift === "Night").length + 15,
  };

  const statusColor = (status: string) => {
    if (status === "Approved") return "text-green-600 border-green-200 bg-green-50";
    if (status === "Rejected") return "text-red-600 border-red-200 bg-red-50";
    return "text-orange-600 border-orange-200 bg-orange-50";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shift Management</h1>
          <p className="text-muted-foreground mt-1">Manage intern schedules and shift change requests.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-request-shift">Request Shift Change</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Request Shift Change</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Intern Name <span className="text-destructive">*</span></Label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Enter student name..."
                  value={form.internName}
                  onChange={e => setForm({ ...form, internName: e.target.value })}
                  data-testid="input-shift-student"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Current Shift</Label>
                  <Select value={form.currentShift} onValueChange={v => setForm({ ...form, currentShift: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SHIFT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Requested Shift</Label>
                  <Select value={form.requestedShift} onValueChange={v => setForm({ ...form, requestedShift: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SHIFT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Effective Date</Label>
                <input
                  type="date"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.effectiveDate}
                  onChange={e => setForm({ ...form, effectiveDate: e.target.value })}
                  data-testid="input-shift-date"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Reason <span className="text-destructive">*</span></Label>
                <Textarea
                  placeholder="Explain the reason for shift change..."
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  rows={3}
                  data-testid="textarea-shift-reason"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!form.internName || !form.reason} data-testid="button-submit-shift">
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Morning Shift", count: shiftCounts.Morning, icon: Sunrise, color: "text-amber-500", bg: "bg-amber-100" },
          { title: "General Shift", count: shiftCounts.General, icon: Sun, color: "text-blue-500", bg: "bg-blue-100" },
          { title: "Evening Shift", count: shiftCounts.Evening, icon: Clock, color: "text-orange-500", bg: "bg-orange-100" },
          { title: "Night Shift", count: shiftCounts.Night, icon: Moon, color: "text-indigo-500", bg: "bg-indigo-100" },
        ].map((item, i) => (
          <Card key={i}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{item.title}</p>
                <h3 className="text-2xl font-bold mt-1">{item.count}</h3>
              </div>
              <div className={`p-3 rounded-full ${item.bg} ${item.color}`}>
                <item.icon size={20} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <div className="p-4 sm:p-6 border-b flex items-center justify-between">
          <h2 className="font-semibold text-lg">Shift Change Requests</h2>
          <Badge variant="secondary">{shifts.length} total</Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Current Shift</TableHead>
                <TableHead>Requested Shift</TableHead>
                <TableHead>Effective Date</TableHead>
                <TableHead className="max-w-[200px]">Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((shift) => (
                <TableRow key={shift.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{shift.internName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">{shift.currentShift}</Badge>
                  </TableCell>
                  <TableCell className="font-medium text-primary">{shift.requestedShift}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{shift.effectiveDate}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate text-muted-foreground">{shift.reason}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColor(shift.status)}>
                      {shift.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {shift.status === "Pending" ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => approve(shift.id)}
                          data-testid={`button-approve-${shift.id}`}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => reject(shift.id)}
                          data-testid={`button-reject-${shift.id}`}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground px-2">
                        {shift.status === "Approved" ? "Approved" : "Rejected"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
