import { useState, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, Plus, X, Clock, MapPin, Edit2, Trash2,
  CalendarDays, List, LayoutGrid, Calendar as CalendarIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { events as initialMockEvents, students, staff } from "@/data/mockData";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type CalendarEvent = {
  id: string; date: string; title: string; type: string;
  description?: string; time?: string; session?: string;
  priority?: string; assignedMembers?: string[]; location?: string;
};

type EventForm = {
  title: string; description: string; date: string; time: string;
  session: string; priority: string; assignedMembers: string[]; location: string; type: string;
};

type ViewMode = "month" | "week" | "agenda";

const EMPTY_FORM: EventForm = {
  title: "", description: "", date: "", time: "",
  session: "", priority: "Medium", assignedMembers: [], location: "", type: "Event",
};

const EVENT_TYPES = ["Deadline", "Meeting", "Leave", "Event", "Sprint", "task"];
const PRIORITIES  = ["Critical", "High", "Medium", "Low"];
const SESSIONS    = ["Forenoon", "Afternoon"];

const EVENT_COLORS: Record<string, string> = {
  Deadline: "bg-red-100 text-red-700 border-red-200",
  Shift:    "bg-orange-100 text-orange-700 border-orange-200",
  Meeting:  "bg-purple-100 text-purple-700 border-purple-200",
  Leave:    "bg-yellow-100 text-yellow-700 border-yellow-200",
  Event:    "bg-green-100 text-green-700 border-green-200",
  Sprint:   "bg-blue-100 text-blue-700 border-blue-200",
  task:     "bg-sky-100 text-sky-700 border-sky-200",
};

const DOT_COLORS: Record<string, string> = {
  Deadline: "bg-red-500", Shift: "bg-orange-500", Meeting: "bg-purple-500",
  Leave: "bg-yellow-500", Event: "bg-green-500", Sprint: "bg-blue-500", task: "bg-sky-500",
};

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const ALL_MEMBERS = [
  ...students.map(s => ({ id: s.id, name: s.name, role: "Intern" as const })),
  ...staff.map(s => ({ id: s.id, name: s.name, role: "Employee" as const })),
];

// ── Member Multi-Select ───────────────────────────────────────────────────
function MemberMultiSelect({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [search, setSearch] = useState("");
  const filtered = ALL_MEMBERS.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
  const toggle = (name: string) =>
    onChange(selected.includes(name) ? selected.filter(n => n !== name) : [...selected, name]);

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map(name => (
            <span key={name} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
              {name}
              <button type="button" onClick={() => onChange(selected.filter(n => n !== name))} className="hover:text-primary/60"><X size={9} /></button>
            </span>
          ))}
        </div>
      )}
      {selected.length === 0 && <p className="text-xs text-muted-foreground">No members selected yet.</p>}
      <div className="border rounded-md overflow-hidden">
        <div className="px-2 py-1.5 border-b bg-muted/30">
          <input className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground" placeholder="Search members…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="max-h-36 overflow-y-auto">
          {filtered.map(m => (
            <div key={m.id} className={cn("flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/40 text-sm transition-colors", selected.includes(m.name) && "bg-primary/5")} onClick={() => toggle(m.name)}>
              <div className={cn("w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors", selected.includes(m.name) ? "bg-primary border-primary" : "border-gray-300")}>
                {selected.includes(m.name) && <span className="text-white text-[9px] font-bold leading-none">✓</span>}
              </div>
              <span className="flex-1 font-medium">{m.name}</span>
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded", m.role === "Employee" ? "bg-indigo-100 text-indigo-600" : "bg-green-100 text-green-600")}>{m.role}</span>
            </div>
          ))}
          {filtered.length === 0 && <div className="p-3 text-center text-xs text-muted-foreground">No members found</div>}
        </div>
      </div>
    </div>
  );
}

// ── Add / Edit Dialog ─────────────────────────────────────────────────────
function AddEventDialog({ open, onClose, onSave, editingEvent, prefilledDate }: {
  open: boolean; onClose: () => void; onSave: (form: EventForm) => void; editingEvent: CalendarEvent | null; prefilledDate?: string;
}) {
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setForm(editingEvent ? {
        title: editingEvent.title, description: editingEvent.description ?? "",
        date: editingEvent.date, time: editingEvent.time ?? "",
        session: editingEvent.session ?? "", priority: editingEvent.priority ?? "Medium",
        assignedMembers: editingEvent.assignedMembers ?? [], location: editingEvent.location ?? "",
        type: editingEvent.type,
      } : { ...EMPTY_FORM, date: prefilledDate ?? "" });
    }
  }, [open, editingEvent, prefilledDate]);

  const handleSave = () => {
    if (!form.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (!form.date) { toast({ title: "Date is required", variant: "destructive" }); return; }
    if (!form.time) { toast({ title: "Time is required", variant: "destructive" }); return; }
    if (!form.session) { toast({ title: "Session is required", variant: "destructive" }); return; }
    onSave(form); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus size={18} />{editingEvent ? "Edit Event" : "Create New Event"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Event Title <span className="text-destructive">*</span></Label>
            <Input placeholder="e.g. Team Standup" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea placeholder="Brief description…" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Date <span className="text-destructive">*</span></Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Time <span className="text-destructive">*</span></Label><Input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Session <span className="text-destructive">*</span></Label>
              <Select value={form.session} onValueChange={v => setForm(f => ({ ...f, session: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{SESSIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Event Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Location</Label><Input placeholder="e.g. Room 204" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Assigned Members</Label>
            <MemberMultiSelect selected={form.assignedMembers} onChange={v => setForm(f => ({ ...f, assignedMembers: v }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{editingEvent ? "Update Event" : "Create Event"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Event Detail Dialog ────────────────────────────────────────────────────
function EventDetailDialog({ event, open, onClose, onEdit, onDelete }: {
  event: CalendarEvent | null; open: boolean; onClose: () => void; onEdit: () => void; onDelete: () => void;
}) {
  if (!event) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={cn("text-xs", EVENT_COLORS[event.type] ?? "")}>{event.type}</Badge>
            {event.priority && <Badge variant="outline" className="text-xs">{event.priority}</Badge>}
            {event.session  && <Badge variant="outline" className="text-xs">{event.session}</Badge>}
          </div>
          <DialogTitle className="text-lg mt-1">{event.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <Clock size={14} className="text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{event.date}</p>
                {event.time && <p className="text-xs text-muted-foreground">{event.time}{event.session ? ` · ${event.session}` : ""}</p>}
              </div>
            </div>
            {event.location && (
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-muted-foreground mt-0.5 shrink-0" />
                <p className="font-medium">{event.location}</p>
              </div>
            )}
          </div>
          {event.assignedMembers && event.assignedMembers.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Assigned Members</p>
              <div className="flex flex-wrap gap-1">
                {event.assignedMembers.map(m => <span key={m} className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">{m}</span>)}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={onDelete}><Trash2 size={13} /> Delete</Button>
          <Button size="sm" className="gap-1.5" onClick={onEdit}><Edit2 size={13} /> Edit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Week View ─────────────────────────────────────────────────────────────
function WeekView({ currentDate, events, onEventClick }: {
  currentDate: Date; events: CalendarEvent[]; onEventClick: (e: CalendarEvent) => void;
}) {
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(startOfWeek); d.setDate(d.getDate() + i); return d; });
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const today = new Date().toDateString();

  const eventsForDay = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    return events.filter(e => e.date === dateStr);
  };

  return (
    <div className="overflow-auto max-h-[520px] border rounded-xl">
      {/* Header */}
      <div className="grid grid-cols-8 border-b bg-muted/20 sticky top-0 z-10">
        <div className="p-2 text-xs text-muted-foreground text-center border-r">Time</div>
        {days.map(d => (
          <div key={d.toISOString()} className={cn("p-2 text-center border-r last:border-r-0", d.toDateString() === today && "bg-primary/5")}>
            <p className="text-xs text-muted-foreground">{DAY_NAMES[d.getDay()]}</p>
            <p className={cn("text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center mx-auto", d.toDateString() === today ? "bg-primary text-primary-foreground" : "text-foreground")}>{d.getDate()}</p>
          </div>
        ))}
      </div>
      {/* Hourly rows */}
      {hours.map(h => (
        <div key={h} className="grid grid-cols-8 border-b min-h-[44px]">
          <div className="border-r px-2 py-1 text-[10px] text-muted-foreground text-right shrink-0">{h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h-12} PM`}</div>
          {days.map(d => {
            const dayEvts = eventsForDay(d).filter(e => {
              if (!e.time) return h === 9;
              const evtH = parseInt(e.time.split(":")[0]);
              return evtH === h;
            });
            return (
              <div key={d.toISOString()} className={cn("border-r last:border-r-0 p-0.5 space-y-0.5", d.toDateString() === today && "bg-primary/3")}>
                {dayEvts.map(evt => (
                  <div key={evt.id} className={cn("text-[9px] font-medium px-1 py-0.5 rounded cursor-pointer truncate border", EVENT_COLORS[evt.type] ?? "bg-blue-100 text-blue-700")} onClick={() => onEventClick(evt)}>
                    {evt.title}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Agenda View ───────────────────────────────────────────────────────────
function AgendaView({ events, onEventClick }: { events: CalendarEvent[]; onEventClick: (e: CalendarEvent) => void }) {
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const grouped: Record<string, CalendarEvent[]> = {};
  sorted.forEach(e => { if (!grouped[e.date]) grouped[e.date] = []; grouped[e.date].push(e); });

  if (Object.keys(grouped).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <CalendarDays size={40} className="mb-3 opacity-30" />
        <p>No events to show.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1">
      {Object.entries(grouped).map(([date, evts]) => {
        const d = new Date(date);
        const isToday = d.toDateString() === new Date().toDateString();
        return (
          <div key={date}>
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("w-10 h-10 rounded-full flex flex-col items-center justify-center text-xs font-bold shrink-0", isToday ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                <span className="text-[8px] uppercase">{d.toLocaleString("default", { month: "short" })}</span>
                <span className="text-sm leading-none">{d.getDate()}</span>
              </div>
              <div>
                <p className="font-semibold text-sm">{d.toLocaleString("default", { weekday: "long", month: "long", day: "numeric" })}</p>
                {isToday && <span className="text-[10px] text-primary font-bold">Today</span>}
              </div>
            </div>
            <div className="ml-13 pl-3 border-l-2 border-muted space-y-2 ml-5">
              {evts.map(evt => (
                <div key={evt.id} className={cn("flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:shadow-sm transition-all", EVENT_COLORS[evt.type] ?? "bg-muted/30")} onClick={() => onEventClick(evt)}>
                  <div className={cn("w-2 h-full rounded-full self-stretch min-h-[16px]", DOT_COLORS[evt.type] ?? "bg-blue-500")} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{evt.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {evt.time && <span className="text-[10px] opacity-80">{evt.time}</span>}
                      {evt.location && <span className="text-[10px] opacity-70 flex items-center gap-0.5"><MapPin size={9} />{evt.location}</span>}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{evt.type}</Badge>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Calendar Page ────────────────────────────────────────────────────
export default function CalendarPage() {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [calEvents, setCalEvents] = useState<CalendarEvent[]>(
    initialMockEvents.map((e, i) => ({ ...e, id: `EVT${String(i + 1).padStart(3, "0")}` }))
  );
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [prefilledDate, setPrefilledDate] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return calEvents.filter(e => e.date === dateStr);
  };

  const monthEvents = calEvents.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const nav = (delta: number) => {
    if (viewMode === "week") {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + delta * 7);
      setCurrentDate(d);
    } else {
      setCurrentDate(new Date(year, month + delta, 1));
    }
  };

  const handleSaveEvent = (form: EventForm) => {
    if (editingEvent) {
      setCalEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, ...form } : e));
      toast({ title: "Event updated", description: `"${form.title}" has been updated.` });
    } else {
      setCalEvents(prev => [...prev, { id: `EVT${Date.now()}`, ...form }]);
      toast({ title: "Event created", description: `"${form.title}" added to calendar.` });
    }
    setEditingEvent(null);
  };

  const handleDeleteEvent = () => {
    if (!selectedEvent) return;
    setCalEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
    toast({ title: "Event deleted", description: `"${selectedEvent.title}" removed.`, variant: "destructive" });
    setShowDetailDialog(false);
    setSelectedEvent(null);
  };

  const handleEventClick = (evt: CalendarEvent) => { setSelectedEvent(evt); setShowDetailDialog(true); };

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setEditingEvent(null);
    setPrefilledDate(dateStr);
    setShowAddDialog(true);
  };

  const VIEW_TABS: { id: ViewMode; label: string; icon: React.ElementType }[] = [
    { id: "month",  label: "Month",  icon: LayoutGrid },
    { id: "week",   label: "Week",   icon: CalendarIcon },
    { id: "agenda", label: "Agenda", icon: List },
  ];

  const headerLabel = viewMode === "week"
    ? (() => { const s = new Date(currentDate); s.setDate(s.getDate()-s.getDay()); const e = new Date(s); e.setDate(e.getDate()+6); return `${s.toLocaleString("default",{month:"short",day:"numeric"})} – ${e.toLocaleString("default",{month:"short",day:"numeric",year:"numeric"})}`; })()
    : currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><CalendarDays size={26} className="text-primary" /> Calendar</h1>
        </div>
        <Button className="gap-2" onClick={() => { setEditingEvent(null); setShowAddDialog(true); }}>
          <Plus size={16} /> Create Event
        </Button>
      </div>

      {/* Toolbar */}
      <Card className="shadow-sm">
        <CardContent className="p-3 flex flex-wrap items-center gap-3 justify-between">
          {/* View mode tabs */}
          <div className="flex rounded-xl border bg-muted/30 p-0.5 gap-0.5">
            {VIEW_TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  viewMode === id ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>Month</Button>
            <div className="flex border rounded-lg overflow-hidden">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => nav(-1)}><ChevronLeft size={15} /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => nav(1)}><ChevronRight size={15} /></Button>
            </div>
            <span className="font-semibold text-sm min-w-[180px] text-center">{headerLabel}</span>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(DOT_COLORS).map(([type, dot]) => (
              <span key={type} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className={cn("w-2 h-2 rounded-full", dot)} /> {type}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Main Calendar Area */}
        <div className="xl:col-span-3">
          {/* Month View */}
          {viewMode === "month" && (
            <Card className="shadow-sm overflow-hidden">
              <div className="grid grid-cols-7 border-b bg-muted/10">
                {DAY_NAMES.map(d => (
                  <div key={d} className="p-2.5 text-center text-xs font-semibold text-muted-foreground border-r last:border-r-0">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 auto-rows-[minmax(88px,1fr)]">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`blank-${i}`} className="border-r border-b bg-muted/5 p-1" />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const dayEvents = getEventsForDay(day);
                  const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                  return (
                    <div key={day} className={cn("border-r border-b p-1.5 transition-colors hover:bg-muted/10 group cursor-pointer", isToday && "bg-primary/5")} onClick={() => handleDayClick(day)}>
                      <div className={cn("text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1", isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map(evt => (
                          <div key={evt.id} className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded cursor-pointer truncate border flex items-center gap-1", EVENT_COLORS[evt.type] ?? "bg-blue-100 text-blue-700 border-blue-200")} onClick={e => { e.stopPropagation(); handleEventClick(evt); }}>
                            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", DOT_COLORS[evt.type] ?? "bg-blue-500")} />
                            {evt.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <p className="text-[9px] text-muted-foreground px-1">+{dayEvents.length - 3} more</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Week View */}
          {viewMode === "week" && (
            <Card className="shadow-sm overflow-hidden">
              <WeekView currentDate={currentDate} events={calEvents} onEventClick={handleEventClick} />
            </Card>
          )}

          {/* Agenda View */}
          {viewMode === "agenda" && (
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <AgendaView events={calEvents} onEventClick={handleEventClick} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: Mini calendar + Upcoming events */}
        <div className="space-y-4">
          {/* Upcoming events */}
          <Card className="shadow-sm">
            <div className="p-4 border-b bg-muted/20">
              <h3 className="font-semibold text-sm">Upcoming Events</h3>
              <p className="text-xs text-muted-foreground">{MONTH_NAMES[month]} {year}</p>
            </div>
            <CardContent className="p-3 space-y-2">
              {monthEvents.slice(0, 6).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No events this month</p>
              ) : monthEvents.slice(0, 6).map(evt => (
                <div key={evt.id} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => handleEventClick(evt)}>
                  <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", DOT_COLORS[evt.type] ?? "bg-blue-500")} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{evt.title}</p>
                    <p className="text-[10px] text-muted-foreground">{evt.date}{evt.time ? ` · ${evt.time}` : ""}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Filter legend */}
          <Card className="shadow-sm">
            <div className="p-4 border-b bg-muted/20"><h3 className="font-semibold text-sm">Calendar Filters</h3></div>
            <CardContent className="p-3 space-y-2">
              {Object.entries(DOT_COLORS).map(([type, dot]) => (
                <label key={type} className="flex items-center gap-2.5 cursor-pointer group">
                  <div className={cn("w-3 h-3 rounded-sm", dot.replace("bg-", "bg-").replace("-500", "-400"))} />
                  <span className="text-xs font-medium group-hover:text-foreground text-muted-foreground capitalize">{type}</span>
                </label>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <AddEventDialog open={showAddDialog} onClose={() => { setShowAddDialog(false); setEditingEvent(null); setPrefilledDate(""); }} onSave={handleSaveEvent} editingEvent={editingEvent} prefilledDate={prefilledDate} />
      <EventDetailDialog event={selectedEvent} open={showDetailDialog} onClose={() => setShowDetailDialog(false)}
        onEdit={() => { setShowDetailDialog(false); setEditingEvent(selectedEvent); setShowAddDialog(true); }}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
}
