import { useState } from "react";
import { Search, CheckCircle2, XCircle, Clock, Eye, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { leaveRequests as initialLeaveRequests } from "@/data/mockData";

type BaseLeave = typeof initialLeaveRequests[0];
type Leave = BaseLeave & { rejectionReason?: string };

const PRESET_REASONS = [
  "Insufficient leave balance.",
  "Staff shortage during requested dates.",
  "Invalid or missing supporting documents.",
  "Leave request overlaps with examination period.",
  "Request submitted after the deadline.",
  "Other (Custom Reason)",
];

const INITIAL_LIST: Leave[] = initialLeaveRequests.map(l => ({
  ...l,
  rejectionReason: l.status === "Rejected"
    ? (l.id === "LR003" ? "Invalid or missing supporting documents." :
       l.id === "LR010" ? "Request submitted after the deadline." : undefined)
    : undefined,
}));

export default function LeaveManagement() {
  const { toast } = useToast();
  const [leaveList, setLeaveList] = useState<Leave[]>(INITIAL_LIST);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [viewLeave, setViewLeave] = useState<Leave | null>(null);

  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; leave: Leave | null }>({ open: false, leave: null });
  const [selectedPreset, setSelectedPreset] = useState("");
  const [customReason, setCustomReason] = useState("");

  const pending  = leaveList.filter(l => l.status === "Pending").length;
  const approved = leaveList.filter(l => l.status === "Approved").length;
  const rejected = leaveList.filter(l => l.status === "Rejected").length;
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayLeaves = leaveList.filter(l =>
    l.status === "Approved" && l.startDate <= todayStr && l.endDate >= todayStr
  ).length;

  const handleApprove = (id: string, name: string) => {
    setLeaveList(prev => prev.map(l => l.id === id ? { ...l, status: "Approved" } : l));
    setViewLeave(prev => prev?.id === id ? { ...prev, status: "Approved" } : prev);
    toast({ title: "Leave Approved", description: `${name}'s leave request has been approved.` });
  };

  const openRejectDialog = (leave: Leave) => {
    setRejectDialog({ open: true, leave });
    setSelectedPreset("");
    setCustomReason("");
  };

  const effectiveReason = () => {
    if (!selectedPreset) return "";
    if (selectedPreset === "Other (Custom Reason)") return customReason.trim();
    return selectedPreset;
  };

  const handleRejectConfirm = () => {
    const reason = effectiveReason();
    if (!reason) return;
    const { leave } = rejectDialog;
    if (!leave) return;

    setLeaveList(prev =>
      prev.map(l => l.id === leave.id ? { ...l, status: "Rejected", rejectionReason: reason } : l)
    );
    setViewLeave(prev =>
      prev?.id === leave.id ? { ...prev, status: "Rejected", rejectionReason: reason } : prev
    );
    setRejectDialog({ open: false, leave: null });
    setSelectedPreset("");
    setCustomReason("");
    toast({
      title: "Leave Rejected",
      description: `${leave.internName}'s leave has been rejected.`,
      variant: "destructive",
    });
  };

  const filtered = leaveList.filter(l => {
    const matchSearch = l.internName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "All" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusBadgeClass = (status: string) =>
    status === "Approved" ? "text-green-600 border-green-200 bg-green-50" :
    status === "Rejected" ? "text-red-600 border-red-200 bg-red-50" :
    "text-orange-600 border-orange-200 bg-orange-50";

  const isReasonValid = selectedPreset === "Other (Custom Reason)"
    ? customReason.trim().length > 0
    : selectedPreset.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Pending Requests", count: pending,  color: "text-orange-500", bg: "bg-orange-100", icon: Clock },
          { label: "Approved",         count: approved, color: "text-green-500",  bg: "bg-green-100",  icon: CheckCircle2 },
          { label: "Rejected",         count: rejected, color: "text-red-500",    bg: "bg-red-100",    icon: XCircle },
          { label: "Today's Active",   count: todayLeaves, color: "text-blue-500", bg: "bg-blue-100",  icon: Clock },
        ].map((stat, i) => (
          <Card key={i}>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <h3 className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.count}</h3>
              </div>
              <div className={`p-3 rounded-full ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Employees..."
              className="pl-9"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No leave requests found.
                  </TableCell>
                </TableRow>
              ) : filtered.map(leave => (
                <TableRow key={leave.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div>
                      <p className="font-medium">{leave.internName}</p>
                      {leave.status === "Rejected" && leave.rejectionReason && (
                        <p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
                          <AlertTriangle size={10} /> Rejected: {leave.rejectionReason}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">{leave.type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {leave.startDate} → {leave.endDate}
                  </TableCell>
                  <TableCell className="text-sm">{leave.duration} day(s)</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusBadgeClass(leave.status)}>
                      {leave.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {leave.status === "Pending" && (
                        <>
                          <Button
                            size="sm" variant="outline"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleApprove(leave.id, leave.internName)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => openRejectDialog(leave)}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" className="gap-1" onClick={() => setViewLeave(leave)}>
                        <Eye size={14} /> View
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="p-3 border-t text-sm text-muted-foreground text-right px-6">
          Showing {filtered.length} of {leaveList.length} requests
        </div>
      </div>

      {/* View Leave Dialog */}
      <Dialog open={!!viewLeave} onOpenChange={open => !open && setViewLeave(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
            <DialogDescription>
              Full details for {viewLeave?.internName}'s leave application.
            </DialogDescription>
          </DialogHeader>
          {viewLeave && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">Intern Name</span>
                  <span className="font-semibold">{viewLeave.internName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Leave Type</span>
                  <span className="font-medium">{viewLeave.type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Duration</span>
                  <span>{viewLeave.startDate} to {viewLeave.endDate} ({viewLeave.duration} days)</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Status</span>
                  <Badge variant="outline" className={statusBadgeClass(viewLeave.status)}>{viewLeave.status}</Badge>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block mb-1">Reason for Leave</span>
                  <p className="bg-muted/50 p-3 rounded-md leading-relaxed">{viewLeave.reason}</p>
                </div>
                {viewLeave.status === "Rejected" && viewLeave.rejectionReason && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground block mb-1">Rejection Reason</span>
                    <div className="bg-red-50 border border-red-100 p-3 rounded-md flex items-start gap-2">
                      <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                      <p className="text-red-700 text-sm">{viewLeave.rejectionReason}</p>
                    </div>
                  </div>
                )}
              </div>
              {viewLeave.status === "Pending" && (
                <DialogFooter>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => { setViewLeave(null); openRejectDialog(viewLeave); }}
                  >
                    Reject
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleApprove(viewLeave.id, viewLeave.internName)}
                  >
                    Approve
                  </Button>
                </DialogFooter>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Reason Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={open => { if (!open) setRejectDialog({ open: false, leave: null }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle size={18} /> Reject Leave Request
            </DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting <strong>{rejectDialog.leave?.internName}</strong>'s leave request. A reason is mandatory.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Rejection Reason <span className="text-destructive">*</span></Label>
              <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason…" />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_REASONS.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPreset === "Other (Custom Reason)" && (
              <div className="space-y-1.5">
                <Label>Custom Reason <span className="text-destructive">*</span></Label>
                <Textarea
                  placeholder="Enter your custom reason here…"
                  rows={3}
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  className={!customReason.trim() ? "border-destructive" : ""}
                />
                {!customReason.trim() && (
                  <p className="text-xs text-destructive">Please enter a reason.</p>
                )}
              </div>
            )}

            {selectedPreset && selectedPreset !== "Other (Custom Reason)" && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-md text-sm text-red-700">
                <strong>Reason to be recorded:</strong> {selectedPreset}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, leave: null })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={!isReasonValid}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
