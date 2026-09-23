import { useState } from "react";
import { Upload, CalendarIcon, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiJson } from "@/lib/api";

const LEAVE_BALANCES: Record<string, { label: string; remaining: number; color: string; bg: string; border: string }> = {
  Casual: { label: "Casual Leave", remaining: 5, color: "text-blue-900", bg: "bg-blue-50", border: "border-blue-100" },
  Sick: { label: "Sick Leave", remaining: 3, color: "text-orange-900", bg: "bg-orange-50", border: "border-orange-100" },
  Emergency: { label: "Emergency Leave", remaining: 2, color: "text-purple-900", bg: "bg-purple-50", border: "border-purple-100" },
  Personal: { label: "Personal Leave", remaining: 4, color: "text-green-900", bg: "bg-green-50", border: "border-green-100" },
};

export default function ApplyLeave() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savedRequest, setSavedRequest] = useState<{ id: string; status: string } | null>(null);
  const [form, setForm] = useState({
    type: "",
    startDate: "",
    endDate: "",
    reason: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.type) e.type = "Please select a leave type.";
    if (!form.startDate) e.startDate = "Start date is required.";
    if (!form.endDate) e.endDate = "End date is required.";
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      e.endDate = "End date must be after start date.";
    if (!form.reason.trim()) e.reason = "Please provide a reason.";
    else if (form.reason.trim().length < 15) e.reason = "Reason must be at least 15 characters.";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    try {
      const payload = await apiJson<{ leaveRequest: { id: string; status: string } }>("/leave-requests", {
        method: "POST",
        body: JSON.stringify({
          type: form.type,
          startDate: form.startDate,
          endDate: form.endDate,
          reason: form.reason.trim(),
        }),
      });
      setSavedRequest(payload.leaveRequest);
      setSubmitted(true);
      toast({
        title: "Leave Request Submitted",
        description: "Your request has been sent to your manager for approval.",
      });
    } catch (error) {
      toast({
        title: "Unable to Submit Leave",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Apply for Leave</h1>
          <p className="text-muted-foreground mt-1">Submit a new leave request to your manager.</p>
        </div>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-10 pb-10 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="text-green-600 h-9 w-9" />
            </div>
            <h2 className="text-2xl font-bold text-green-900">Request Submitted!</h2>
            <p className="text-green-700 max-w-sm">
              Your <strong>{form.type}</strong> leave request from{" "}
              <strong>{form.startDate}</strong> to <strong>{form.endDate}</strong> has been submitted and is pending approval.
            </p>
            {savedRequest && (
              <p className="text-xs text-green-700">Request #{savedRequest.id} is currently {savedRequest.status}.</p>
            )}
            <p className="text-sm text-green-600">Your manager will review your request shortly. You'll be notified once a decision is made.</p>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => { setSubmitted(false); setForm({ type: "", startDate: "", endDate: "", reason: "" }); }}>
                Submit Another
              </Button>
              <Button onClick={() => setLocation("/intern/dashboard")}>
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Apply for Leave</h1>
        <p className="text-muted-foreground mt-1">Submit a new leave request to your manager.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(LEAVE_BALANCES).map(([key, info]) => (
          <div
            key={key}
            className={`${info.bg} border ${info.border} ${info.color} rounded-lg p-3 text-center cursor-pointer transition-all hover:shadow-sm ${form.type === key ? "ring-2 ring-primary" : ""}`}
            onClick={() => setForm(f => ({ ...f, type: key }))}
          >
            <p className="text-xs font-medium mb-1">{info.label}</p>
            <p className="text-xl font-bold">{info.remaining} <span className="text-xs font-normal opacity-70">left</span></p>
          </div>
        ))}
      </div>

      <Card>
        <form onSubmit={handleSubmit} noValidate>
          <CardHeader>
            <CardTitle>Leave Application Form</CardTitle>
            <CardDescription>All fields marked with * are required.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="type">Leave Type *</Label>
              <Select value={form.type} onValueChange={v => { setForm(f => ({ ...f, type: v })); setErrors(e => ({ ...e, type: "" })); }}>
                <SelectTrigger id="type" className={errors.type ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Casual">Casual Leave</SelectItem>
                  <SelectItem value="Sick">Sick Leave</SelectItem>
                  <SelectItem value="Emergency">Emergency Leave</SelectItem>
                  <SelectItem value="Personal">Personal Leave</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && <p className="text-xs text-destructive">{errors.type}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="start">Start Date *</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    id="start"
                    className={`pl-10 ${errors.startDate ? "border-destructive" : ""}`}
                    value={form.startDate}
                    onChange={e => { setForm(f => ({ ...f, startDate: e.target.value })); setErrors(ev => ({ ...ev, startDate: "" })); }}
                    min={new Date().toISOString().split("T")[0]}
                  />
                </div>
                {errors.startDate && <p className="text-xs text-destructive">{errors.startDate}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end">End Date *</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    id="end"
                    className={`pl-10 ${errors.endDate ? "border-destructive" : ""}`}
                    value={form.endDate}
                    onChange={e => { setForm(f => ({ ...f, endDate: e.target.value })); setErrors(ev => ({ ...ev, endDate: "" })); }}
                    min={form.startDate || new Date().toISOString().split("T")[0]}
                  />
                </div>
                {errors.endDate && <p className="text-xs text-destructive">{errors.endDate}</p>}
              </div>
            </div>

            {form.startDate && form.endDate && form.endDate >= form.startDate && (
              <div className="bg-muted/50 border rounded-lg px-4 py-3 text-sm text-muted-foreground">
                Duration: <span className="font-semibold text-foreground">
                  {Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} day(s)
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Please provide a detailed reason for your leave request (minimum 15 characters)..."
                className={`min-h-[110px] resize-none ${errors.reason ? "border-destructive" : ""}`}
                value={form.reason}
                onChange={e => { setForm(f => ({ ...f, reason: e.target.value })); setErrors(ev => ({ ...ev, reason: "" })); }}
              />
              <div className="flex justify-between">
                {errors.reason ? (
                  <p className="text-xs text-destructive">{errors.reason}</p>
                ) : (
                  <span />
                )}
                <p className="text-xs text-muted-foreground ml-auto">{form.reason.length} chars</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="attachment">Supporting Document (Optional)</Label>
              <label
                htmlFor="attachment"
                className="border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors block"
              >
                <Upload className="h-7 w-7 text-muted-foreground mb-2" />
                <p className="text-sm font-medium">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground mt-1">SVG, PNG, JPG or PDF (max. 2MB)</p>
                <Input type="file" id="attachment" className="hidden" accept=".svg,.png,.jpg,.jpeg,.pdf" />
              </label>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t p-6 bg-muted/20">
            <Button variant="outline" type="button" onClick={() => setLocation("/intern/dashboard")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
