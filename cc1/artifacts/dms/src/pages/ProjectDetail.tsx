import { useState, useRef } from "react";
import { useParams, Link } from "wouter";
import {
  useDmsGetProject,
  getDmsGetProjectQueryKey,
  getDmsListDocumentsQueryKey,
  useDmsDeleteDocument,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "../components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, Upload, Trash2, Download, FileText, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatBytes, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const EXT_COLORS: Record<string, string> = {
  pdf: "bg-red-500/15 text-red-400",
  docx: "bg-blue-500/15 text-blue-400",
  doc: "bg-blue-500/15 text-blue-400",
  xlsx: "bg-green-500/15 text-green-400",
  xls: "bg-green-500/15 text-green-400",
  pptx: "bg-orange-500/15 text-orange-400",
  png: "bg-purple-500/15 text-purple-400",
  jpg: "bg-purple-500/15 text-purple-400",
  jpeg: "bg-purple-500/15 text-purple-400",
  txt: "bg-muted text-muted-foreground",
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id ?? "0", 10);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: project, isLoading, error } = useDmsGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getDmsGetProjectQueryKey(projectId) },
  });

  const deleteMutation = useDmsDeleteDocument({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getDmsGetProjectQueryKey(projectId) });
        queryClient.invalidateQueries({ queryKey: getDmsListDocumentsQueryKey() });
        toast({ title: "Document deleted" });
      },
      onError: () => toast({ title: "Failed to delete document", variant: "destructive" }),
    },
  });

  const isAdmin = user?.role === "admin";

  const handleUpload = async () => {
    if (!uploadTitle.trim() || !uploadFile) return;
    const token = localStorage.getItem("dms_token");
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", uploadTitle.trim());
      formData.append("projectId", String(projectId));
      formData.append("file", uploadFile);

      const res = await fetch("/api/dms/documents", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      queryClient.invalidateQueries({ queryKey: getDmsGetProjectQueryKey(projectId) });
      queryClient.invalidateQueries({ queryKey: getDmsListDocumentsQueryKey() });
      setUploadOpen(false);
      setUploadTitle("");
      setUploadFile(null);
      toast({ title: "Document uploaded" });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </AppLayout>
    );
  }

  if (error || !project) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3 text-muted-foreground">
          <AlertCircle className="size-10 opacity-40" />
          <p>Project not found.</p>
          <Link href="/projects">
            <Button variant="outline" size="sm">Back to Projects</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Link href="/projects">
              <Button variant="ghost" size="sm" className="mb-2 -ml-2 gap-1.5 text-muted-foreground">
                <ChevronLeft className="size-4" /> All Projects
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-muted-foreground">{project.type}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">Created {formatDate(project.createdAt)}</span>
            </div>
          </div>
          {isAdmin && (
            <Button onClick={() => setUploadOpen(true)} data-testid="button-upload-document">
              <Upload className="size-4 mr-2" /> Upload Document
            </Button>
          )}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{project.description}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Documents</span>
              <Badge variant="secondary">{project.documents?.length ?? 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!project.documents?.length ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center">
                <FileText className="size-10 mb-3 opacity-30" />
                <p className="text-sm">No documents yet.</p>
                {isAdmin && (
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setUploadOpen(true)}>
                    Upload first document
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {project.documents.map((doc) => (
                    <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                      <TableCell className="font-medium">{doc.title}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${EXT_COLORS[doc.fileType] ?? "bg-muted text-muted-foreground"}`}>
                          {doc.fileType.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatBytes(doc.fileSize)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{doc.uploadedByName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(doc.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <a
                            href={`/api/dms/documents/${doc.id}/file`}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`link-download-document-${doc.id}`}
                          >
                            <Button variant="ghost" size="icon" className="size-7">
                              <Download className="size-3.5" />
                            </Button>
                          </a>
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-7 text-destructive hover:text-destructive"
                                  data-testid={`button-delete-document-${doc.id}`}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Document?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete "{doc.title}".
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteMutation.mutate({ id: doc.id })}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={(o) => !o && setUploadOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="doc-title">Document Title</Label>
              <Input
                id="doc-title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="e.g. Q3 Architecture Overview"
                data-testid="input-document-title"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-file">File</Label>
              <div
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                data-testid="dropzone-file"
              >
                {uploadFile ? (
                  <div className="text-sm">
                    <p className="font-medium">{uploadFile.name}</p>
                    <p className="text-muted-foreground">{formatBytes(uploadFile.size)}</p>
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">
                    <Upload className="size-8 mx-auto mb-2 opacity-40" />
                    <p>Click to select a file</p>
                    <p className="text-xs mt-1">Max 50MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                id="doc-file"
                type="file"
                className="hidden"
                onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                data-testid="input-file"
              />
            </div>
            <Button
              onClick={handleUpload}
              disabled={isUploading || !uploadTitle.trim() || !uploadFile}
              className="w-full"
              data-testid="button-submit-upload"
            >
              {isUploading ? "Uploading..." : "Upload Document"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
