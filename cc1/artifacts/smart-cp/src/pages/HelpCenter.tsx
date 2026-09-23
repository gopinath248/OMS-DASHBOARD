import { useEffect, useState, useRef } from "react";
import {
  Search, Book, MessageCircle, Video, LifeBuoy, FileText,
  ChevronRight, CheckCircle2, Send, BookOpen, HelpCircle,
  Lightbulb, AlertTriangle, Zap, Clock, Phone, Mail,
  X, Play, ExternalLink, Tag, Filter, Eye, Paperclip,
  Ticket, ArrowLeft, Hash, CalendarDays, ChevronDown, ChevronUp,
  GraduationCap, ClipboardList, BarChart2, CalendarIcon, Bell, Settings2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { getAuthSession } from "@/lib/auth";

// ─── Data ────────────────────────────────────────────────────────────────────

const FAQS = [
  { category: "Account", q: "How do I reset my password?", a: "Go to Settings → Security, enter your current password, and set a new one. If you've forgotten it, click 'Forgot Password' on the login page and follow the email instructions." },
  { category: "Leave", q: "How do I apply for leave?", a: "Navigate to 'Apply Leave' in the sidebar. Select your leave type, enter start/end dates, write your reason, and click Submit. Your manager will be notified and will approve or reject the request." },
  { category: "Performance", q: "Where can I view my performance score?", a: "Go to your Intern Dashboard or the Performance Management page. Your score is calculated across 8 metrics: Attendance, Tasks, Communication, Discipline, Learning, Innovation, Leadership, and Collaboration." },
  { category: "Shifts", q: "How do I request a shift change?", a: "Open Shift Management and click 'Request Shift Change'. Choose your preferred shift, set the effective date, and submit a reason. Your Specialist will review within 24 hours." },
  { category: "Reports", q: "Can I export my performance report?", a: "Yes — go to Reports & Analytics, select 'Performance Report', set your date range and department filters, then click the 'Export PDF' button at the top right." },
  { category: "Tasks", q: "How do I update a task status?", a: "Visit Task Management and switch to Kanban view. Drag cards between columns (To Do → In Progress → Review → Completed) to update status. In List view, you can also filter by status." },
  { category: "Notifications", q: "Why am I not receiving notifications?", a: "Check your Notifications page and ensure all categories are toggled on in Settings → Notifications. The bell icon in the top bar always shows the real-time unread count." },
  { category: "Account", q: "How do I update my profile information?", a: "Go to Settings from the sidebar. Update your name, email, department, and profile picture in the Profile section, then click Save Changes." },
  { category: "Leave", q: "What happens after my leave is approved?", a: "You receive a notification in the system. Your attendance record is updated automatically for those days. You can track the status any time in the Leave Management page." },
  { category: "Tasks", q: "Who assigns tasks to me?", a: "Tasks are assigned by your manager or the admin. You'll receive a notification when a new task is assigned. Check the Task Management page for full details and deadlines." },
];

const KB_ARTICLES = [
  { id: 1, title: "Getting Started with Smart CP IMS", category: "Onboarding", tags: ["setup", "login", "dashboard"], views: 234, content: "Learn how to log in, navigate the portal, and set up your profile as a new intern or staff member. This guide walks you through every section of the platform." },
  { id: 2, title: "Understanding Your Performance Score", category: "Performance", tags: ["score", "metrics", "rating"], views: 189, content: "Your performance is scored across 8 metrics: Attendance, Task Completion, Communication, Discipline, Learning, Innovation, Leadership, and Collaboration. Each is weighted equally." },
  { id: 3, title: "Leave Application Process", category: "Leave", tags: ["apply", "approval", "types"], views: 312, content: "Step-by-step guide to applying for casual, sick, personal, or emergency leave. Includes information about approval workflows and leave balance management." },
  { id: 4, title: "Task Management & Kanban Board", category: "Tasks", tags: ["kanban", "status", "priority"], views: 156, content: "How to use the Kanban board to manage your tasks. Learn to move tasks across columns, set priorities, and track deadlines effectively." },
  { id: 5, title: "Shift Management Guide", category: "Shifts", tags: ["schedule", "shift-change", "approve"], views: 98, content: "How to view your assigned shifts, request shift changes, and get approvals from your Specialist. Includes rules around shift swap policies." },
  { id: 6, title: "Notification Settings & Preferences", category: "Notifications", tags: ["alerts", "email", "settings"], views: 143, content: "Customize which notifications you receive and how. Control alerts for tasks, leave updates, performance reviews, and system announcements." },
  { id: 7, title: "Exporting Reports & Analytics", category: "Reports", tags: ["export", "pdf", "analytics"], views: 87, content: "Learn how to generate and export attendance, performance, task completion, and program completion reports in PDF or Excel formats." },
  { id: 8, title: "Role-Based Access Explained", category: "Account", tags: ["admin", "employee", "intern", "roles"], views: 201, content: "Understand what each role (Admin, Employee, Intern) can access in the system. Includes a complete feature matrix and permission guide." },
];

const TUTORIALS = [
  { id: 1, title: "Platform Overview & Navigation", duration: "4:32", category: "Onboarding", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg", watched: false, desc: "A complete walkthrough of the IMS portal — sidebar, topbar, dashboards, and key workflows." },
  { id: 2, title: "How to Apply for Leave", duration: "3:15", category: "Leave", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg", watched: false, desc: "Step-by-step video guide for submitting a leave request and tracking its status." },
  { id: 3, title: "Using the Kanban Task Board", duration: "5:48", category: "Tasks", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg", watched: false, desc: "Learn to drag, drop, and manage tasks across To Do, In Progress, Review, and Completed columns." },
  { id: 4, title: "Understanding Your Performance Report", duration: "6:20", category: "Performance", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg", watched: false, desc: "How your 8 performance metrics are calculated and what each score means for your internship." },
  { id: 5, title: "Shift Management & Requesting Changes", duration: "2:55", category: "Shifts", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg", watched: false, desc: "How to view your schedule and submit a shift change request with reasons and dates." },
  { id: 6, title: "Admin Guide: Approving Leave & Tasks", duration: "7:10", category: "Admin", thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg", watched: false, desc: "Admin workflow for reviewing and bulk-approving leave requests and task assignments." },
];

const ONBOARDING_STEPS = [
  { icon: GraduationCap, title: "1. Complete Your Profile", desc: "Go to Settings and fill in your name, department, email, and profile photo. This helps managers and admins identify you.", link: "/settings", linkLabel: "Open Settings" },
  { icon: ClipboardList, title: "2. Check Your Assigned Tasks", desc: "Visit the Task Management page to see tasks assigned to you. Move them through the Kanban board as you progress.", link: "/tasks", linkLabel: "View Tasks" },
  { icon: CalendarIcon, title: "3. Know Your Shift", desc: "Open Shift Management to view your assigned schedule. If you need a change, submit a shift change request.", link: "/shifts", linkLabel: "View Shifts" },
  { icon: BarChart2, title: "4. Track Your Performance", desc: "Your performance score is updated regularly across 8 metrics. View it anytime from the Intern Dashboard.", link: "/intern/dashboard", linkLabel: "View Dashboard" },
  { icon: CalendarDays, title: "5. Apply for Leave When Needed", desc: "Use Apply Leave to submit casual, sick, or emergency leave. Your manager will receive an instant notification.", link: "/apply-leave", linkLabel: "Apply Leave" },
  { icon: Bell, title: "6. Stay Notified", desc: "Check the bell icon and Notifications page regularly for task updates, leave approvals, and announcements.", link: "/notifications", linkLabel: "View Notifications" },
  { icon: Settings2, title: "7. Customize Your Settings", desc: "Adjust theme (dark/light), notification preferences, and profile settings from the Settings page.", link: "/settings", linkLabel: "Go to Settings" },
];

const QUICK_SUGGESTIONS = [
  { label: "Login issue", icon: AlertTriangle, subject: "Unable to log in to my account", category: "Technical Issue" },
  { label: "Leave not approved", icon: Clock, subject: "My leave request is still pending", category: "Leave & Attendance" },
  { label: "Task not assigned", icon: Zap, subject: "Task was not assigned to me correctly", category: "Task Management" },
  { label: "Performance query", icon: Lightbulb, subject: "Question about my performance score", category: "Performance" },
  { label: "Shift change request", icon: FileText, subject: "Requesting a shift change", category: "Shift Management" },
  { label: "Other query", icon: HelpCircle, subject: "", category: "General Inquiry" },
];

type TicketRecord = {
  id: string;
  name: string;
  email: string;
  category: string;
  subject: string;
  priority: string;
  message: string;
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  createdAt: string;
  attachment?: string;
};

type Panel = "getting-started" | "tutorials" | "knowledge-base" | "tickets" | null;

// ─── Component ────────────────────────────────────────────────────────────────

export default function HelpCenter() {
  const { toast } = useToast();
  const ticketStorageKey = `help-center-tickets:${getAuthSession()?.user.userId ?? getAuthSession()?.user.email ?? "anonymous"}`;

  // Panels / Modals
  const [panel, setPanel] = useState<Panel>(null);

  // FAQ search
  const [searchTerm, setSearchTerm] = useState("");

  // KB search + filter
  const [kbSearch, setKbSearch] = useState("");
  const [kbCategory, setKbCategory] = useState("All");
  const [selectedArticle, setSelectedArticle] = useState<typeof KB_ARTICLES[0] | null>(null);

  // Tutorial state
  const [tutorialSearch, setTutorialSearch] = useState("");
  const [watchedIds, setWatchedIds] = useState<Set<number>>(new Set());
  const [playingId, setPlayingId] = useState<number | null>(null);

  // Ticket form
  const [form, setForm] = useState({ name: "", email: "", category: "", subject: "", priority: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachment, setAttachment] = useState<string | null>(null);
  const [ticketHistory, setTicketHistory] = useState<TicketRecord[]>(() => {
    try {
      const saved = localStorage.getItem(ticketStorageKey);
      if (saved) return JSON.parse(saved) as TicketRecord[];
    } catch (error) {
      console.error("Unable to load help-center ticket history.", error);
    }
    return [];
  });
  const [submitted, setSubmitted] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketRecord | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Contact modal
  const [contactOpen, setContactOpen] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [contactSent, setContactSent] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(ticketStorageKey, JSON.stringify(ticketHistory));
    } catch (error) {
      console.error("Unable to persist help-center ticket history.", error);
    }
  }, [ticketHistory, ticketStorageKey]);

  const kbCategories = ["All", ...Array.from(new Set(KB_ARTICLES.map(a => a.category)))];
  const filteredKb = KB_ARTICLES.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(kbSearch.toLowerCase()) || a.tags.some(t => t.includes(kbSearch.toLowerCase()));
    const matchCat = kbCategory === "All" || a.category === kbCategory;
    return matchSearch && matchCat;
  });

  const filteredTutorials = TUTORIALS.filter(t =>
    t.title.toLowerCase().includes(tutorialSearch.toLowerCase()) || t.category.toLowerCase().includes(tutorialSearch.toLowerCase())
  );

  const filteredFaqs = FAQS.filter(f =>
    f.q.toLowerCase().includes(searchTerm.toLowerCase()) || f.a.toLowerCase().includes(searchTerm.toLowerCase()) || f.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateTicketId = () => `CCT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Enter a valid email.";
    if (!form.category) e.category = "Select a category.";
    if (!form.subject.trim()) e.subject = "Subject is required.";
    if (!form.priority) e.priority = "Select a priority.";
    if (!form.message.trim()) e.message = "Message is required.";
    else if (form.message.trim().length < 20) e.message = "Minimum 20 characters.";
    return e;
  };

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setIsSubmitting(true);
    setTimeout(() => {
      const newTicket: TicketRecord = {
        id: generateTicketId(),
        ...form,
        status: "Open",
        createdAt: new Date().toISOString().split("T")[0],
        attachment: attachment ?? undefined,
      };
      setTicketHistory(prev => [newTicket, ...prev]);
      setIsSubmitting(false);
      setSubmitted(true);
      toast({ title: `Ticket ${newTicket.id} Created`, description: "We'll respond within 24 hours. Check your ticket history below." });
    }, 1000);
  };

  const applyQuickSuggestion = (s: typeof QUICK_SUGGESTIONS[0]) => {
    setForm(f => ({ ...f, subject: s.subject, category: s.category }));
    setPanel(null);
    setTimeout(() => document.getElementById("submit-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTimeout(() => { setContactSent(true); toast({ title: "Message Sent!", description: "Our team will reach out within 1 business day." }); }, 700);
  };

  const STATUS_COLOR: Record<string, string> = {
    "Open": "text-blue-600 bg-blue-50 border-blue-200",
    "In Progress": "text-orange-600 bg-orange-50 border-orange-200",
    "Resolved": "text-green-600 bg-green-50 border-green-200",
    "Closed": "text-gray-600 bg-gray-50 border-gray-200",
  };

  const PRIORITY_COLOR: Record<string, string> = {
    Low: "bg-green-100 text-green-700",
    Medium: "bg-yellow-100 text-yellow-700",
    High: "bg-red-100 text-red-700",
    Urgent: "bg-red-200 text-red-900 font-bold",
  };

  return (
    <div className="space-y-10 pb-12 max-w-5xl mx-auto">

      {/* Hero */}
      <div className="text-center space-y-5 py-10 bg-primary/5 rounded-2xl border border-primary/10 px-6">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
          <LifeBuoy size={14} /> Help Center
        </div>
        <h1 className="text-4xl font-bold tracking-tight">How can we help you?</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">Search FAQs & articles, browse tutorials, or submit a support ticket.</p>
        <div className="max-w-xl mx-auto relative">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Search FAQs, articles, tutorials..." className="pl-12 h-12 text-base rounded-full bg-background shadow-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        {searchTerm && <p className="text-sm text-muted-foreground">{filteredFaqs.length} FAQ result{filteredFaqs.length !== 1 ? "s" : ""} for "<strong>{searchTerm}</strong>"</p>}
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { id: "getting-started", title: "Getting Started", icon: Book, desc: "Onboarding guide", color: "text-blue-600", bg: "bg-blue-50" },
          { id: "faqs", title: "FAQs", icon: MessageCircle, desc: "Common questions", color: "text-purple-600", bg: "bg-purple-50" },
          { id: "tutorials", title: "Video Tutorials", icon: Video, desc: "Visual guides", color: "text-green-600", bg: "bg-green-50" },
          { id: "contact", title: "Contact Support", icon: LifeBuoy, desc: "Talk to our team", color: "text-orange-600", bg: "bg-orange-50" },
          { id: "ticket", title: "Submit Ticket", icon: FileText, desc: "Report an issue", color: "text-red-600", bg: "bg-red-50" },
          { id: "knowledge-base", title: "Knowledge Base", icon: BookOpen, desc: "Full articles", color: "text-teal-600", bg: "bg-teal-50" },
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              if (cat.id === "faqs") { document.getElementById("faq-section")?.scrollIntoView({ behavior: "smooth" }); }
              else if (cat.id === "ticket") { document.getElementById("submit-form")?.scrollIntoView({ behavior: "smooth" }); }
              else if (cat.id === "contact") { setContactOpen(true); }
              else { setPanel(cat.id as Panel); }
            }}
            className="group rounded-xl border p-4 flex flex-col items-center text-center gap-2 transition-all hover:shadow-md hover:border-primary/40 bg-card"
          >
            <div className={`p-3 rounded-full ${cat.bg} ${cat.color} group-hover:scale-110 transition-transform`}><cat.icon size={20} /></div>
            <span className="text-xs font-semibold leading-tight">{cat.title}</span>
            <span className="text-[10px] text-muted-foreground leading-tight hidden md:block">{cat.desc}</span>
          </button>
        ))}
      </div>

      {/* Quick Suggestions + Submit Ticket */}
      <div id="submit-form" className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-xl font-bold">Quick Suggestions</h2>
            <p className="text-sm text-muted-foreground mt-1">Click a topic to auto-fill the form →</p>
          </div>
          <div className="space-y-2">
            {QUICK_SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => applyQuickSuggestion(s)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all hover:border-primary/50 hover:bg-primary/5 group ${form.subject === s.subject && s.subject ? "border-primary bg-primary/5" : "bg-card"}`}>
                <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-colors shrink-0"><s.icon size={14} className="text-muted-foreground group-hover:text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{s.category}</p>
                </div>
                <ChevronRight size={14} className="text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
          <div className="pt-4 space-y-3 border-t">
            <h3 className="font-semibold text-sm">Contact Us Directly</h3>
            <a href="mailto:support@cc.local" className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors">
              <div className="p-2 bg-muted rounded-lg"><Mail size={13} /></div> support@cc.local
            </a>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="p-2 bg-muted rounded-lg"><Phone size={13} /></div> +91 9876543210
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="p-2 bg-muted rounded-lg"><Clock size={13} /></div> Mon–Fri, 9 AM – 6 PM IST
            </div>
          </div>
        </div>

        {/* Right — Ticket Form */}
        <Card className="lg:col-span-3 shadow-sm">
          {submitted ? (
            <CardContent className="pt-10 pb-10 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center"><CheckCircle2 className="text-green-600 h-9 w-9" /></div>
              <h3 className="text-2xl font-bold">Ticket Submitted!</h3>
              <div className="bg-muted/50 rounded-xl p-4 text-sm text-left w-full max-w-xs space-y-2">
                <div className="flex items-center gap-2"><Hash size={13} className="text-muted-foreground" /><span className="font-mono font-bold text-primary">{ticketHistory[0]?.id}</span></div>
                <p><span className="text-muted-foreground">Category:</span> <strong>{form.category}</strong></p>
                <p><span className="text-muted-foreground">Subject:</span> <strong>{form.subject}</strong></p>
                <p><span className="text-muted-foreground">Priority:</span> <Badge className={`text-[10px] h-4 px-1.5 ${PRIORITY_COLOR[form.priority]}`}>{form.priority}</Badge></p>
                <p><span className="text-muted-foreground">Status:</span> <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-blue-600 bg-blue-50 border-blue-200">Open</Badge></p>
              </div>
              <p className="text-sm text-muted-foreground">We'll respond within 24 hours to <strong>{form.email}</strong>.</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setSubmitted(false); setForm({ name: "", email: "", category: "", subject: "", priority: "", message: "" }); setAttachment(null); }}>New Ticket</Button>
                <Button onClick={() => {
                  setShowHistory(true);
                  document.getElementById("ticket-history")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}>View Ticket History</Button>
              </div>
            </CardContent>
          ) : (
            <>
              <CardHeader className="pb-4 border-b">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg"><FileText size={18} className="text-primary" /></div>
                  <div>
                    <CardTitle className="text-lg">Submit a Support Ticket</CardTitle>
                    <CardDescription>Fill in the details and we'll get back to you within 24 hours.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                <form onSubmit={handleSubmitTicket} noValidate className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="t-name">Full Name *</Label>
                      <Input id="t-name" placeholder="Your name" value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(ev => ({ ...ev, name: "" })); }} className={errors.name ? "border-destructive" : ""} />
                      {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="t-email">Email Address *</Label>
                      <Input id="t-email" type="email" placeholder="you@cc.local" value={form.email} onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(ev => ({ ...ev, email: "" })); }} className={errors.email ? "border-destructive" : ""} />
                      {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Category *</Label>
                      <Select value={form.category} onValueChange={v => { setForm(f => ({ ...f, category: v })); setErrors(ev => ({ ...ev, category: "" })); }}>
                        <SelectTrigger className={errors.category ? "border-destructive" : ""}><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>
                          {["Technical Issue","Leave & Attendance","Task Management","Performance","Shift Management","Account & Profile","General Inquiry","Suggestion / Feedback"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Priority *</Label>
                      <Select value={form.priority} onValueChange={v => { setForm(f => ({ ...f, priority: v })); setErrors(ev => ({ ...ev, priority: "" })); }}>
                        <SelectTrigger className={errors.priority ? "border-destructive" : ""}><SelectValue placeholder="Select priority" /></SelectTrigger>
                        <SelectContent>
                          {["Low","Medium","High","Urgent"].map(p => <SelectItem key={p} value={p}><span className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${p === "Low" ? "bg-green-400" : p === "Medium" ? "bg-yellow-400" : p === "High" ? "bg-red-400" : "bg-red-700"}`} />{p}</span></SelectItem>)}
                        </SelectContent>
                      </Select>
                      {errors.priority && <p className="text-xs text-destructive">{errors.priority}</p>}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="t-subject">Subject *</Label>
                    <Input id="t-subject" placeholder="Brief summary of your issue" value={form.subject} onChange={e => { setForm(f => ({ ...f, subject: e.target.value })); setErrors(ev => ({ ...ev, subject: "" })); }} className={errors.subject ? "border-destructive" : ""} />
                    {errors.subject && <p className="text-xs text-destructive">{errors.subject}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="t-message">Describe Your Issue *</Label>
                    <Textarea id="t-message" placeholder="Describe your issue in detail — include error messages, steps to reproduce, or expected vs actual behavior..." className={`min-h-[110px] resize-none ${errors.message ? "border-destructive" : ""}`} value={form.message} onChange={e => { setForm(f => ({ ...f, message: e.target.value })); setErrors(ev => ({ ...ev, message: "" })); }} />
                    <div className="flex justify-between">
                      {errors.message ? <p className="text-xs text-destructive">{errors.message}</p> : <span />}
                      <p className="text-xs text-muted-foreground">{form.message.length} chars</p>
                    </div>
                  </div>

                  {/* File Attachment */}
                  <div>
                    <input ref={fileRef} type="file" className="hidden" accept=".png,.jpg,.jpeg,.pdf,.doc,.docx" onChange={e => setAttachment(e.target.files?.[0]?.name ?? null)} />
                    {attachment ? (
                      <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-lg text-sm border">
                        <Paperclip size={13} className="text-primary shrink-0" />
                        <span className="flex-1 truncate">{attachment}</span>
                        <button type="button" onClick={() => setAttachment(null)}><X size={13} className="text-muted-foreground hover:text-foreground" /></button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                        <Paperclip size={14} /> Attach a file (PNG, JPG, PDF, DOC)
                      </button>
                    )}
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                    {isSubmitting ? <><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Submitting...</> : <><Send size={15} /> Submit Ticket</>}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>

      {/* Ticket History */}
      <div id="ticket-history" className="border rounded-xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-5 py-4 bg-muted/30 hover:bg-muted/50 transition-colors"
          onClick={() => setShowHistory(h => !h)}
        >
          <div className="flex items-center gap-2 font-semibold">
            <Ticket size={16} className="text-primary" />
            My Ticket History
            <Badge className="ml-1 bg-primary/10 text-primary border-0">{ticketHistory.length}</Badge>
          </div>
          {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showHistory && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/20 border-y">
                <tr>
                  {["Ticket ID","Subject","Category","Priority","Status","Created"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ticketHistory.map(t => (
                  <tr key={t.id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-primary">{t.id}</td>
                    <td className="px-4 py-3 max-w-[180px] truncate">{t.subject}</td>
                    <td className="px-4 py-3 text-muted-foreground">{t.category}</td>
                    <td className="px-4 py-3"><Badge className={`text-[10px] h-4 px-1.5 ${PRIORITY_COLOR[t.priority] ?? ""}`}>{t.priority}</Badge></td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        aria-label={`View details for ticket ${t.id}`}
                        onClick={() => setSelectedTicket(t)}
                        className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Badge variant="outline" className={`cursor-pointer text-[10px] h-5 px-1.5 ${STATUS_COLOR[t.status] ?? ""}`}>
                          {t.status}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{t.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={selectedTicket !== null} onOpenChange={open => { if (!open) setSelectedTicket(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
            <DialogDescription>Current status and information for ticket {selectedTicket?.id}.</DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Ticket ID</span>
                <span className="font-mono font-semibold text-primary">{selectedTicket.id}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-muted-foreground">Subject</span>
                <span className="text-right font-medium">{selectedTicket.subject}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${STATUS_COLOR[selectedTicket.status] ?? ""}`}>
                  {selectedTicket.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Priority</span>
                <Badge className={`text-[10px] h-5 px-1.5 ${PRIORITY_COLOR[selectedTicket.priority] ?? ""}`}>
                  {selectedTicket.priority}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Created</span>
                <span>{selectedTicket.createdAt}</span>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground">Description</span>
                <p className="rounded-lg border bg-muted/30 p-3 leading-relaxed">{selectedTicket.message}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* FAQ Section */}
      <div id="faq-section" className="max-w-3xl mx-auto w-full">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
          {searchTerm && <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">{filteredFaqs.length} match{filteredFaqs.length !== 1 ? "es" : ""}</Badge>}
        </div>
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-12 bg-card border rounded-xl text-muted-foreground space-y-3">
            <Search className="h-10 w-10 mx-auto opacity-20" />
            <p>No FAQs matched "<strong>{searchTerm}</strong>".</p>
            <Button variant="outline" size="sm" onClick={() => setSearchTerm("")}>Clear search</Button>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full bg-card border rounded-xl px-4 shadow-sm">
            {filteredFaqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left hover:text-primary gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <Badge variant="outline" className="shrink-0 text-[10px] mt-0.5 px-1.5 h-4">{faq.category}</Badge>
                    <span className="font-medium text-sm text-left">{faq.q}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed ml-12 pb-4">
                  {faq.a}
                  <div className="mt-3">
                    <button className="text-xs text-primary hover:underline" onClick={() => applyQuickSuggestion({ label: faq.q, icon: HelpCircle, subject: faq.q, category: "General Inquiry" })}>
                      Still have questions? Submit a ticket →
                    </button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>

      {/* ─── Getting Started Modal ─────────────────────────────────────────── */}
      <Dialog open={panel === "getting-started"} onOpenChange={o => !o && setPanel(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Book size={18} className="text-blue-600" /> Getting Started with Smart CP</DialogTitle>
            <DialogDescription>Follow these steps to set up your internship portal experience.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">Onboarding Progress</p>
              <Progress value={28} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">2 of 7 steps completed</p>
            </div>
            {ONBOARDING_STEPS.map((step, i) => (
              <div key={i} className={`flex gap-4 p-4 border rounded-xl transition-colors ${i < 2 ? "border-green-200 bg-green-50" : "bg-card hover:bg-muted/30"}`}>
                <div className={`p-2.5 rounded-lg shrink-0 ${i < 2 ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"}`}>
                  {i < 2 ? <CheckCircle2 size={18} /> : <step.icon size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{step.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
                <Link href={step.link} className="text-xs text-primary hover:underline shrink-0 flex items-center gap-1 mt-1">
                  {step.linkLabel} <ExternalLink size={10} />
                </Link>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Video Tutorials Modal ────────────────────────────────────────── */}
      <Dialog open={panel === "tutorials"} onOpenChange={o => !o && setPanel(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Video size={18} className="text-green-600" /> Video Tutorials</DialogTitle>
            <DialogDescription>Step-by-step visual guides for using the IMS platform.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search tutorials..." className="pl-9" value={tutorialSearch} onChange={e => setTutorialSearch(e.target.value)} />
            </div>
            <div className="flex gap-2 text-xs flex-wrap">
              {["All","Onboarding","Leave","Tasks","Performance","Shifts","Admin"].map(cat => (
                <button key={cat} onClick={() => setTutorialSearch(cat === "All" ? "" : cat)} className={`px-2.5 py-1 rounded-full border transition-colors ${(!tutorialSearch && cat === "All") || tutorialSearch === cat ? "bg-primary text-white border-primary" : "bg-muted hover:bg-muted/80"}`}>{cat}</button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredTutorials.map(t => (
                <div key={t.id} className="border rounded-xl overflow-hidden hover:shadow-md transition-shadow bg-card">
                  <div className="relative bg-muted h-32 flex items-center justify-center">
                    <div className="text-muted-foreground/20"><Video size={48} /></div>
                    <button
                      className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
                      onClick={() => { setPlayingId(t.id); setWatchedIds(prev => new Set(prev).add(t.id)); }}
                    >
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <Play size={20} className="text-primary ml-1" />
                      </div>
                    </button>
                    {watchedIds.has(t.id) && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full px-2 py-0.5 text-[10px] flex items-center gap-1"><Eye size={10} /> Watched</div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">{t.duration}</div>
                  </div>
                  <div className="p-3">
                    <Badge variant="outline" className="text-[10px] mb-1.5 px-1.5 h-4">{t.category}</Badge>
                    <p className="font-semibold text-sm">{t.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            {playingId && (
              <div className="border rounded-xl p-4 bg-muted/30 text-center space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm">{filteredTutorials.find(t => t.id === playingId)?.title}</p>
                  <button onClick={() => setPlayingId(null)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
                </div>
                <div className="bg-muted rounded-lg h-48 flex items-center justify-center text-muted-foreground text-sm">
                  <div className="text-center space-y-2">
                    <Video size={32} className="mx-auto opacity-30" />
                    <p>Video playback preview</p>
                    <p className="text-xs opacity-60">Tutorial: {filteredTutorials.find(t => t.id === playingId)?.title}</p>
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t text-sm text-muted-foreground">
              <span>{watchedIds.size} of {TUTORIALS.length} watched</span>
              <Progress value={(watchedIds.size / TUTORIALS.length) * 100} className="h-1.5 w-32" />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Knowledge Base Modal ─────────────────────────────────────────── */}
      <Dialog open={panel === "knowledge-base"} onOpenChange={o => !o && setPanel(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedArticle ? (
                <button onClick={() => setSelectedArticle(null)} className="flex items-center gap-1 text-sm font-normal text-muted-foreground hover:text-foreground">
                  <ArrowLeft size={14} /> Back
                </button>
              ) : <><BookOpen size={18} className="text-teal-600" /> Knowledge Base</>}
            </DialogTitle>
            {!selectedArticle && <DialogDescription>Browse articles and documentation for the IMS platform.</DialogDescription>}
          </DialogHeader>

          {selectedArticle ? (
            <div className="py-2 space-y-4">
              <div>
                <Badge variant="outline" className="mb-2">{selectedArticle.category}</Badge>
                <h2 className="text-xl font-bold">{selectedArticle.title}</h2>
                <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Eye size={12} /> {selectedArticle.views + 1} views</span>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed">{selectedArticle.content}</p>
              <p className="text-muted-foreground leading-relaxed text-sm">
                This article covers all the essential steps and best practices for <strong>{selectedArticle.title.toLowerCase()}</strong>. 
                Our team keeps this knowledge base updated with the latest platform changes and feature additions. 
                If you find information that's outdated or unclear, please submit a support ticket and we'll update the documentation.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-2 border-t">
                {selectedArticle.tags.map(t => <Badge key={t} variant="outline" className="gap-1 text-xs"><Tag size={10} />{t}</Badge>)}
              </div>
              <div className="bg-primary/5 border border-primary/10 rounded-lg p-4 text-sm">
                <p className="font-semibold mb-1">Was this article helpful?</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toast({ title: "Thanks for the feedback!" })}>👍 Yes</Button>
                  <Button size="sm" variant="outline" onClick={() => { applyQuickSuggestion({ label: selectedArticle.title, icon: HelpCircle, subject: selectedArticle.title, category: "General Inquiry" }); setPanel(null); }}>No — Submit Ticket</Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search articles..." className="pl-9" value={kbSearch} onChange={e => setKbSearch(e.target.value)} />
                </div>
                <Select value={kbCategory} onValueChange={setKbCategory}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>{kbCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {filteredKb.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground"><Search className="mx-auto h-10 w-10 opacity-20 mb-3" /><p>No articles found.</p></div>
              ) : (
                <div className="space-y-2">
                  {filteredKb.map(article => (
                    <button key={article.id} onClick={() => setSelectedArticle(article)} className="w-full text-left border rounded-xl p-4 hover:border-primary/40 hover:bg-muted/30 transition-all bg-card group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px] px-1.5 h-4 shrink-0">{article.category}</Badge>
                          </div>
                          <p className="font-semibold text-sm group-hover:text-primary transition-colors">{article.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{article.content}</p>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {article.tags.map(t => <span key={t} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">{t}</span>)}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Eye size={11} />{article.views}</span>
                          <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground text-center pt-2">{filteredKb.length} article{filteredKb.length !== 1 ? "s" : ""} found</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Contact Support Modal ────────────────────────────────────────── */}
      <Dialog open={contactOpen} onOpenChange={o => { setContactOpen(o); if (!o) { setContactSent(false); setContactForm({ name: "", email: "", message: "" }); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><LifeBuoy size={18} className="text-orange-600" /> Contact Support</DialogTitle>
            <DialogDescription>Send a message to our support team directly.</DialogDescription>
          </DialogHeader>
          {contactSent ? (
            <div className="py-8 flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center"><CheckCircle2 className="text-green-600 h-8 w-8" /></div>
              <h3 className="font-bold text-lg">Message Sent!</h3>
              <p className="text-sm text-muted-foreground">Our team will reach out to <strong>{contactForm.email}</strong> within 1 business day.</p>
              <Button variant="outline" onClick={() => { setContactOpen(false); setContactSent(false); setContactForm({ name: "", email: "", message: "" }); }}>Close</Button>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input placeholder="Your name" value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="you@cc.local" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Message</Label>
                <Textarea placeholder="How can we help you?" className="min-h-[100px] resize-none" value={contactForm.message} onChange={e => setContactForm(f => ({ ...f, message: e.target.value }))} required />
              </div>
              <div className="pt-2 space-y-2 text-sm text-muted-foreground border-t">
                <div className="flex items-center gap-2"><Mail size={13} /> support@cc.local</div>
                <div className="flex items-center gap-2"><Phone size={13} /> +91 9876543210</div>
                <div className="flex items-center gap-2"><Clock size={13} /> Mon–Fri, 9 AM – 6 PM IST</div>
              </div>
              <Button type="submit" className="w-full gap-2"><Send size={14} /> Send Message</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
