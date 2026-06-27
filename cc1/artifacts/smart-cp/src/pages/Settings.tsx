import { useState, useEffect, useRef } from "react";
import { User, Palette, Bell, Shield, Check, Monitor, Sun, Moon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/lib/theme-provider";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const BASE_MODES = [
  {
    id: "light" as const,
    label: "Light",
    icon: Sun,
    preview: (
      <div className="bg-slate-50 rounded-lg p-2 w-full h-20 border border-slate-200">
        <div className="bg-white rounded shadow-sm w-full h-full p-2 space-y-1.5">
          <div className="w-full h-1.5 bg-slate-200 rounded" />
          <div className="w-2/3 h-1.5 bg-slate-100 rounded" />
          <div className="flex gap-1 mt-2">
            <div className="w-8 h-3 bg-yellow-500 rounded" />
            <div className="w-5 h-3 bg-slate-200 rounded" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "dark" as const,
    label: "Dark",
    icon: Moon,
    preview: (
      <div className="bg-slate-950 rounded-lg p-2 w-full h-20 border border-slate-800">
        <div className="bg-slate-900 rounded w-full h-full p-2 space-y-1.5">
          <div className="w-full h-1.5 bg-slate-700 rounded" />
          <div className="w-2/3 h-1.5 bg-slate-800 rounded" />
          <div className="flex gap-1 mt-2">
            <div className="w-8 h-3 bg-yellow-500 rounded" />
            <div className="w-5 h-3 bg-slate-700 rounded" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "system" as const,
    label: "System",
    icon: Monitor,
    preview: (
      <div className="rounded-lg overflow-hidden w-full h-20 border border-slate-300 flex">
        <div className="w-1/2 bg-slate-50 p-2 space-y-1.5">
          <div className="w-full h-1.5 bg-slate-200 rounded" />
          <div className="w-1/2 h-1.5 bg-slate-100 rounded" />
        </div>
        <div className="w-1/2 bg-slate-900 p-2 space-y-1.5">
          <div className="w-full h-1.5 bg-slate-700 rounded" />
          <div className="w-1/2 h-1.5 bg-slate-800 rounded" />
        </div>
      </div>
    ),
  },
];

const TABS = [
  { id: "profile",       label: "Profile",       icon: User },
  { id: "appearance",    label: "Appearance",    icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security",      label: "Security",      icon: Shield },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const { theme, setTheme }       = useTheme();
  const { toast }                 = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarSrc(reader.result as string);
      toast({ title: "Avatar updated", description: "Your profile picture has been changed." });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </div>
      <Separator />

      <div className="flex flex-col md:flex-row gap-7">
        {/* Sidebar nav */}
        <aside className="w-full md:w-52 shrink-0">
          <nav className="flex flex-col space-y-0.5">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                  activeTab === tab.id
                    ? "bg-muted font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 space-y-5">

          {/* ── Profile ─────────────────────────── */}
          {activeTab === "profile" && (
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-5">
                  <div className="relative cursor-pointer group" onClick={handleAvatarClick}>
                    <Avatar className="h-20 w-20">
                      {avatarSrc
                        ? <AvatarImage src={avatarSrc} />
                        : <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">AD</AvatarFallback>
                      }
                    </Avatar>
                    <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Upload size={18} className="text-white" />
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div>
                    <Button variant="outline" size="sm" onClick={handleAvatarClick}>Change Avatar</Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>First Name</Label><Input defaultValue="System" /></div>
                  <div className="space-y-1.5"><Label>Last Name</Label><Input defaultValue="Admin" /></div>
                  <div className="space-y-1.5"><Label>User ID</Label><Input defaultValue="AarthiCC001" /></div>
                  <div className="space-y-1.5"><Label>Phone</Label><Input type="tel" defaultValue="+91 9000000000" /></div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Bio</Label>
                    <Textarea
                      className="resize-none"
                      rows={3}
                      defaultValue="System Administrator at Code Core Global Hi-Tech Solutions."
                    />
                  </div>
                </div>
                <Button onClick={() => toast({ title: "Profile saved" })}>Save Changes</Button>
              </CardContent>
            </Card>
          )}

          {/* ── Appearance ──────────────────────── */}
          {activeTab === "appearance" && (
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle>Theme</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 max-w-lg">
                    {BASE_MODES.map(m => {
                      const Icon = m.icon;
                      const isActive = theme === m.id;
                      return (
                        <button
                          key={m.id}
                          onClick={() => setTheme(m.id)}
                          className={cn(
                            "relative border-2 rounded-xl p-3 cursor-pointer transition-all hover:shadow-md text-left",
                            isActive ? "border-primary shadow-md" : "border-border hover:border-primary/40"
                          )}
                        >
                          {isActive && (
                            <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                              <Check size={9} className="text-primary-foreground" />
                            </div>
                          )}
                          {m.preview}
                          <div className="flex items-center gap-1.5 mt-2 justify-center">
                            <Icon size={12} className="text-muted-foreground" />
                            <p className="text-xs font-semibold">{m.label}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Notifications ───────────────────── */}
          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-0">
                  {[
                    { label: "Task Assignments",    desc: "When you are assigned a new task" },
                    { label: "Leave Updates",       desc: "When leave request status changes" },
                    { label: "Sprint Updates",      desc: "Daily sprint standup summaries" },
                    { label: "Performance Alerts",  desc: "When intern scores drop below threshold" },
                    { label: "System Announcements",desc: "Important platform updates from admin" },
                    { label: "Command Center",      desc: "New messages and mentions" },
                  ].map(n => (
                    <div key={n.label} className="flex items-center justify-between py-3.5 border-b last:border-0">
                      <div>
                        <Label className="text-sm">{n.label}</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.desc}</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Security ────────────────────────── */}
          {activeTab === "security" && (
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border rounded-xl p-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Your account is protected by enterprise-grade security. Contact your system administrator for security settings and access management.
                  </p>
                </div>
                <div className="border rounded-xl p-4">
                  <h4 className="font-semibold text-sm mb-2">Current Session</h4>
                  <div className="flex justify-between items-center py-1 text-sm">
                    <div>
                      <p className="font-medium">Mac OS · Chrome 126</p>
                      <p className="text-xs text-muted-foreground">Logged in Jun 25, 2026</p>
                    </div>
                    <span className="text-xs text-green-600 font-semibold bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Active</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
