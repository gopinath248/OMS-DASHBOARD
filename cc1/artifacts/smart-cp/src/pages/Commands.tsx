import { useCallback, useState, useRef, useEffect } from "react";
import {
  Hash, Send, Search, Pin, ChevronDown, ChevronRight,
  Users, Paperclip, Smile, AtSign, MoreHorizontal, Phone,
  Video, Megaphone, CalendarDays, FolderOpen,
  Kanban, CheckCircle2, MessageSquare, X,
  AlertTriangle, Zap, Info, ArrowLeft, Copy, Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getAuthSession, roleToNavigationRole, type NavigationRole } from "@/lib/auth";

type UserStatus = "online" | "away" | "offline" | "busy";
type MessageReaction = { emoji: string; count: number; reacted?: boolean };
type ChatAttachment = {
  name: string;
  size: number;
  type: string;
  lastModified?: number;
};

interface ChatMessage {
  id: string;
  conversationId?: string;
  senderId?: string | null;
  user: string;
  avatar: string;
  avatarUrl?: string | null;
  role: "Admin" | "Employee" | "Intern";
  time: string;
  createdAt?: string;
  message: string;
  pinned?: boolean;
  reactions: MessageReaction[];
  replyTo?: string;
  replyUser?: string;
  replySnippet?: string;
  attachment?: ChatAttachment | null;
}
interface Channel {
  id: string;
  name: string;
  icon: React.ElementType;
  unread: number;
  description: string;
  members: number;
  pinCount?: number;
  lastMessage?: string;
  lastMessageAt?: string | null;
}

interface DmUser {
  id: string;
  name: string;
  avatar: string;
  avatarUrl?: string | null;
  role: "Admin" | "Employee" | "Intern";
  status: UserStatus;
  unread: number;
  lastMessage: string;
  phone?: string;
}

type BootstrapResponse = {
  channels: Array<{
    id: string;
    name: string;
    description: string;
    icon?: string;
    unread?: number;
    members?: number;
    lastMessage?: string;
    lastMessageAt?: string | null;
  }>;
  directConversations: Array<{
    id: string;
    directKey: string;
    lastMessage?: string;
    lastMessageAt?: string | null;
  }>;
  users: Array<{
    id: string;
    name: string;
    avatar: string;
    avatarUrl?: string | null;
    role: "Admin" | "Employee" | "Intern";
    status?: UserStatus;
    unread?: number;
    phone?: string;
  }>;
};

type ConversationMembersResponse = {
  members: Array<{
    id: string;
    name: string;
    avatar: string;
    avatarUrl?: string | null;
    role: "Admin" | "Employee" | "Intern";
    status?: UserStatus;
    phone?: string;
  }>;
};

const CHANNEL_ICON_MAP: Record<string, React.ElementType> = {
  Megaphone,
  CalendarDays,
  FolderOpen,
  Kanban,
  Hash,
  Users,
  CheckCircle2,
};

const CHANNELS: Channel[] = [
  { id: "channel:announcements",    name: "Announcements",    icon: Megaphone,     unread: 0, description: "Official company announcements and policy updates", members: 0, pinCount: 0 },
  { id: "channel:leave-requests",   name: "Leave Requests",   icon: CalendarDays,  unread: 0, description: "Leave approvals, rejections, and status updates", members: 0 },
  { id: "channel:project-updates",  name: "Project Updates",  icon: FolderOpen,    unread: 0, description: "Project progress, milestones, and blockers", members: 0 },
  { id: "channel:sprint-updates",   name: "Sprint Updates",   icon: Kanban,        unread: 0, description: "Sprint ceremonies, stories, and velocity tracking", members: 0 },
  { id: "channel:general",          name: "General",          icon: Hash,          unread: 0, description: "General discussion, water-cooler chats", members: 0 },
  { id: "channel:hr-updates",       name: "HR Updates",       icon: Users,         unread: 0, description: "HR policies, onboarding, performance news", members: 0 },
  { id: "channel:task-completions", name: "Task Completions", icon: CheckCircle2,  unread: 0, description: "Task done notifications and recognition", members: 0 },
];

type ApprovalItem = {
  id: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  label: string;
  desc: string;
  time: string;
};

type RecentActivity = {
  icon: React.ElementType;
  color: string;
  text: string;
  time: string;
};

const PENDING_APPROVALS: ApprovalItem[] = [];
const RECENT_ACTIVITIES: RecentActivity[] = [];

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
  const session = getAuthSession();
  const r: NavigationRole = session ? roleToNavigationRole(session.user.role) : "intern";
  const label     = r === "intern" ? "Intern" : r === "employee" ? "Employee" : "Admin";
  const msgRole   = r === "intern" ? "Intern" : r === "employee" ? "Employee" : "Admin";
  const msgUser   = session?.user.fullName ?? (r === "intern" ? "Intern User" : r === "employee" ? "Employee User" : "Admin");
  const userId    = session?.user.userId ?? "";
  const msgAvatar = session?.user.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase() || (r === "intern" ? "IN" : r === "employee" ? "EM" : "AD");
  const msgAvatarUrl = session?.user.avatarUrl ?? null;
  return { raw: r, label, msgRole, msgUser, msgAvatar, msgAvatarUrl, userId } as const;
}

type RoleMsgRole = "Admin" | "Employee" | "Intern";

function getVisibleDms(rawRole: string, users: DmUser[]): DmUser[] {
  if (rawRole === "intern") return users.filter(d => d.role === "Admin");
  if (rawRole === "employee") return users.filter(d => d.role === "Admin" || d.role === "Employee");
  return users;
}

async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = getAuthSession();
  if (!session) throw new Error("Your session has expired. Please log in again.");

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }

  const response = await fetch(`/api${path}`, { ...init, headers });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message ?? payload?.error ?? "Chat request failed.");
  }

  return payload as T;
}

function conversationOtherUserId(directKey: string, selfUserId: string) {
  return directKey.split(":").find(id => id !== selfUserId) ?? "";
}

function upsertMessage(map: Record<string, ChatMessage[]>, message: ChatMessage) {
  const conversationId = message.conversationId;
  if (!conversationId) return map;

  const existing = map[conversationId] ?? [];
  const next = existing.some(item => item.id === message.id)
    ? existing.map(item => item.id === message.id ? message : item)
    : [...existing, message];

  return {
    ...map,
    [conversationId]: next.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTime - bTime || a.id.localeCompare(b.id);
    }),
  };
}

interface MessageBubbleProps {
  msg: ChatMessage;
  onReact: (msgId: string, emoji: string) => void;
  onCopy: (message: ChatMessage) => Promise<void>;
  isSelf?: boolean;
}
function MessageBubble({ msg, onReact, onCopy, isSelf }: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyMessage = async () => {
    await onCopy(msg);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
    setShowMore(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("group flex gap-3 px-4 py-2 hover:bg-muted/30 rounded-xl transition-colors", isSelf && "flex-row-reverse")}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        {msg.avatarUrl && <AvatarImage src={msg.avatarUrl} alt={msg.user} />}
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
          {msg.attachment && (
            <div className={cn(
              "mt-2 flex items-center gap-2 rounded-lg border px-2 py-1 text-xs",
              isSelf ? "border-primary-foreground/30 bg-primary-foreground/10" : "border-border bg-background/70"
            )}>
              <Paperclip size={12} />
              <span className="max-w-[220px] truncate">{msg.attachment.name}</span>
            </div>
          )}
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
            <button
              onClick={copyMessage}
              className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              aria-label="Copy message"
              title="Copy message"
            >
              {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMore(v => !v)}
                className="p-1 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                aria-label="More message options"
                title="More message options"
              >
                <MoreHorizontal size={14} />
              </button>
              {showMore && (
                <div className="absolute right-0 top-7 z-20 min-w-28 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
                  <button
                    onClick={copyMessage}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                  >
                    {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function CommandCenter() {
  const roleInfo   = getRoleInfo();

  const [channels, setChannels]             = useState<Channel[]>(CHANNELS);
  const [dmUsers, setDmUsers]               = useState<DmUser[]>([]);
  const visibleDms                          = getVisibleDms(roleInfo.raw, dmUsers);
  const [activeChannel, setActiveChannel]   = useState("channel:announcements");
  const [activeDm, setActiveDm]             = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState("channel:announcements");
  const [directConversationIds, setDirectConversationIds] = useState<Record<string, string>>({});
  const [channelsOpen, setChannelsOpen]     = useState(true);
  const [dmsOpen, setDmsOpen]               = useState(true);
  const [msgInput, setMsgInput]             = useState("");
  const [search, setSearch]                 = useState("");
  const [messages, setMessages]             = useState<Record<string, ChatMessage[]>>({});
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending]               = useState(false);
  const [connectionState, setConnectionState] = useState("Connecting");
  const [approvals, setApprovals]           = useState(PENDING_APPROVALS);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [showComposerMore, setShowComposerMore] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<ChatAttachment | null>(null);
  const [conversationMembers, setConversationMembers] = useState<Record<string, DmUser[]>>({});
  const [activeCall, setActiveCall] = useState<{ mode: "phone" | "video"; name: string } | null>(null);
  const [callError, setCallError] = useState("");
  const scrollRef                           = useRef<HTMLDivElement>(null);
  const inputRef                            = useRef<HTMLTextAreaElement>(null);
  const fileInputRef                        = useRef<HTMLInputElement>(null);
  const mediaStreamRef                      = useRef<MediaStream | null>(null);
  const videoRef                            = useRef<HTMLVideoElement>(null);
  const requestedConversationId             = useRef(new URLSearchParams(window.location.search).get("conversation"));

  const currentChannel = channels.find(c => c.id === activeChannel);
  const currentDm      = visibleDms.find(d => d.id === activeDm);

  const currentMessages: ChatMessage[] = messages[activeConversationId] ?? [];

  const filteredMessages = search
    ? currentMessages.filter(m =>
        m.message.toLowerCase().includes(search.toLowerCase()) ||
        m.user.toLowerCase().includes(search.toLowerCase())
      )
    : currentMessages;

  const pinnedMessages = currentMessages.filter(m => m.pinned);
  const mentionCandidates = (conversationMembers[activeConversationId] ?? [])
    .filter(member => member.id !== roleInfo.userId);
  const quickEmojis = ["😀", "😂", "👍", "❤️", "🎉", "🙏", "🔥", "✅", "🙌", "👏"];

  const clearConversationUnread = useCallback((conversationId: string) => {
    setChannels(prev => prev.map(channel =>
      channel.id === conversationId ? { ...channel, unread: 0 } : channel
    ));

    const dmUserId = Object.entries(directConversationIds).find(([, id]) => id === conversationId)?.[0];
    if (dmUserId) {
      setDmUsers(prev => prev.map(user =>
        user.id === dmUserId ? { ...user, unread: 0 } : user
      ));
    }
  }, [directConversationIds]);

  const incrementConversationUnread = useCallback((conversationId: string) => {
    setChannels(prev => prev.map(channel =>
      channel.id === conversationId ? { ...channel, unread: channel.unread + 1 } : channel
    ));

    const dmUserId = Object.entries(directConversationIds).find(([, id]) => id === conversationId)?.[0];
    if (dmUserId) {
      setDmUsers(prev => prev.map(user =>
        user.id === dmUserId ? { ...user, unread: user.unread + 1 } : user
      ));
    }
  }, [directConversationIds]);

  const markConversationRead = useCallback(async (conversationId: string) => {
    clearConversationUnread(conversationId);
    try {
      await apiJson<{ totalUnread: number }>(`/chat/conversations/${encodeURIComponent(conversationId)}/read`, {
        method: "POST",
      });
      window.dispatchEvent(new CustomEvent("chat:read"));
    } catch (error) {
      console.error("Chat read marker failed", error);
    }
  }, [clearConversationUnread]);

  const updateConversationPreview = useCallback((message: ChatMessage) => {
    if (!message.conversationId) return;
    setChannels(prev => prev.map(channel =>
      channel.id === message.conversationId
        ? { ...channel, lastMessage: message.message, lastMessageAt: message.createdAt ?? null }
        : channel
    ));

    const dmUserId = Object.entries(directConversationIds).find(([, id]) => id === message.conversationId)?.[0];
    if (dmUserId) {
      setDmUsers(prev => prev.map(user =>
        user.id === dmUserId ? { ...user, lastMessage: message.message } : user
      ));
    }
  }, [directConversationIds]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeConversationId, filteredMessages.length]);

  useEffect(() => {
    let cancelled = false;

    apiJson<BootstrapResponse>("/chat/bootstrap")
      .then(payload => {
        if (cancelled) return;

        const nextChannels = payload.channels.map(channel => ({
          id: channel.id,
          name: channel.name,
          icon: CHANNEL_ICON_MAP[channel.icon ?? "Hash"] ?? Hash,
          unread: channel.unread ?? 0,
          description: channel.description,
          members: channel.members ?? 0,
          pinCount: 0,
          lastMessage: channel.lastMessage,
          lastMessageAt: channel.lastMessageAt ?? null,
        }));

        const directMap: Record<string, string> = {};
        const directLastMessages: Record<string, string> = {};
        payload.directConversations.forEach(conversation => {
          const otherUserId = conversationOtherUserId(conversation.directKey, roleInfo.userId);
          if (otherUserId) {
            directMap[otherUserId] = conversation.id;
            directLastMessages[otherUserId] = conversation.lastMessage || "No messages yet";
          }
        });

        const firstChannelId = nextChannels[0]?.id ?? "channel:announcements";
        setChannels(nextChannels.length ? nextChannels : CHANNELS);
        setActiveChannel(prev => nextChannels.some(channel => channel.id === prev) ? prev : firstChannelId);
        setActiveConversationId(prev => prev && prev !== "channel:announcements" ? prev : firstChannelId);
        setDmUsers(payload.users.map(user => ({
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          avatarUrl: user.avatarUrl ?? null,
          role: user.role,
          status: user.status ?? "offline",
          unread: user.unread ?? 0,
          lastMessage: directLastMessages[user.id] ?? "No messages yet",
          phone: user.phone,
        })));
        setDirectConversationIds(directMap);

        const requested = requestedConversationId.current;
        if (requested) {
          requestedConversationId.current = null;
          if (nextChannels.some(channel => channel.id === requested)) {
            setActiveChannel(requested);
            setActiveDm(null);
            setActiveConversationId(requested);
          } else {
            const dmEntry = Object.entries(directMap).find(([, conversationId]) => conversationId === requested);
            if (dmEntry) {
              setActiveDm(dmEntry[0]);
              setActiveChannel("");
            }
            setActiveConversationId(requested);
          }
        }
      })
      .catch(error => {
        console.error("Chat bootstrap failed", error);
        setConnectionState("Offline");
      });

    return () => {
      cancelled = true;
    };
  }, [roleInfo.userId]);

  useEffect(() => {
    if (!activeConversationId) return;
    let cancelled = false;
    setLoadingMessages(true);

    apiJson<{ messages: ChatMessage[] }>(`/chat/conversations/${encodeURIComponent(activeConversationId)}/messages?limit=50`)
      .then(payload => {
        if (cancelled) return;
        setMessages(prev => ({ ...prev, [activeConversationId]: payload.messages }));
        void markConversationRead(activeConversationId);
      })
      .catch(error => {
        console.error("Chat message load failed", error);
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeConversationId, markConversationRead]);

  useEffect(() => {
    setConnectionState("Live");

    const onPresence = (event: Event) => {
      const presence = (event as CustomEvent<{ userId?: string; online?: boolean }>).detail;
      if (!presence.userId) return;
      setDmUsers(prev => prev.map(user =>
        user.id === presence.userId
          ? { ...user, status: presence.online ? "online" : "offline" }
          : user
      ));
    };

    const onMessage = (event: Event) => {
      const message = (event as CustomEvent<ChatMessage>).detail;
      setMessages(prev => upsertMessage(prev, message));
      updateConversationPreview(message);

      if (message.senderId === roleInfo.userId || !message.conversationId) return;
      if (message.conversationId === activeConversationId) {
        void markConversationRead(message.conversationId);
      } else {
        incrementConversationUnread(message.conversationId);
      }
    };

    const onReaction = (event: Event) => {
      const message = (event as CustomEvent<ChatMessage>).detail;
      setMessages(prev => upsertMessage(prev, message));
    };

    window.addEventListener("chat:message", onMessage);
    window.addEventListener("chat:reaction", onReaction);
    window.addEventListener("chat:presence", onPresence);

    return () => {
      window.removeEventListener("chat:message", onMessage);
      window.removeEventListener("chat:reaction", onReaction);
      window.removeEventListener("chat:presence", onPresence);
    };
  }, [activeConversationId, incrementConversationUnread, markConversationRead, roleInfo.userId, updateConversationPreview]);

  useEffect(() => {
    if (!activeConversationId || conversationMembers[activeConversationId]) return;
    let cancelled = false;

    apiJson<ConversationMembersResponse>(`/chat/conversations/${encodeURIComponent(activeConversationId)}/members`)
      .then(payload => {
        if (cancelled) return;
        setConversationMembers(prev => ({
          ...prev,
          [activeConversationId]: payload.members.map(member => ({
            id: member.id,
            name: member.name,
            avatar: member.avatar,
            avatarUrl: member.avatarUrl ?? null,
            role: member.role,
            status: member.status ?? "offline",
            unread: 0,
            lastMessage: "",
            phone: member.phone,
          })),
        }));
      })
      .catch(error => {
        console.error("Chat members load failed", error);
      });

    return () => {
      cancelled = true;
    };
  }, [activeConversationId, conversationMembers]);

  useEffect(() => {
    if (videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
    }
  }, [activeCall]);

  const insertComposerText = useCallback((text: string) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? msgInput.length;
    const end = input?.selectionEnd ?? msgInput.length;
    const next = `${msgInput.slice(0, start)}${text}${msgInput.slice(end)}`;
    setMsgInput(next);
    window.requestAnimationFrame(() => {
      input?.focus();
      const cursor = start + text.length;
      input?.setSelectionRange(cursor, cursor);
    });
  }, [msgInput]);

  const handleCopyMessage = async (message: ChatMessage) => {
    if (!message.message) return;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(message.message);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = message.message;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedAttachment({
      name: file.name,
      size: file.size,
      type: file.type || "application/octet-stream",
      lastModified: file.lastModified,
    });
    event.target.value = "";
  };

  const stopActiveCall = () => {
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    mediaStreamRef.current = null;
    setActiveCall(null);
  };

  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const startCall = async (mode: "phone" | "video") => {
    if (!currentDm) return;
    setCallError("");

    if (mode === "phone" && currentDm.phone) {
      window.location.href = `tel:${currentDm.phone}`;
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCallError("Calls are not supported by this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === "video",
      });
      mediaStreamRef.current = stream;
      setActiveCall({ mode, name: currentDm.name });
    } catch (error) {
      console.error("Chat call failed", error);
      setCallError("Unable to start the call from this browser.");
    }
  };

  const handleSend = async () => {
    const body = msgInput.trim();
    if ((!body && !selectedAttachment) || !activeConversationId || sending) return;

    setSending(true);
    try {
      const clientMessageId = crypto.randomUUID?.() ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const payload = await apiJson<{ message: ChatMessage }>(
        `/chat/conversations/${encodeURIComponent(activeConversationId)}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            message: body,
            clientMessageId,
            attachment: selectedAttachment,
            messageType: selectedAttachment ? "attachment" : "text",
          }),
        },
      );
      setMessages(prev => upsertMessage(prev, payload.message));
      updateConversationPreview(payload.message);
      setMsgInput("");
      setSelectedAttachment(null);
    } catch (error) {
      console.error("Chat send failed", error);
    } finally {
      setSending(false);
    }
  };

  const handleReact = async (msgId: string, emoji: string) => {
    try {
      const payload = await apiJson<{ message: ChatMessage }>(
        `/chat/messages/${encodeURIComponent(msgId)}/reactions`,
        {
          method: "POST",
          body: JSON.stringify({ emoji }),
        },
      );
      setMessages(prev => upsertMessage(prev, payload.message));
    } catch (error) {
      console.error("Chat reaction failed", error);
    }
  };

  const dismissApproval = (id: string) => setApprovals(prev => prev.filter(a => a.id !== id));

  const totalUnread = channels.reduce((a, c) => a + c.unread, 0) + visibleDms.reduce((a, d) => a + d.unread, 0);

  const selectChannel = (id: string) => {
    setActiveChannel(id);
    setActiveDm(null);
    setActiveConversationId(id);
    void markConversationRead(id);
  };

  const selectDm = async (id: string) => {
    setActiveDm(id);
    setActiveChannel("");
    const existingConversationId = directConversationIds[id];
    if (existingConversationId) {
      setActiveConversationId(existingConversationId);
      void markConversationRead(existingConversationId);
      return;
    }

    try {
      const payload = await apiJson<{ conversation: { id: string } }>("/chat/conversations/direct", {
        method: "POST",
        body: JSON.stringify({ targetUserId: id }),
      });
      setDirectConversationIds(prev => ({ ...prev, [id]: payload.conversation.id }));
      setActiveConversationId(payload.conversation.id);
      void markConversationRead(payload.conversation.id);
    } catch (error) {
      console.error("Direct conversation setup failed", error);
    }
  };

  const lastChannelMsg = (id: string) => {
    const msgs = messages[id] ?? [];
    const channel = channels.find(ch => ch.id === id);
    return msgs[msgs.length - 1]?.message.slice(0, 42) ?? channel?.lastMessage?.slice(0, 42) ?? "No messages yet";
  };

  const lastChannelTime = (id: string) => {
    const msgs = messages[id] ?? [];
    const channel = channels.find(ch => ch.id === id);
    if (msgs.length) return msgs[msgs.length - 1]?.time.split(" ").slice(-2).join(" ") ?? "";
    if (!channel?.lastMessageAt) return "";
    return new Date(channel.lastMessageAt).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] min-h-[640px] gap-0 overflow-hidden bg-background">

      {/* ══════════════════════════════════════════════════════════
          LEFT PANEL — WhatsApp-style conversation list
      ══════════════════════════════════════════════════════════ */}
      <div className="w-[300px] shrink-0 flex flex-col border-r bg-background overflow-hidden">

        {/* Header */}
        <div className="px-4 py-3 border-b bg-background shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-[10px] font-bold bg-primary text-primary-foreground">
                  {roleInfo.msgAvatar}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold text-sm leading-tight">Chat Center</p>
                <p className="text-[10px] text-muted-foreground">{connectionState}</p>
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
                  {channels.map(ch => {
                    const Icon     = ch.icon;
                    const isActive = !activeDm && activeChannel === ch.id;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => selectChannel(ch.id)}
                        className={cn(
                          "w-[calc(100%-0.5rem)] mx-1 mb-1 flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                          isActive
                            ? "border-primary/40 bg-primary/8 shadow-sm"
                            : "border-border/60 hover:border-primary/30 hover:bg-muted/60"
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

            {roleInfo.raw === "intern" && (
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
                          "w-[calc(100%-0.5rem)] mx-1 mb-1 flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                          isActive
                            ? "border-primary/40 bg-primary/8 shadow-sm"
                            : "border-border/60 hover:border-primary/30 hover:bg-muted/60"
                        )}
                      >
                        {/* Avatar with status dot */}
                        <div className="relative shrink-0">
                          <Avatar className="h-10 w-10">
                            {dm.avatarUrl && <AvatarImage src={dm.avatarUrl} alt={dm.name} />}
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
        <div className="px-4 py-3 border-b flex items-center justify-between shrink-0 bg-background">
          <div className="flex items-center gap-3">
            {activeDm ? (
              <>
                <div className="relative">
                  <Avatar className="h-9 w-9">
                    {currentDm?.avatarUrl && <AvatarImage src={currentDm.avatarUrl} alt={currentDm.name} />}
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => startCall("phone")}
                  title="Phone call"
                >
                  <Phone size={15} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg"
                  onClick={() => startCall("video")}
                  title="Video call"
                >
                  <Video size={15} />
                </Button>
              </>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setShowRightPanel(v => !v)}>
              <Info size={15} className={showRightPanel ? "text-primary" : ""} />
            </Button>
          </div>
        </div>

        {(activeCall || callError) && (
          <div className="border-b bg-muted/40 px-4 py-2 text-xs">
            {activeCall ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  {activeCall.mode === "video" ? <Video size={14} className="text-primary" /> : <Phone size={14} className="text-primary" />}
                  <span className="truncate font-medium">
                    {activeCall.mode === "video" ? "Video call" : "Phone call"} with {activeCall.name}
                  </span>
                </div>
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={stopActiveCall}>
                  End
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 text-destructive">
                <span>{callError}</span>
                <button onClick={() => setCallError("")} className="rounded p-1 hover:bg-muted">
                  <X size={12} />
                </button>
              </div>
            )}
            {activeCall?.mode === "video" && (
              <video ref={videoRef} autoPlay muted playsInline className="mt-2 h-28 w-44 rounded-lg bg-black object-cover" />
            )}
          </div>
        )}

        {/* Channel description banner */}
        {!activeDm && currentChannel && (
          <div className="px-4 py-2 bg-muted/30 border-b text-xs text-muted-foreground flex items-center gap-2 shrink-0">
            <currentChannel.icon size={11} className="text-primary shrink-0" />
            <span>{currentChannel.description}</span>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto py-3 space-y-1">
          {loadingMessages ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <MessageSquare size={40} className="opacity-20" />
              <p className="text-sm">Loading messages...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
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
                onCopy={handleCopyMessage}
                isSelf={msg.senderId === roleInfo.userId}
              />
            ))
          )}
        </div>

        {/* Input bar */}
        <div className="px-4 py-3 border-t bg-background shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelected}
          />
          {selectedAttachment && (
            <div className="mb-2 flex w-fit max-w-full items-center gap-2 rounded-lg border bg-muted/60 px-3 py-1.5 text-xs">
              <Paperclip size={13} />
              <span className="max-w-[320px] truncate">{selectedAttachment.name}</span>
              <button onClick={() => setSelectedAttachment(null)} className="rounded p-0.5 hover:bg-muted" aria-label="Remove attachment">
                <X size={12} />
              </button>
            </div>
          )}
          <div className="relative flex min-w-0 items-end gap-2 bg-muted/60 rounded-2xl px-4 py-2.5 border border-border/60">
            <Textarea
              ref={inputRef}
              placeholder={activeDm ? `Message ${currentDm?.name}…` : `Message #${currentChannel?.name}…`}
              value={msgInput}
              onChange={e => setMsgInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              className="min-w-0 flex-1 box-border bg-transparent border-none shadow-none resize-none text-sm leading-5 min-h-[36px] max-h-[120px] px-1.5 py-1 focus-visible:ring-0 placeholder:text-muted-foreground/60"
              rows={1}
            />
            <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
                aria-label="Attach file"
                title="Attach file"
              >
                <Paperclip size={15} />
              </button>
              <button
                onClick={() => {
                  setShowMentionPicker(v => !v);
                  setShowEmojiPicker(false);
                  setShowComposerMore(false);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
                aria-label="Mention"
                title="Mention"
              >
                <AtSign size={15} />
              </button>
              <button
                onClick={() => {
                  setShowEmojiPicker(v => !v);
                  setShowMentionPicker(false);
                  setShowComposerMore(false);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
                aria-label="Emoji"
                title="Emoji"
              >
                <Smile size={15} />
              </button>
              <button
                onClick={() => {
                  setShowComposerMore(v => !v);
                  setShowEmojiPicker(false);
                  setShowMentionPicker(false);
                }}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted"
                aria-label="More options"
                title="More options"
              >
                <MoreHorizontal size={15} />
              </button>
              <Button
                size="icon"
                className="h-8 w-8 rounded-xl"
                onClick={handleSend}
                disabled={(!msgInput.trim() && !selectedAttachment) || sending || !activeConversationId}
              >
                <Send size={14} />
              </Button>
            </div>
            {showEmojiPicker && (
              <div className="absolute bottom-14 right-16 z-20 grid grid-cols-5 gap-1 rounded-xl border bg-popover p-2 text-popover-foreground shadow-md">
                {quickEmojis.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => {
                      insertComposerText(emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="rounded-lg p-1.5 text-lg hover:bg-muted"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            {showMentionPicker && (
              <div className="absolute bottom-14 right-10 z-20 max-h-56 w-64 overflow-y-auto rounded-xl border bg-popover p-1 text-popover-foreground shadow-md">
                {mentionCandidates.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No members available</p>
                ) : mentionCandidates.map(member => (
                  <button
                    key={member.id}
                    onClick={() => {
                      insertComposerText(`@${member.name} `);
                      setShowMentionPicker(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-muted"
                  >
                    <Avatar className="h-6 w-6">
                      {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt={member.name} />}
                      <AvatarFallback className={cn("text-[9px] font-bold", avatarBg(member.role))}>{member.avatar}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium">{member.name}</span>
                    <span className="text-[10px] text-muted-foreground">{member.role}</span>
                  </button>
                ))}
              </div>
            )}
            {showComposerMore && (
              <div className="absolute bottom-14 right-2 z-20 w-44 rounded-xl border bg-popover p-1 text-popover-foreground shadow-md">
                <button
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowComposerMore(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-muted"
                >
                  <Paperclip size={13} /> Attach file
                </button>
                <button
                  onClick={() => {
                    setShowMentionPicker(true);
                    setShowComposerMore(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-muted"
                >
                  <AtSign size={13} /> Mention
                </button>
                <button
                  onClick={() => {
                    setShowEmojiPicker(true);
                    setShowComposerMore(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-muted"
                >
                  <Smile size={13} /> Emoji
                </button>
              </div>
            )}
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
            className="shrink-0 border-l bg-background flex flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto">

              {/* ── Conversation info header ── */}
              <div className="p-4 border-b bg-muted/30 text-center">
                {activeDm ? (
                  <>
                    <div className="relative inline-block mb-2">
                      <Avatar className="h-14 w-14 mx-auto">
                        {currentDm?.avatarUrl && <AvatarImage src={currentDm.avatarUrl} alt={currentDm.name} />}
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
                    { id: "self", name: roleInfo.msgUser, avatar: roleInfo.msgAvatar, avatarUrl: roleInfo.msgAvatarUrl, role: roleInfo.msgRole as RoleMsgRole, status: "online" as UserStatus },
                    ...dmUsers.filter(d => d.status === "online" || d.status === "away"),
                  ].map(u => (
                    <div key={u.id} className="flex items-center gap-2.5">
                      <div className="relative">
                        <Avatar className="h-6 w-6">
                          {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt={u.name} />}
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

              {RECENT_ACTIVITIES.length > 0 && (
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
              )}

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
