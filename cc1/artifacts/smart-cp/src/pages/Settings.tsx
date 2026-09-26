import { useEffect, useState, useRef } from "react";
import { User, Palette, Bell, Shield, Check, Monitor, Sun, Moon, Upload, Mail, Phone, IdCard, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/lib/theme-provider";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { getAuthSession, removeAvatar, updatePassword, uploadAvatar } from "@/lib/auth";

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
  const session = getAuthSession();
  const [savedAvatarUrl, setSavedAvatarUrl] = useState<string | null>(session?.user.avatarUrl ?? null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fullName = session?.user.fullName ?? "Admin User";
  const [profile, setProfile] = useState({
    name: fullName,
    userId: session?.user.userId ?? "",
    designation: session?.user.role ?? "Admin",
    email: session?.user.email ?? "aarthi@cc.local",
    phone: "",
  });
  const [profileErrors, setProfileErrors] = useState<Partial<Record<keyof typeof profile, string>>>({});
  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [securityError, setSecurityError] = useState("");
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();
  const avatarSrc = avatarPreview ?? savedAvatarUrl;

  useEffect(() => {
    setSavedAvatarUrl(session?.user.avatarUrl ?? null);
  }, [session?.user.avatarUrl]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const handleAvatarClick = () => fileInputRef.current?.click();
  const updateProfile = (key: keyof typeof profile) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile(prev => ({ ...prev, [key]: e.target.value }));
  };

  const saveProfile = () => {
    const errors: Partial<Record<keyof typeof profile, string>> = {};
    if (!profile.name.trim()) errors.name = "Name is required.";
    if (!profile.userId.trim()) errors.userId = "User ID is required.";
    if (!profile.designation.trim()) errors.designation = "Designation is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) errors.email = "Enter a valid email address.";
    if (!/^\d{10}$/.test(profile.phone)) errors.phone = "Please enter a valid 10-digit phone number.";
    setProfileErrors(errors);
    if (Object.keys(errors).length > 0) return;
    toast({ title: "Profile saved", description: "Profile details have been updated." });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast({ title: "Unsupported image", description: "Please choose a PNG, JPG, JPEG, or WEBP file.", variant: "destructive" });
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Please choose an avatar under 3 MB.", variant: "destructive" });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return previewUrl;
    });
    setAvatarUploading(true);

    try {
      const updatedUser = await uploadAvatar(file);
      setSavedAvatarUrl(updatedUser.avatarUrl ?? null);
      setAvatarPreview(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      toast({ title: "Avatar saved", description: "Your profile picture has been saved to your account." });
    } catch (err) {
      setAvatarPreview(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      toast({
        title: "Avatar upload failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!savedAvatarUrl || avatarUploading) return;
    setAvatarUploading(true);

    try {
      const updatedUser = await removeAvatar();
      setSavedAvatarUrl(updatedUser.avatarUrl ?? null);
      setAvatarPreview(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      toast({ title: "Avatar removed", description: "Your account is using the default initials avatar." });
    } catch (err) {
      toast({
        title: "Unable to remove avatar",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setAvatarUploading(false);
    }
  };

  const updateSecurity = (key: keyof typeof securityForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSecurityForm(prev => ({ ...prev, [key]: e.target.value }));
  };

  const savePassword = async () => {
    setSecurityError("");

    if (!securityForm.currentPassword.trim()) {
      setSecurityError("Current password is required.");
      return;
    }

    if (!securityForm.newPassword.trim()) {
      setSecurityError("New password is required.");
      return;
    }

    if (!securityForm.confirmPassword.trim()) {
      setSecurityError("Confirm password is required.");
      return;
    }

    if (securityForm.newPassword !== securityForm.confirmPassword) {
      setSecurityError("New password and confirm password do not match.");
      return;
    }

    try {
      await updatePassword(securityForm.currentPassword, securityForm.newPassword);
      setSecurityForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Password updated", description: "Your new password has been saved." });
    } catch (err) {
      setSecurityError(err instanceof Error ? err.message : "Unable to update password.");
    }
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
            <div className="space-y-5">
              <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-primary/20 to-secondary/20" />
                <div className="px-6 sm:px-8 pb-6">
                  <div className="flex flex-col sm:flex-row gap-5 sm:items-end -mt-12 relative z-10">
                    <div className="relative cursor-pointer group shrink-0" onClick={handleAvatarClick}>
                      <Avatar className="h-24 w-24 border-4 border-card bg-card shadow-sm">
                        {avatarSrc
                          ? <AvatarImage src={avatarSrc} alt={profile.name || fullName} />
                          : <AvatarFallback className="text-3xl bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
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
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h2 className="text-2xl font-bold leading-tight">{profile.name || "User Profile"}</h2>
                          <div className="text-muted-foreground flex flex-wrap items-center gap-2 mt-1">
                            <span className="font-medium text-foreground">{profile.userId || "User ID"}</span>
                            <span>•</span>
                            <span>{profile.designation || "Designation"}</span>
                            <span>•</span>
                            <span>CODE CORE</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge className="text-sm px-3 py-1">Active</Badge>
                          {savedAvatarUrl && (
                            <Button variant="outline" onClick={handleRemoveAvatar} disabled={avatarUploading}>
                              Remove
                            </Button>
                          )}
                          <Button className="gap-2" onClick={handleAvatarClick} disabled={avatarUploading}>
                            <Upload size={16} /> {avatarUploading ? "Saving..." : "Avatar"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-2"><User size={15} className="text-muted-foreground" /> Name</Label>
                      <Input value={profile.name} onChange={updateProfile("name")} />
                      {profileErrors.name && <p className="text-xs text-destructive">{profileErrors.name}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-2"><Mail size={15} className="text-muted-foreground" /> Email</Label>
                      <Input type="email" value={profile.email} onChange={updateProfile("email")} />
                      {profileErrors.email && <p className="text-xs text-destructive">{profileErrors.email}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-2"><Phone size={15} className="text-muted-foreground" /> Phone Number</Label>
                      <Input inputMode="numeric" placeholder="9876543210" value={profile.phone} onChange={updateProfile("phone")} />
                      {profileErrors.phone && <p className="text-xs text-destructive">{profileErrors.phone}</p>}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Account Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-2"><IdCard size={15} className="text-muted-foreground" /> User ID</Label>
                      <Input value={profile.userId} onChange={updateProfile("userId")} />
                      {profileErrors.userId && <p className="text-xs text-destructive">{profileErrors.userId}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-2"><Briefcase size={15} className="text-muted-foreground" /> Designation</Label>
                      <Input value={profile.designation} onChange={updateProfile("designation")} />
                      {profileErrors.designation && <p className="text-xs text-destructive">{profileErrors.designation}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Bio</Label>
                      <Textarea
                        className="resize-none"
                        rows={3}
                        defaultValue={`${session?.user.role ?? "Admin"} at CODE CORE Hi-Tech Solutions.`}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveProfile}>Save Changes</Button>
              </div>
            </div>
          )}

          {activeTab === "profile-old" && (
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-5">
                  <div className="relative cursor-pointer group" onClick={handleAvatarClick}>
                    <Avatar className="h-20 w-20">
                      {avatarSrc
                        ? <AvatarImage src={avatarSrc} alt={profile.name || fullName} />
                        : <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
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
                  <div className="min-w-0">
                    <p className="font-semibold">{profile.name}</p>
                    <p className="text-sm text-muted-foreground">{profile.designation}</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={handleAvatarClick}>Change Avatar</Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Name</Label>
                    <Input value={profile.name} onChange={updateProfile("name")} />
                    {profileErrors.name && <p className="text-xs text-destructive">{profileErrors.name}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>User ID</Label>
                    <Input value={profile.userId} onChange={updateProfile("userId")} />
                    {profileErrors.userId && <p className="text-xs text-destructive">{profileErrors.userId}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Designation</Label>
                    <Input value={profile.designation} onChange={updateProfile("designation")} />
                    {profileErrors.designation && <p className="text-xs text-destructive">{profileErrors.designation}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input type="email" value={profile.email} onChange={updateProfile("email")} />
                    {profileErrors.email && <p className="text-xs text-destructive">{profileErrors.email}</p>}
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Phone Number</Label>
                    <Input inputMode="numeric" placeholder="9876543210" value={profile.phone} onChange={updateProfile("phone")} />
                    {profileErrors.phone && <p className="text-xs text-destructive">{profileErrors.phone}</p>}
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>Bio</Label>
                    <Textarea
                      className="resize-none"
                      rows={3}
                      defaultValue={`${session?.user.role ?? "Admin"} at CODE CORE Hi-Tech Solutions.`}
                    />
                  </div>
                </div>
                <Button onClick={saveProfile}>Save Changes</Button>
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
                    { label: "Chat Center",         desc: "New messages and mentions" },
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
                  <h4 className="font-semibold text-sm mb-3">Change Password</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label>Current Password</Label>
                      <Input
                        type="password"
                        value={securityForm.currentPassword}
                        onChange={updateSecurity("currentPassword")}
                        autoComplete="current-password"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>New Password</Label>
                      <Input
                        type="password"
                        value={securityForm.newPassword}
                        onChange={updateSecurity("newPassword")}
                        autoComplete="new-password"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Confirm Password</Label>
                      <Input
                        type="password"
                        value={securityForm.confirmPassword}
                        onChange={updateSecurity("confirmPassword")}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                  {securityError && <p className="text-sm font-medium text-destructive mt-3">{securityError}</p>}
                  <Button className="mt-4" onClick={savePassword}>Update Password</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
