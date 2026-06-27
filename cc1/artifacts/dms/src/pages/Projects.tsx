import { useState } from "react";
import { Link } from "wouter";
import {
  useDmsListProjects,
  getDmsListProjectsQueryKey,
  useDmsCreateProject,
  useDmsDeleteProject,
  useDmsUpdateProject,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "../components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderGit2, Plus, Search, Trash2, Pencil, ChevronRight, FileText } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const PROJECT_TYPES = ["Research", "Engineering", "Design", "HR", "Finance", "Marketing", "Operations"];

const TYPE_COLORS: Record<string, string> = {
  Research: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  Engineering: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Design: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  HR: "bg-green-500/15 text-green-400 border-green-500/20",
  Finance: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  Marketing: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  Operations: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
};

interface ProjectFormState {
  name: string;
  type: string;
  description: string;
}

function ProjectForm({
  initial,
  onSubmit,
  isPending,
  submitLabel,
}: {
  initial?: ProjectFormState;
  onSubmit: (data: ProjectFormState) => void;
  isPending: boolean;
  submitLabel: string;
}) {
  const [form, setForm] = useState<ProjectFormState>(
    initial ?? { name: "", type: "Engineering", description: "" }
  );
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="proj-name">Project Name</Label>
        <Input
          id="proj-name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Q3 Engineering Roadmap"
          data-testid="input-project-name"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="proj-type">Type</Label>
        <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
          <SelectTrigger id="proj-type" data-testid="select-project-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROJECT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="proj-desc">Description</Label>
        <Textarea
          id="proj-desc"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="What is this project about?"
          rows={3}
          data-testid="input-project-description"
        />
      </div>
      <Button
        onClick={() => onSubmit(form)}
        disabled={isPending || !form.name.trim()}
        className="w-full"
        data-testid="button-submit-project"
      >
        {isPending ? "Saving..." : submitLabel}
      </Button>
    </div>
  );
}

export default function Projects() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState<{ id: number; name: string; type: string; description: string } | null>(null);

  const { data: projects, isLoading } = useDmsListProjects(
    search ? { q: search } : undefined,
    { query: { queryKey: getDmsListProjectsQueryKey(search ? { q: search } : undefined) } }
  );

  const createMutation = useDmsCreateProject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getDmsListProjectsQueryKey() });
        setCreateOpen(false);
        toast({ title: "Project created" });
      },
      onError: () => toast({ title: "Failed to create project", variant: "destructive" }),
    },
  });

  const updateMutation = useDmsUpdateProject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getDmsListProjectsQueryKey() });
        setEditProject(null);
        toast({ title: "Project updated" });
      },
      onError: () => toast({ title: "Failed to update project", variant: "destructive" }),
    },
  });

  const deleteMutation = useDmsDeleteProject({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getDmsListProjectsQueryKey() });
        toast({ title: "Project deleted" });
      },
      onError: () => toast({ title: "Failed to delete project", variant: "destructive" }),
    },
  });

  const isAdmin = user?.role === "admin";

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">All document projects in the system.</p>
          </div>
          {isAdmin && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-project">
                  <Plus className="size-4 mr-2" /> New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Project</DialogTitle>
                </DialogHeader>
                <ProjectForm
                  submitLabel="Create Project"
                  isPending={createMutation.isPending}
                  onSubmit={(data) => createMutation.mutate({ data })}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-projects"
          />
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        ) : !projects?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <FolderGit2 className="size-12 mb-3 opacity-30" />
            <p className="text-sm">No projects found</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="group relative flex flex-col hover:border-primary/40 transition-colors"
                data-testid={`card-project-${project.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="mb-2">
                        <span
                          className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${TYPE_COLORS[project.type] ?? "bg-muted text-muted-foreground border-border"}`}
                        >
                          {project.type}
                        </span>
                      </div>
                      <CardTitle className="text-base leading-tight">{project.name}</CardTitle>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => setEditProject(project)}
                          data-testid={`button-edit-project-${project.id}`}
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive hover:text-destructive"
                              data-testid={`button-delete-project-${project.id}`}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Project?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{project.name}" and all its documents.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate({ id: project.id })}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between gap-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <FileText className="size-3.5" />
                      <span>{project.documentCount} doc{project.documentCount !== 1 ? "s" : ""}</span>
                      <span className="mx-1">·</span>
                      <span>{formatDate(project.createdAt)}</span>
                    </div>
                    <Link href={`/projects/${project.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" data-testid={`link-project-${project.id}`}>
                        View <ChevronRight className="size-3" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editProject} onOpenChange={(o) => !o && setEditProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          {editProject && (
            <ProjectForm
              initial={editProject}
              submitLabel="Save Changes"
              isPending={updateMutation.isPending}
              onSubmit={(data) =>
                updateMutation.mutate({ id: editProject.id, data })
              }
            />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
