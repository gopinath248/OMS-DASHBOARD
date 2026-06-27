import { useState, useRef, useEffect } from "react";
import {
  Hash, Send, Search, Pin, ChevronDown, ChevronRight,
  Users, Paperclip, Smile, AtSign, MoreHorizontal, Phone,
  Video, Megaphone, CalendarDays, FolderOpen,
  Kanban, CheckCircle2, MessageSquare, X,
  AlertTriangle, Zap, Info, ArrowLeft,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type UserStatus = "online" | "away" | "offline" | "busy";
type MessageReaction = { emoji: string; count: number; reacted?: boolean };

interface ChatMessage {
  id: string;
  user: string;
  avatar: string;
  role: "Admin" | "Employee" | "Intern";
  time: string;
  message: string;
  pinned?: boolean;
  reactions: MessageReaction[];
  replyTo?: string;
  replyUser?: string;
  replySnippet?: string;
}

interface Channel {
  id: string;
  name: string;
  icon: React.ElementType;
  unread: number;
  description: string;
  members: number;
  pinCount?: number;
}

interface DmUser {
  id: string;
  name: string;
  avatar: string;
  role: "Admin" | "Employee" | "Intern";
  status: UserStatus;
  unread: number;
  lastMessage: string;
}

const CHANNELS: Channel[] = [
  { id: "announcements",    name: "Announcements",    icon: Megaphone,     unread: 2, description: "Official company announcements and policy updates", members: 32, pinCount: 2 },
  { id: "leave-requests",   name: "Leave Requests",   icon: CalendarDays,  unread: 4, description: "Leave approvals, rejections, and status updates", members: 32 },
  { id: "project-updates",  name: "Project Updates",  icon: FolderOpen,    unread: 3, description: "Project progress, milestones, and blockers", members: 28 },
  { id: "sprint-updates",   name: "Sprint Updates",   icon: Kanban,        unread: 1, description: "Sprint ceremonies, stories, and velocity tracking", members: 20 },
  { id: "general",          name: "General",          icon: Hash,          unread: 7, description: "General discussion, water-cooler chats", members: 32 },
  { id: "hr-updates",       name: "HR Updates",       icon: Users,         unread: 0, description: "HR policies, onboarding, performance news", members: 32 },
  { id: "task-completions", name: "Task Completions", icon: CheckCircle2,  unread: 0, description: "Task done notifications and recognition", members: 32 },
];

const DM_USERS: DmUser[] = [
  { id: "dm-admin",   name: "Admin",         avatar: "AD", role: "Admin",    status: "online",  unread: 1, lastMessage: "Welcome to Code Core PLANWAY!" },
  { id: "dm-smith",   name: "Dr. Smith",     avatar: "DS", role: "Employee", status: "online",  unread: 0, lastMessage: "Let me check the PR tonight" },
  { id: "dm-davis",   name: "Prof. Davis",   avatar: "PD", role: "Employee", status: "online",  unread: 1, lastMessage: "Model metrics look great 🎉" },
  { id: "dm-sarah",   name: "Sarah Lee",     avatar: "SL", role: "Employee", status: "away",    unread: 0, lastMessage: "On leave today, back tomorrow" },
  { id: "dm-raj",     name: "Raj Mehta",     avatar: "RM", role: "Employee", status: "busy",    unread: 2, lastMessage: "CI runner config is updated" },
  { id: "dm-alice",   name: "Alice Johnson", avatar: "AJ", role: "Intern",   status: "online",  unread: 0, lastMessage: "Charts are ready for review!" },
  { id: "dm-grace",   name: "Grace Kim",     avatar: "GK", role: "Intern",   status: "online",  unread: 3, lastMessage: "@you BERT model at 91% accuracy" },
  { id: "dm-deepika", name: "Deepika K",     avatar: "DK", role: "Intern",   status: "offline", unread: 0, lastMessage: "Healthcare AI model merged ✅" },
];

const CHANNEL_MESSAGES: Record<string, ChatMessage[]> = {
  announcements: [
    { id: "m1", user: "Admin", avatar: "AD", role: "Admin", time: "Today 9:00 AM",
      message: "🎉 Welcome to the **Command Center** — Code Core's official internal communication hub. All company announcements, leave notifications, project updates, and team discussions happen here. Make sure to join the relevant channels!",
      pinned: true, reactions: [{ emoji: "👍", count: 12 }, { emoji: "🎉", count: 7 }] },
    { id: "m2", user: "Admin", avatar: "AD", role: "Admin", time: "Today 9:15 AM",
      message: "📋 **Certificate Issuance Notice:** Internship completion certificates will be issued between July 1–15, 2026. All interns must complete their pending tasks and submit final reports before June 30th.",
      pinned: true, reactions: [{ emoji: "✅", count: 15 }, { emoji: "📋", count: 4 }] },
    { id: "m3", user: "Priya Nair", avatar: "PN", role: "Employee", time: "Today 10:30 AM",
      message: "🗓️ Performance Review Q2 2026 is scheduled for July 5th. All employees and interns should prepare their self-assessments and task completion reports by July 3rd. Login to the Performance section to begin.",
      pinned: false, reactions: [{ emoji: "👀", count: 8 }, { emoji: "📝", count: 3 }] },
    { id: "m4", user: "Admin", avatar: "AD", role: "Admin", time: "Jun 20, 2026",
      message: "🔒 New security policy: All passwords must be updated before July 1st, 2026. Two-factor authentication is now mandatory for all accounts. Contact IT for assistance.",
      pinned: false, reactions: [{ emoji: "🔒", count: 6 }] },
  ],
  "leave-requests": [
    { id: "m5", user: "Alice Johnson", avatar: "AJ", role: "Intern", time: "Today 8:45 AM",
      message: "Hi team, I've submitted a **sick leave request** for 3 days (June 27–29). Doctor has advised rest. Supporting document attached to the leave portal. Please approve at the earliest. 🙏",
      pinned: false, reactions: [] },
    { id: "m6", user: "Dr. Smith", avatar: "DS", role: "Employee", time: "Today 9:05 AM",
      message: "**@Alice Johnson** — Reviewed and **Approved ✅**. Please rest and recover. Ping me when you're back. Tasks can wait until July 1st.",
      pinned: false, reactions: [{ emoji: "❤️", count: 3 }, { emoji: "✅", count: 2 }],
      replyTo: "m5", replyUser: "Alice Johnson", replySnippet: "sick leave request for 3 days (June 27–29)..." },
    { id: "m7", user: "James Moore", avatar: "JM", role: "Intern", time: "Today 11:00 AM",
      message: "Leave request submitted: **Casual leave on July 3rd** for university exam duty. INT010. Manager notification has been sent.",
      pinned: false, reactions: [] },
    { id: "m8", user: "Admin", avatar: "AD", role: "Admin", time: "Today 11:20 AM",
      message: "⚠️ **Policy Reminder:** All leave requests must be submitted **at least 3 business days in advance**. Emergency requests require medical/official documentation within 24 hours of return.",
      pinned: true, reactions: [{ emoji: "👍", count: 5 }] },
    { id: "m9", user: "Karen Lee", avatar: "KL", role: "Intern", time: "Today 1:00 PM",
      message: "Sick leave request (INT011) — submitted for tomorrow June 26th. Feeling unwell since morning. Will update if situation changes.",
      pinned: false, reactions: [{ emoji: "🙏", count: 2 }] },
  ],
  "project-updates": [
    { id: "m10", user: "Deepika K", avatar: "DK", role: "Intern", time: "Yesterday 4:00 PM",
      message: "🚀 **Healthcare AI Diagnostics (INT020)** — ML model integration at **95% completion**! Final validation runs are in progress. @Prof. Davis please review the F1-score metrics when free.",
      pinned: false, reactions: [{ emoji: "🚀", count: 5 }, { emoji: "👏", count: 8 }, { emoji: "🔥", count: 3 }] },
    { id: "m11", user: "Prof. Davis", avatar: "PD", role: "Employee", time: "Yesterday 4:45 PM",
      message: "Excellent work @Deepika K! Reviewed the metrics — F1-score of 0.94 is outstanding. Merging to main once QA signs off. This is production-ready! 🎯",
      pinned: false, reactions: [{ emoji: "✅", count: 4 }, { emoji: "🎯", count: 2 }],
      replyTo: "m10", replyUser: "Deepika K", replySnippet: "ML model integration at 95% completion..." },
    { id: "m12", user: "Grace Kim", avatar: "GK", role: "Intern", time: "Today 9:30 AM",
      message: "**NLP Sentiment Analysis (INT007)** — Story CC26IPM-002 moved to Review stage ✅. Tagging @Prof. Davis for final code review before marking Done. PR link shared in the sprint board.",
      pinned: false, reactions: [{ emoji: "👍", count: 3 }] },
    { id: "m13", user: "Henry Wilson", avatar: "HW", role: "Intern", time: "Today 10:15 AM",
      message: "🔧 **CI/CD Pipeline (INT008)** — 60% complete. Hitting a wall with GitHub Actions runner configuration for self-hosted agents. @Raj Mehta could you spare 15 mins for a quick call?",
      pinned: false, reactions: [{ emoji: "🔧", count: 1 }, { emoji: "👀", count: 2 }] },
    { id: "m14", user: "Raj Mehta", avatar: "RM", role: "Employee", time: "Today 10:45 AM",
      message: "@Henry Wilson Sure! I've updated the runner config in our DevOps repo. Check branch `feat/runner-fix`. The YAML needs a `runs-on: self-hosted` label. DM me if you're still stuck.",
      pinned: false, reactions: [{ emoji: "🙌", count: 4 }],
      replyTo: "m13", replyUser: "Henry Wilson", replySnippet: "CI/CD Pipeline 60% complete. Hitting a wall..." },
  ],
  "sprint-updates": [
    { id: "m15", user: "Admin", avatar: "AD", role: "Admin", time: "Jun 16, 2026",
      message: "🚀 **Sprint S01 — Task Management Sprint STARTED!**\n📅 Duration: June 16 – June 30, 2026\n🎯 Goal: Core task management module with auth, dashboards, CI/CD\n⚡ Team capacity: 85% | Velocity target: 42sp",
      pinned: true, reactions: [{ emoji: "🚀", count: 10 }, { emoji: "💪", count: 7 }, { emoji: "🎉", count: 5 }] },
    { id: "m16", user: "Dr. Smith", avatar: "DS", role: "Employee", time: "Today 8:00 AM",
      message: "📊 **Sprint S01 Mid-Sprint Health Check** (June 25)\n✅ Done: 2 stories (5sp)\n🔄 In Progress: 4 stories\n🧪 Testing: 2 stories\n🚧 Blocked: 1 story (CC26EPIC-002)\n⚠️ Blockers standup at **3:00 PM today**. Attendance mandatory.",
      pinned: false, reactions: [{ emoji: "👀", count: 6 }, { emoji: "✅", count: 2 }] },
    { id: "m17", user: "Frank Miller", avatar: "FM", role: "Intern", time: "Today 8:30 AM",
      message: "🚧 **BLOCKED — CC26EPIC-002 (User Management System, INT006)**\nBlocked on Auth module dependency. The JWT middleware hasn't been merged yet. This blocks the entire user permissions layer. Escalating to @Dr. Smith for unblocking.",
      pinned: false, reactions: [{ emoji: "🚨", count: 3 }, { emoji: "😬", count: 2 }] },
    { id: "m18", user: "Mia Martinez", avatar: "MM", role: "Intern", time: "Today 9:00 AM",
      message: "✅ **CC26SR-002 — API Rate Limiting** at 80%! All 200+ req/min load tests passing. Moving to final security scan before Done Story status. ETA: today EOD.",
      pinned: false, reactions: [{ emoji: "💪", count: 5 }, { emoji: "🔥", count: 3 }] },
  ],
  general: [
    { id: "m19", user: "Raj Mehta", avatar: "RM", role: "Employee", time: "Yesterday 1:00 PM",
      message: "📅 Reminder: Office closed **July 4th, 2026** (national holiday). Please update sprint board and ensure tasks are logged before EOD July 3rd. No standup that day.",
      pinned: false, reactions: [{ emoji: "👍", count: 9 }, { emoji: "🙏", count: 4 }] },
    { id: "m20", user: "Alice Johnson", avatar: "AJ", role: "Intern", time: "Yesterday 2:30 PM",
      message: "Dashboard Charts just went live on dev! Recharts integration with line, bar, and pie charts all working. Animations are 🔥. @Dr. Smith it's ready for code review! PR #47",
      pinned: false, reactions: [{ emoji: "🔥", count: 6 }, { emoji: "👀", count: 4 }, { emoji: "😍", count: 2 }] },
    { id: "m21", user: "Mia Martinez", avatar: "MM", role: "Intern", time: "Today 9:00 AM",
      message: "Good morning Code Core! ☀️ Rate limiting module passed all stress tests last night. 0 failures at 250 req/min. Pushing the final commit now 💪",
      pinned: false, reactions: [{ emoji: "💪", count: 7 }, { emoji: "🎉", count: 4 }, { emoji: "☀️", count: 3 }] },
    { id: "m22", user: "Quinn Davis", avatar: "QD", role: "Intern", time: "Today 10:00 AM",
      message: "Dark mode implementation (CC26IPM-006) is scoped and ready for Sprint S02. Will use CSS variables + next-themes. Design mockups shared in Figma. Feedback welcome!",
      pinned: false, reactions: [{ emoji: "🌙", count: 8 }, { emoji: "👀", count: 3 }] },
    { id: "m23", user: "Admin", avatar: "AD", role: "Admin", time: "Today 11:00 AM",
      message: "📌 **Code Review Policy Update:** All PRs must receive at least 2 approvals before merging to main. PRs without reviews after 48 hours will be auto-escalated to the team lead.",
      pinned: false, reactions: [{ emoji: "✅", count: 5 }] },
  ],
  "hr-updates": [
    { id: "m24", user: "Priya Nair", avatar: "PN", role: "Employee", time: "Jun 20, 2026",
      message: "🎊 Welcome **Deepika K (INT020)** to the AI&DS team! She joins as a Healthcare AI Diagnostics intern. Please give her a warm Code Core welcome and help her get settled in. 🙏",
      pinned: false, reactions: [{ emoji: "🎊", count: 12 }, { emoji: "🙏", count: 8 }, { emoji: "❤️", count: 5 }] },
    { id: "m25", user: "Priya Nair", avatar: "PN", role: "Employee", time: "Jun 23, 2026",
      message: "📊 **Monthly Progress Reports due June 30th.** All mentors must submit intern performance evaluations by then. Interns: ensure your task logs and self-assessments are up to date. Contact hr@codecore.global for queries.",
      pinned: false, reactions: [{ emoji: "👍", count: 6 }, { emoji: "📋", count: 2 }] },
    { id: "m26", user: "Admin", avatar: "AD", role: "Admin", time: "Today 9:00 AM",
      message: "🏆 **Recognition:** Outstanding performance this sprint goes to **Grace Kim (INT007)** — 97% attendance, 91% task completion, and exceptional NLP research quality. Keep it up! ⭐",
      pinned: false, reactions: [{ emoji: "⭐", count: 15 }, { emoji: "👏", count: 10 }, { emoji: "🏆", count: 7 }] },
  ],
  "task-completions": [
    { id: "m27", user: "System", avatar: "SY", role: "Admin", time: "Jun 22, 2026",
      message: "✅ **Task Completed** — CC26BUG-001 'Fix Authentication Token Expiry' completed by **Bob Smith (INT002)**. Reviewed by Dr. Smith. Story points: 3sp. Great fix! 🎯",
      pinned: false, reactions: [{ emoji: "🎯", count: 4 }, { emoji: "✅", count: 3 }] },
    { id: "m28", user: "System", avatar: "SY", role: "Admin", time: "Jun 23, 2026",
      message: "✅ **Task Completed** — CC26CR-002 'Database Schema Migration v2' completed by **Bob Smith (INT002)**. Multi-tenant columns added successfully. 3sp delivered.",
      pinned: false, reactions: [{ emoji: "🚀", count: 3 }] },
    { id: "m29", user: "System", avatar: "SY", role: "Admin", time: "Today 8:00 AM",
      message: "🔔 **Task Due Today** — CC26BUG-002 'Payment Module Crash on Submit' assigned to **Diana Prince (INT004)**. Priority: High. Please update status on the sprint board.",
      pinned: false, reactions: [{ emoji: "⏰", count: 2 }] },
  ],
};

const DM_MESSAGES: Record<string, ChatMessage[]> = {
  "dm-admin": [
    { id: "dma1", user: "Admin", avatar: "AD", role: "Admin", time: "Today 8:00 AM",
      message: "👋 Welcome to Code Core PLANWAY! I'm here if you need anything — leave approvals, task queries, sprint updates, or general support.", pinned: false, reactions: [] },
    { id: "dma2", user: "Admin", avatar: "AD", role: "Admin", time: "Today 8:05 AM",
      message: "📋 Reminder: All task updates should be reflected on the sprint board. Ping me if you have any blockers!", pinned: false, reactions: [{ emoji: "👍", count: 1 }] },
  ],
  "dm-davis": [
    { id: "dm1", user: "Prof. Davis", avatar: "PD", role: "Employee", time: "Yesterday 3:00 PM",
      message: "Hey Admin, just finished reviewing the AI model metrics for INT020. F1 score of 0.94 is production-ready. Merging after QA sign-off.", pinned: false, reactions: [] },
    { id: "dm2", user: "Admin", avatar: "AD", role: "Admin", time: "Yesterday 3:15 PM",
      message: "Excellent! That's great progress. Can you also check on INT007's NLP model — it's been in Review for 2 days.", pinned: false, reactions: [] },
    { id: "dm3", user: "Prof. Davis", avatar: "PD", role: "Employee", time: "Today 9:30 AM",
      message: "Model metrics look great 🎉 Will review INT007 today after standup. Both models should be in Done Story by EOD.", pinned: false, reactions: [{ emoji: "🎉", count: 1 }] },
  ],
  "dm-raj": [
    { id: "dm4", user: "Raj Mehta", avatar: "RM", role: "Employee", time: "Today 10:00 AM",
      message: "CI runner config is updated on the DevOps repo. INT008 should be able to unblock. Also, S02 infra tickets are ready for planning.", pinned: false, reactions: [] },
    { id: "dm5", user: "Raj Mehta", avatar: "RM", role: "Employee", time: "Today 10:05 AM",
      message: "Quick heads up — the staging env will be down for 2 hours tonight (11pm-1am) for routine maintenance.", pinned: false, reactions: [] },
  ],
  "dm-grace": [
    { id: "dm6", user: "Grace Kim", avatar: "GK", role: "Intern", time: "Today 9:00 AM",
      message: "@you BERT model at 91% accuracy on the validation set! Can we discuss deployment strategy in our next 1:1?", pinned: false, reactions: [{ emoji: "🔥", count: 1 }] },
    { id: "dm7", user: "Grace Kim", avatar: "GK", role: "Intern", time: "Today 9:05 AM",
      message: "Also — attended the NLP conference last week. Lots of inspiration for the next sprint. Sharing notes!", pinned: false, reactions: [] },
    { id: "dm8", user: "Grace Kim", avatar: "GK", role: "Intern", time: "Today 9:10 AM",
      message: "CC26IPM-002 is in Review status now. PR #52 is up. Would love your feedback 🙏", pinned: false, reactions: [] },
  ],
};

const PENDING_APPROVALS = [
  { id: "pa1", type: "leave",   icon: CalendarDays,   color: "text-orange-500", bg: "bg-orange-50",  label: "Leave Request", desc: "Karen Lee — Sick leave Jun 26",      time: "Just now" },
  { id: "pa2", type: "leave",   icon: CalendarDays,   color: "text-orange-500", bg: "bg-orange-50",  label: "Leave Request", desc: "James Moore — Casual Jul 3",         time: "1h ago"   },
  { id: "pa3", type: "sprint",  icon: Kanban,         color: "text-purple-500", bg: "bg-purple-50",  label: "Blocked Story", desc: "CC26EPIC-002 needs unblocking",       time: "2h ago"   },
  { id: "pa4", type: "task",    icon: AlertTriangle,  color: "text-red-500",    bg: "bg-red-50",     label: "Overdue Task",  desc: "CC26BUG-002 — due today",            time: "3h ago"   },
];

const RECENT_ACTIVITIES = [
  { icon: CheckCircle2, color: "text-green-500",  text: "Alice Johnson's leave approved",   time: "9:05 AM"   },
  { icon: CheckCircle2, color: "text-green-500",  text: "CC26BUG-001 marked Done Story",    time: "Yesterday" },
  { icon: Users,        color: "text-blue-500",   text: "Deepika K joined AI&DS team",      time: "Jun 20"    },
  { icon: Zap,          color: "text-yellow-500", text: "Sprint S01 started",               time: "Jun 16"    },
  { icon: CheckCircle2, color: "text-green-500",  text: "DB Migration v2 completed",        time: "Jun 23"    },
];

function statusDot(status: UserStatus) {
  const map: Record<UserStatus, string> = {
    online: "bg-green-500", away: "bg-yellow-400", busy: "bg-red-500", offline: "bg-gray-400",
  };
  return map[status];
}

function roleBadge(role: "Admin" | "Employee" | "Intern") {
  const map = {
    Admin:    "bg-purple-100 text-purple-700",
    Employee: "bg-blue-100 text-blue-700",
    Intern:   "bg-emerald-100 text-emerald-700",
  };
  return map[role];
}

function avatarBg(role: "Admin" | "Employee" | "Intern") {
  const map = {
    Admin:    "bg-purple-200 text-purple-800",
    Employee: "bg-blue-200 text-blue-800",
    Intern:   "bg-emerald-200 text-emerald-800",
  };
  return map[role];
}

function getRoleInfo() {
  const r = localStorage.getItem("role") ?? "admin";
  const label     = r === "student" ? "Intern" : r === "staff" ? "Employee" : "Admin";
  const msgRole   = r === "student" ? "Intern" : r === "staff" ? "Employee" : "Admin";
  const msgUser   = r === "student" ? "Intern User" : r === "staff" ? "Employee User" : "Admin";
  const msgAvatar = r === "student" ? "IN" : r === "staff" ? "EM" : "AD";
  return { raw: r, label, msgRole, msgUser, msgAvatar } as const;
}

type RoleMsgRole = "Admin" | "Employee" | "Intern";

function getVisibleDms(rawRole: string): DmUser[] {
  if (rawRole === "student") return DM_USERS.filter(d => d.role === "Admin");
  if (rawRole === "staff")   return DM_USERS.filter(d => d.role === "Admin" || d.role === "Employee");
  return DM_USERS;
}

interface MessageBubbleProps { msg: ChatMessage; onReact: (msgId: string, emoji: string) => void; isSelf?: boolean; }
function MessageBubble({ msg, onReact, isSelf }: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("group flex gap-3 px-4 py-2 hover:bg-muted/30 rounded-xl transition-colors", isSelf && "flex-row-reverse")}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarFallback className={cn("text-[10px] font-bold", avatarBg(msg.role))}>{msg.avatar}</AvatarFallback>
      </Avatar>

      <div className={cn("flex-1 min-w-0", isSelf && "flex flex-col items-end")}>
        {msg.replyTo && (
          <div className="flex items-center gap-1.5 mb-1 ml-0.5">
            <div className="w-4 h-3 border-l-2 border-t-2 border-muted-foreground/30 rounded-tl-sm" />
            <span className="text-[11px] text-muted-foreground">
              <span className="font-semibold">{msg.replyUser}</span>: {msg.replySnippet}
            </span>
          </div>
        )}

        <div className={cn("flex items-baseline gap-2 mb-1", isSelf && "flex-row-reverse")}>
          <span className="font-semibold text-sm">{msg.user}</span>
          <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", roleBadge(msg.role))}>{msg.role}</span>
          <span className="text-[10px] text-muted-foreground">{msg.time}</span>
          {msg.pinned && <Pin size={10} className="text-amber-500" />}
        </div>

        <div className={cn(
          "inline-block rounded-2xl px-4 py-2.5 text-sm leading-relaxed max-w-[85%] whitespace-pre-line",
          isSelf
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted text-foreground rounded-tl-sm"
        )}>
          {msg.message}
        </div>

        {msg.reactions.length > 0 && (
          <div className={cn("flex gap-1 flex-wrap mt-1.5", isSelf && "justify-end")}>
            {msg.reactions.map(r => (
              <button
                key={r.emoji}
                onClick={() => onReact(msg.id, r.emoji)}
                className={cn(
                  "flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors",
                  r.reacted
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-background border-border hover:border-primary/30"
                )}
              >
                {r.emoji} <span className="font-medium">{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-1 shrink-0 self-start mt-1"
          >
            {["👍", "❤️", "🎉"].map(e => (
              <button key={e} onClick={() => onReact(msg.id, e)}
                className="text-sm p-1 rounded-lg hover:bg-muted transition-colors">{e}</button>
            ))}
            <button className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
              <MoreHorizontal size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function CommandCenter() {
  const roleInfo   = getRoleInfo();
  const visibleDms = getVisibleDms(roleInfo.raw);

  const [activeChannel, setActiveChannel]   = useState("announcements");
  const [activeDm, setActiveDm]             = useState<string | null>(null);
  const [channelsOpen, setChannelsOpen]     = useState(true);
  const [dmsOpen, setDmsOpen]               = useState(true);
  const [msgInput, setMsgInput]             = useState("");
  const [search, setSearch]                 = useState("");
  const [messages, setMessages]             = useState(CHANNEL_MESSAGES);
  const [dmMessages, setDmMessages]         = useState(DM_MESSAGES);
  const [approvals, setApprovals]           = useState(PENDING_APPROVALS);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const scrollRef                           = useRef<HTMLDivElement>(null);

  const currentChannel = CHANNELS.find(c => c.id === activeChannel);
  const currentDm      = visibleDms.find(d => d.id === activeDm);

  const currentMessages: ChatMessage[] = activeDm
    ? (dmMessages[activeDm] ?? [])
    : (messages[activeChannel] ?? []);

  const filteredMessages = search
    ? currentMessages.filter(m =>
        m.message.toLowerCase().includes(search.toLowerCase()) ||
        m.user.toLowerCase().includes(search.toLowerCase())
      )
    : currentMessages;

  const pinnedMessages = currentMessages.filter(m => m.pinned);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeChannel, activeDm, filteredMessages.length]);

  const handleSend = () => {
    if (!msgInput.trim()) return;
    const newMsg: ChatMessage = {
      id:       `new-${Date.now()}`,
      user:     roleInfo.msgUser,
      avatar:   roleInfo.msgAvatar,
      role:     roleInfo.msgRole as RoleMsgRole,
      time:     new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      message:  msgInput.trim(),
      pinned:   false,
      reactions: [],
    };
    if (activeDm) {
      setDmMessages(prev => ({ ...prev, [activeDm]: [...(prev[activeDm] ?? []), newMsg] }));
    } else {
      setMessages(prev => ({ ...prev, [activeChannel]: [...(prev[activeChannel] ?? []), newMsg] }));
    }
    setMsgInput("");
  };

  const handleReact = (msgId: string, emoji: string) => {
    const updater = (msgs: ChatMessage[]) => msgs.map(m => {
      if (m.id !== msgId) return m;
      const existing = m.reactions.find(r => r.emoji === emoji);
      if (existing) {
        return { ...m, reactions: m.reactions.map(r =>
          r.emoji === emoji
            ? { ...r, count: r.reacted ? r.count - 1 : r.count + 1, reacted: !r.reacted }
            : r
        ).filter(r => r.count > 0) };
      }
      return { ...m, reactions: [...m.reactions, { emoji, count: 1, reacted: true }] };
    });
    if (activeDm) setDmMessages(prev => ({ ...prev, [activeDm]: updater(prev[activeDm] ?? []) }));
    else          setMessages(prev => ({ ...prev, [activeChannel]: updater(prev[activeChannel] ?? []) }));
  };

  const dismissApproval = (id: string) => setApprovals(prev => prev.filter(a => a.id !== id));

  const totalUnread = CHANNELS.reduce((a, c) => a + c.unread, 0) + DM_USERS.reduce((a, d) => a + d.unread, 0);

  const selectChannel = (id: string) => { setActiveChannel(id); setActiveDm(null); };
  const selectDm      = (id: string) => { setActiveDm(id); };

  const lastChannelMsg = (id: string) => {
    const msgs = CHANNEL_MESSAGES[id] ?? [];
    return msgs[msgs.length - 1]?.message.slice(0, 42) ?? "No messages yet";
  };

  const lastChannelTime = (id: string) => {
    const msgs = CHANNEL_MESSAGES[id] ?? [];
    return msgs[msgs.length - 1]?.time.split(" ").slice(-2).join(" ") ?? "";
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 overflow-hidden rounded-xl border border-border shadow-sm bg-background">

      {/* ══════════════════════════════════════════════════════════
          LEFT PANEL — WhatsApp-style conversation list
      ══════════════════════════════════════════════════════════ */}
      <div className="w-[300px] shrink-0 flex flex-col border-r bg-card overflow-hidden">

        {/* Header */}
        <div className="px-4 py-3 border-b bg-muted/40 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-[10px] font-bold bg-primary text-primary-foreground">
                  {roleInfo.msgAvatar}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-sm leading-tight">Command Center</p>
                <p className="text-[10px] text-muted-foreground">Code Core IMS · {roleInfo.label}</p>
              </div>
            </div>
            {totalUnread > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center">
                {totalUnread}
              </span>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search conversations…"
              className="pl-8 h-8 text-xs bg-background border-border rounded-lg"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X size={12} className="text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1">

          {/* ── CHANNELS ── */}
          <div className="pt-2">
            <button
              onClick={() => setChannelsOpen(o => !o)}
              className="w-full flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              {channelsOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              Channels
            </button>

            <AnimatePresence initial={false}>
              {channelsOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  {CHANNELS.map(ch => {
                    const Icon     = ch.icon;
                    const isActive = !activeDm && activeChannel === ch.id;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => selectChannel(ch.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 transition-colors border-b border-border/40",
                          isActive ? "bg-primary/8" : "hover:bg-muted/60"
                        )}
                      >
                        {/* Channel icon avatar */}
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                          isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          <Icon size={16} />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between">
                            <span className={cn("text-sm font-semibold truncate", isActive ? "text-primary" : "text-foreground")}>
                              #{ch.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0 ml-1">{lastChannelTime(ch.id)}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{lastChannelMsg(ch.id)}</p>
                        </div>

                        {/* Unread badge */}
                        {ch.unread > 0 && !isActive && (
                          <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shrink-0">
                            {ch.unread}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── DIRECT MESSAGES ── */}
          <div className="pt-1">
            <button
              onClick={() => setDmsOpen(o => !o)}
              className="w-full flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              {dmsOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              Direct Messages
            </button>

            {roleInfo.raw === "student" && (
              <p className="text-[10px] text-amber-600 px-4 pb-1">Interns can only message Admin.</p>
            )}

            <AnimatePresence initial={false}>
              {dmsOpen && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                  {visibleDms.map(dm => {
                    const isActive = activeDm === dm.id;
                    return (
                      <button
                        key={dm.id}
                        onClick={() => selectDm(dm.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 transition-colors border-b border-border/40",
                          isActive ? "bg-primary/8" : "hover:bg-muted/60"
                        )}
                      >
                        {/* Avatar with status dot */}
                        <div className="relative shrink-0">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className={cn("text-xs font-bold",
                              dm.role === "Admin"    ? "bg-purple-100 text-purple-700" :
                              dm.role === "Employee" ? "bg-blue-100 text-blue-700"     : "bg-emerald-100 text-emerald-700"
                            )}>{dm.avatar}</AvatarFallback>
                          </Avatar>
                          <span className={cn("absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-card", statusDot(dm.status))} />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between">
                            <span className={cn("text-sm font-semibold truncate", isActive && "text-primary")}>{dm.name}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0 ml-1 capitalize">{dm.status}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{dm.lastMessage}</p>
                        </div>

                        {/* Unread badge */}
                        {dm.unread > 0 && !isActive && (
                          <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center shrink-0">
                            {dm.unread}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>

      {/* ══════════════════════════════════════════════════════════
          CENTER PANEL — Chat area
      ══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">

        {/* Chat header */}
        <div className="px-4 py-3 border-b flex items-center justify-between shrink-0 bg-card">
          <div className="flex items-center gap-3">
            {activeDm ? (
              <>
                <div className="relative">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className={cn("text-xs font-bold",
                      currentDm?.role === "Admin"    ? "bg-purple-100 text-purple-700" :
                      currentDm?.role === "Employee" ? "bg-blue-100 text-blue-700"     : "bg-emerald-100 text-emerald-700"
                    )}>{currentDm?.avatar}</AvatarFallback>
                  </Avatar>
                  <span className={cn("absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-card", statusDot(currentDm?.status ?? "offline"))} />
                </div>
                <div>
                  <p className="font-bold text-sm leading-tight">{currentDm?.name}</p>
                  <p className="text-[11px] text-muted-foreground capitalize">{currentDm?.status} · {currentDm?.role}</p>
                </div>
              </>
            ) : (
              <>
                <div className={cn("h-9 w-9 rounded-full flex items-center justify-center bg-primary text-primary-foreground")}>
                  {currentChannel && <currentChannel.icon size={16} />}
                </div>
                <div>
                  <p className="font-bold text-sm leading-tight">#{currentChannel?.name}</p>
                  <p className="text-[11px] text-muted-foreground">{currentChannel?.members} members{pinnedMessages.length > 0 ? ` · ${pinnedMessages.length} pinned` : ""}</p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1">
            {activeDm && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Phone size={15} /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg"><Video size={15} /></Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setShowRightPanel(v => !v)}>
              <Info size={15} className={showRightPanel ? "text-primary" : ""} />
            </Button>
          </div>
        </div>

        {/* Channel description banner */}
        {!activeDm && currentChannel && (
          <div className="px-4 py-2 bg-muted/30 border-b text-xs text-muted-foreground flex items-center gap-2 shrink-0">
            <currentChannel.icon size={11} className="text-primary shrink-0" />
            <span>{currentChannel.description}</span>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto py-3 space-y-1">
          {filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <MessageSquare size={40} className="opacity-20" />
              <p className="text-sm">{search ? `No messages matching "${search}"` : "No messages yet. Start the conversation!"}</p>
            </div>
          ) : (
            filteredMessages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onReact={handleReact}
                isSelf={msg.avatar === roleInfo.msgAvatar}
              />
            ))
          )}
        </div>

        {/* Input bar */}
        <div className="px-4 py-3 border-t bg-card shrink-0">
          <div className="flex items-end gap-2 bg-muted/60 rounded-2xl px-4 py-2.5 border border-border/60">
            <Textarea
              placeholder={activeDm ? `Message ${currentDm?.name}…` : `Message #${currentChannel?.name}…`}
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              className="flex-1 bg-transparent border-none shadow-none resize-none text-sm min-h-[36px] max-h-[120px] p-0 focus-visible:ring-0 placeholder:text-muted-foreground/60"
              rows={1}
            />
            <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
              <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"><Paperclip size={15} /></button>
              <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"><AtSign size={15} /></button>
              <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"><Smile size={15} /></button>
              <Button
                size="icon"
                className="h-8 w-8 rounded-xl"
                onClick={handleSend}
                disabled={!msgInput.trim()}
              >
                <Send size={14} />
              </Button>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">
            <kbd className="bg-muted px-1 rounded text-[9px]">Enter</kbd> to send ·{" "}
            <kbd className="bg-muted px-1 rounded text-[9px]">Shift+Enter</kbd> for new line
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          RIGHT PANEL — Detail / Info panel (toggleable)
      ══════════════════════════════════════════════════════════ */}
      <AnimatePresence initial={false}>
        {showRightPanel && (
          <motion.div
            key="right-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 272, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 border-l bg-card flex flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto">

              {/* ── Conversation info header ── */}
              <div className="p-4 border-b bg-muted/30 text-center">
                {activeDm ? (
                  <>
                    <div className="relative inline-block mb-2">
                      <Avatar className="h-14 w-14 mx-auto">
                        <AvatarFallback className={cn("text-base font-bold",
                          currentDm?.role === "Admin"    ? "bg-purple-100 text-purple-700" :
                          currentDm?.role === "Employee" ? "bg-blue-100 text-blue-700"     : "bg-emerald-100 text-emerald-700"
                        )}>{currentDm?.avatar}</AvatarFallback>
                      </Avatar>
                      <span className={cn("absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card", statusDot(currentDm?.status ?? "offline"))} />
                    </div>
                    <p className="font-bold text-sm">{currentDm?.name}</p>
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", roleBadge(currentDm?.role ?? "Intern"))}>
                      {currentDm?.role}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-1 capitalize">{currentDm?.status}</p>
                  </>
                ) : (
                  <>
                    <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center mx-auto mb-2">
                      {currentChannel && <currentChannel.icon size={22} className="text-primary-foreground" />}
                    </div>
                    <p className="font-bold text-sm">#{currentChannel?.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">{currentChannel?.members} members</p>
                  </>
                )}
              </div>

              {/* ── About ── */}
              {!activeDm && currentChannel && (
                <div className="p-4 border-b">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">About</p>
                  <p className="text-[12px] text-foreground/80 leading-relaxed">{currentChannel.description}</p>
                </div>
              )}

              {/* ── Pinned Messages ── */}
              {pinnedMessages.length > 0 && (
                <div className="p-4 border-b">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Pin size={10} className="text-amber-500" /> Pinned ({pinnedMessages.length})
                  </p>
                  <div className="space-y-2">
                    {pinnedMessages.map(pm => (
                      <div key={pm.id} className="bg-amber-50 border border-amber-200/60 rounded-lg px-3 py-2">
                        <p className="text-[10px] font-semibold text-amber-700 mb-0.5">{pm.user}</p>
                        <p className="text-[11px] text-foreground/80 leading-snug line-clamp-2">{pm.message.slice(0, 80)}…</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Pending Approvals (Admin view) ── */}
              {roleInfo.raw === "admin" && (
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pending Approvals</p>
                    {approvals.length > 0 && (
                      <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{approvals.length}</span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {approvals.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">All caught up! ✅</p>
                    ) : approvals.map(ap => {
                      const Icon = ap.icon;
                      return (
                        <motion.div
                          key={ap.id}
                          layout
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className={cn("flex items-start gap-2 p-2 rounded-lg border", ap.bg)}
                        >
                          <Icon size={12} className={cn("shrink-0 mt-0.5", ap.color)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold leading-tight">{ap.label}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{ap.desc}</p>
                            <p className="text-[9px] text-muted-foreground/60 mt-0.5">{ap.time}</p>
                          </div>
                          <button onClick={() => dismissApproval(ap.id)} className="shrink-0 p-0.5 hover:bg-black/10 rounded">
                            <X size={10} className="text-muted-foreground" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Active Now ── */}
              <div className="p-4 border-b">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Active Now</p>
                <div className="space-y-2">
                  {[
                    { id: "self", name: "Admin", avatar: "AD", role: "Admin" as const, status: "online" as UserStatus },
                    ...DM_USERS.filter(d => d.id !== "dm-admin" && (d.status === "online" || d.status === "away")),
                  ].map(u => (
                    <div key={u.id} className="flex items-center gap-2.5">
                      <div className="relative">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className={cn("text-[9px] font-bold",
                            u.role === "Admin"    ? "bg-purple-100 text-purple-700" :
                            "role" in u && u.role === "Employee" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
                          )}>{u.avatar}</AvatarFallback>
                        </Avatar>
                        <span className={cn("absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-card", statusDot(u.status))} />
                      </div>
                      <span className="text-[12px] flex-1 truncate">{u.name}</span>
                      <span className={cn("text-[10px] capitalize",
                        u.status === "online" ? "text-green-500" : "text-yellow-500"
                      )}>{u.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Recent Activity ── */}
              <div className="p-4 border-b">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Recent Activity</p>
                <div className="space-y-2.5">
                  {RECENT_ACTIVITIES.map((a, i) => {
                    const Icon = a.icon;
                    return (
                      <div key={i} className="flex items-start gap-2.5">
                        <Icon size={12} className={cn("shrink-0 mt-0.5", a.color)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] leading-tight">{a.text}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{a.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Upcoming ── */}
              <div className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Upcoming</p>
                <div className="space-y-2">
                  {[
                    { label: "Sprint S01 ends",          time: "Jun 30"   },
                    { label: "Q2 Performance Review",    time: "Jul 5"    },
                    { label: "Certificate Issuance",     time: "Jul 1–15" },
                    { label: "Office Holiday",           time: "Jul 4"    },
                  ].map(ev => (
                    <div key={ev.label} className="flex items-center justify-between">
                      <span className="text-[11px] text-foreground/80 truncate">{ev.label}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2 font-medium">{ev.time}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Collapse button */}
            <div className="p-3 border-t shrink-0">
              <button
                onClick={() => setShowRightPanel(false)}
                className="w-full flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1 rounded-lg hover:bg-muted"
              >
                <ArrowLeft size={12} /> Hide Info Panel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
