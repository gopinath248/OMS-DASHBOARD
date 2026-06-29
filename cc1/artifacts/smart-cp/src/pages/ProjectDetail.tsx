import { useState, useRef } from "react";
import { useParams, Link } from "wouter";
import {
  ArrowLeft, FolderOpen, Calendar, User, FileText, Upload, Download,
  Trash2, Search, Clock, Users, GraduationCap, Activity, CheckCircle2,
  PauseCircle, XCircle, Loader2, File, FileSpreadsheet, Archive, Image, Presentation
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  projects, projectDocuments, staff, students,
  ProjectDocument, ProjectStatus
} from "@/data/mockData";

const STATUS_CONFIG: Record<ProjectStatus, { color: string; icon: React.ElementType; bg: string }> = {
  Active:    { color: "text-green-700",  bg: "bg-green-100",  icon: CheckCircle2 },
  Planning:  { color: "text-blue-700",   bg: "bg-blue-100",   icon: Loader2 },
  "On Hold": { color: "text-yellow-700", bg: "bg-yellow-100", icon: PauseCircle },
  Completed: { color: "text-indigo-700", bg: "bg-indigo-100", icon: CheckCircle2 },
  Cancelled: { color: "text-red-700",    bg: "bg-red-100",    icon: XCircle },
};

const FILE_ICONS: Record<string, React.ElementType> = {
  pdf: File,
  docx: FileText,
  pptx: Presentation,
  xlsx: FileSpreadsheet,
  zip: Archive,
  image: Image,
};

const FILE_COLORS: Record<string, string> = {
  pdf: "text-red-500 bg-red-50",
  docx: "text-blue-500 bg-blue-50",
  pptx: "text-orange-500 bg-orange-50",
  xlsx: "text-green-500 bg-green-50",
  zip: "text-purple-500 bg-purple-50",
  image: "text-pink-500 bg-pink-50",
};

function StatusBadge({ status }: { status: ProjectStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${cfg.bg} ${cfg.color}`}>
      <Icon size={13} />
      {status}
    </span>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function DocumentRow({
  doc, role, onDelete
}: { doc: ProjectDocument; role: string; onDelete: (id: string) => void }) {
  const Icon = FILE_ICONS[doc.fileType] ?? File;
  const colors = FILE_COLORS[doc.fileType] ?? "text-gray-500 bg-gray-50";
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors group"
    >
      <div className={`p-2 rounded-lg ${colors} shrink-0`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{doc.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {doc.fileName} · {doc.sizeMB} MB · Uploaded by {doc.uploadedBy} · {formatDate(doc.uploadDate)}
        </p>
      </div>
      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Badge variant="outline" className="text-xs uppercase tracking-wide py-0">{doc.fileType}</Badge>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-primary"
          title="Download"
          onClick={() => {
            const a = document.createElement("a");
            a.href = "#";
            a.download = doc.fileName;
            a.click();
          }}
        >
          <Download size={14} />
        </Button>
        {role === "admin" && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            title="Delete"
            onClick={() => onDelete(doc.id)}
          >
            <Trash2 size={14} />
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const role = localStorage.getItem("role") || "admin";
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const project = projects.find(p => p.id === id);
  const [docs, setDocs] = useState<ProjectDocument[]>(
    projectDocuments.filter(d => d.projectId === id)
  );
  const [docSearch, setDocSearch] = useState("");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!project) {
    return (
      <div className="text-center py-32">
        <FolderOpen size={48} className="mx-auto mb-3 text-muted-foreground opacity-40" />
        <h2 className="text-xl font-bold mb-2">Project not found</h2>
        <Link href="/projects">
          <Button variant="outline" className="gap-2 mt-2"><ArrowLeft size={15} /> Back to Projects</Button>
        </Link>
      </div>
    );
  }

  const assignedStaffData = staff.filter(s => project.assignedStaff.includes(s.id));
  const assignedStudentData = students.filter(s => project.assignedInterns.includes(s.id));

  const filteredDocs = docs.filter(d =>
    !docSearch || d.title.toLowerCase().includes(docSearch.toLowerCase()) || d.fileName.toLowerCase().includes(docSearch.toLowerCase())
  );

  const startMs = new Date(project.startDate).getTime();
  const endMs = new Date(project.endDate).getTime();
  const nowMs = Date.now();
  const progressPct = Math.min(100, Math.max(0, Math.round(((nowMs - startMs) / (endMs - startMs)) * 100)));

  function handleDelete(docId: string) {
    setDocs(prev => prev.filter(d => d.id !== docId));
    toast({ title: "Document deleted", description: "The document has been removed from this project." });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      if (!uploadTitle) setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  }

  function getFileType(file: File): ProjectDocument["fileType"] {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "pdf";
    if (ext === "docx" || ext === "doc") return "docx";
    if (ext === "pptx" || ext === "ppt") return "pptx";
    if (ext === "xlsx" || ext === "xls") return "xlsx";
    if (ext === "zip" || ext === "rar") return "zip";
    return "image";
  }

  function handleUpload() {
    if (!uploadFile || !uploadTitle) return;
    setUploading(true);
    setTimeout(() => {
      const newDoc: ProjectDocument = {
        id: `DOC${Date.now()}`,
        projectId: id!,
        title: uploadTitle,
        fileName: uploadFile.name,
        fileType: getFileType(uploadFile),
        uploadedBy: "Admin",
        uploadDate: new Date().toISOString().split("T")[0],
        sizeMB: +(uploadFile.size / 1024 / 1024).toFixed(2) || 0.1,
      };
      setDocs(prev => [newDoc, ...prev]);
      setUploading(false);
      setShowUploadDialog(false);
      setUploadTitle("");
      setUploadFile(null);
      toast({ title: "Document uploaded", description: `"${newDoc.title}" has been added to this project.` });
    }, 900);
  }

  const activityLog = [
    { action: "Project created", by: project.createdBy, date: project.startDate, type: "create" },
    ...docs.slice(0, 4).map(d => ({ action: `"${d.title}" uploaded`, by: d.uploadedBy, date: d.uploadDate, type: "upload" })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link href="/projects">
          <Button variant="ghost" size="icon" className="mt-1 shrink-0">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <StatusBadge status={project.status} />
            <Badge variant="outline">{project.category}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">{project.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Project Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FolderOpen size={16} /> Project Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Created By</p>
                  <p className="font-semibold">{project.createdBy}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Start Date</p>
                  <p className="font-semibold">{formatDate(project.startDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">End Date</p>
                  <p className="font-semibold">{formatDate(project.endDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Category</p>
                  <p className="font-semibold">{project.category}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Staff Assigned</p>
                  <p className="font-semibold">{project.assignedStaff.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Interns Assigned</p>
                  <p className="font-semibold">{project.assignedInterns.length}</p>
                </div>
              </div>

              {/* Timeline progress */}
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Project Timeline Progress</span>
                  <span>{progressPct}%</span>
                </div>
                <Progress value={progressPct} className="h-2" />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>{formatDate(project.startDate)}</span>
                  <span>{formatDate(project.endDate)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText size={16} /> Documents
                <Badge variant="secondary" className="ml-1">{docs.length}</Badge>
              </CardTitle>
              {(role === "admin" || role === "staff") && (
                <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowUploadDialog(true)}>
                  <Upload size={13} /> Upload
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {docs.length > 0 && (
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search documents…"
                    className="pl-8 h-8 text-sm"
                    value={docSearch}
                    onChange={e => setDocSearch(e.target.value)}
                  />
                </div>
              )}

              {filteredDocs.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <FileText size={36} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">{docs.length === 0 ? "No documents uploaded yet" : "No documents match your search"}</p>
                  {(role === "admin" || role === "staff") && docs.length === 0 && (
                    <Button variant="outline" size="sm" className="mt-3 gap-1.5" onClick={() => setShowUploadDialog(true)}>
                      <Upload size={13} /> Upload First Document
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {filteredDocs.map(doc => (
                      <DocumentRow key={doc.id} doc={doc} role={role} onDelete={handleDelete} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Assigned Staff */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users size={15} /> Assigned Staff
                <Badge variant="secondary">{assignedStaffData.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignedStaffData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No employees assigned.</p>
              ) : (
                <div className="space-y-3">
                  {assignedStaffData.map(s => (
                    <Link key={s.id} href={`/staff/${s.id}`}>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {s.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{s.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.designation}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assigned Students */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap size={15} /> Assigned Interns
                <Badge variant="secondary">{assignedStudentData.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignedStudentData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No interns assigned.</p>
              ) : (
                <div className="space-y-3">
                  {assignedStudentData.map(s => (
                    <Link key={s.id} href={`/students/${s.id}`}>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-secondary/20 text-secondary-foreground text-xs font-semibold">
                            {s.name.split(" ").map(n => n[0]).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{s.name}</p>
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs text-muted-foreground truncate">{s.role}</p>
                            <div className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                            <span className={`text-[10px] font-medium ${s.progress >= 80 ? "text-green-600" : s.progress >= 50 ? "text-yellow-600" : "text-red-500"}`}>
                              {s.progress}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity size={15} /> Activity History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {activityLog.map((a, i) => (
                  <div key={i} className="flex gap-3 pb-4 relative">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${a.type === "create" ? "bg-green-100" : "bg-blue-100"}`}>
                        {a.type === "create"
                          ? <FolderOpen size={12} className="text-green-600" />
                          : <Upload size={12} className="text-blue-600" />}
                      </div>
                      {i < activityLog.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1 mb-0" style={{ minHeight: "16px" }} />
                      )}
                    </div>
                    <div className="pb-0 min-w-0 flex-1">
                      <p className="text-xs font-medium leading-tight">{a.action}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {a.by} · {formatDate(a.date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Upload size={16} /> Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Document Title <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Project Requirements Spec"
                value={uploadTitle}
                onChange={e => setUploadTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>File <span className="text-destructive">*</span></Label>
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-muted/20 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadFile ? (
                  <div className="space-y-1">
                    <FileText size={28} className="mx-auto text-primary" />
                    <p className="text-sm font-medium">{uploadFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload size={28} className="mx-auto text-muted-foreground opacity-50" />
                    <p className="text-sm font-medium text-muted-foreground">Click to select file</p>
                    <p className="text-xs text-muted-foreground">PDF, DOCX, PPTX, XLSX, ZIP, Images</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.zip,.rar,.jpg,.jpeg,.png,.gif,.webp"
                onChange={handleFileChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowUploadDialog(false); setUploadFile(null); setUploadTitle(""); }}>Cancel</Button>
            <Button onClick={handleUpload} disabled={!uploadFile || !uploadTitle || uploading} className="gap-2">
              {uploading ? <><Loader2 size={14} className="animate-spin" /> Uploading…</> : <><Upload size={14} /> Upload</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
