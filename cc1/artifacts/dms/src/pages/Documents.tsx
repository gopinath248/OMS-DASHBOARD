import { useState } from "react";
import {
  useDmsListDocuments,
  getDmsListDocumentsQueryKey,
  useDmsListProjects,
  getDmsListProjectsQueryKey,
  useDmsDeleteDocument,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppLayout } from "../components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { FileText, Search, Download, Trash2, ExternalLink } from "lucide-react";
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

export default function Documents() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const params: Record<string, string | number> = {};
  if (search) params.q = search;
  if (projectFilter !== "all") params.projectId = parseInt(projectFilter, 10);

  const { data: documents, isLoading } = useDmsListDocuments(
    Object.keys(params).length ? params : undefined,
    { query: { queryKey: getDmsListDocumentsQueryKey(Object.keys(params).length ? params : undefined) } }
  );

  const { data: projects } = useDmsListProjects(undefined, {
    query: { queryKey: getDmsListProjectsQueryKey() },
  });

  const deleteMutation = useDmsDeleteDocument({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getDmsListDocumentsQueryKey() });
        toast({ title: "Document deleted" });
      },
      onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
    },
  });

  const isAdmin = user?.role === "admin";

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">All documents across projects.</p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by title or filename..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-documents"
            />
          </div>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-52" data-testid="select-project-filter">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects?.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 rounded" />)}
              </div>
            ) : !documents?.length ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <FileText className="size-10 mb-3 opacity-30" />
                <p className="text-sm">No documents found.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                      <TableCell className="font-medium">{doc.title}</TableCell>
                      <TableCell>
                        {doc.projectId ? (
                          <Link href={`/projects/${doc.projectId}`} className="text-primary hover:underline text-sm">
                            {doc.projectName ?? `Project ${doc.projectId}`}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
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
                          <Link href={`/projects/${doc.projectId}`}>
                            <Button variant="ghost" size="icon" className="size-7">
                              <ExternalLink className="size-3.5" />
                            </Button>
                          </Link>
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
    </AppLayout>
  );
}
