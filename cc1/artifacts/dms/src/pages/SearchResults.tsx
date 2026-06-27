import { useState } from "react";
import { Link } from "wouter";
import {
  useDmsSearch,
  getDmsSearchQueryKey,
} from "@workspace/api-client-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderGit2, FileText, Search, Download, ChevronRight } from "lucide-react";
import { formatBytes, formatDate } from "@/lib/utils";

const EXT_COLORS: Record<string, string> = {
  pdf: "bg-red-500/15 text-red-400",
  docx: "bg-blue-500/15 text-blue-400",
  xlsx: "bg-green-500/15 text-green-400",
  pptx: "bg-orange-500/15 text-orange-400",
};

export default function SearchResults() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");

  const { data, isLoading } = useDmsSearch(
    { q: submitted },
    { query: { enabled: submitted.length > 0, queryKey: getDmsSearchQueryKey({ q: submitted }) } }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(query.trim());
  };

  const totalResults = (data?.projects?.length ?? 0) + (data?.documents?.length ?? 0);

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Search</h1>
          <p className="text-muted-foreground">Search across projects and documents.</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search projects, documents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-testid="input-global-search"
            />
          </div>
          <Button type="submit" disabled={!query.trim()} data-testid="button-search-submit">
            Search
          </Button>
        </form>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        )}

        {submitted && !isLoading && data && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              {totalResults} result{totalResults !== 1 ? "s" : ""} for "{submitted}"
            </p>

            {data.projects.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <FolderGit2 className="size-4" /> Projects
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {data.projects.map((project) => (
                    <Card key={project.id} className="hover:border-primary/40 transition-colors" data-testid={`search-result-project-${project.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground mb-1">{project.type}</p>
                            <p className="font-medium text-sm leading-tight">{project.name}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
                          </div>
                          <Link href={`/projects/${project.id}`}>
                            <Button variant="ghost" size="icon" className="size-7 shrink-0">
                              <ChevronRight className="size-4" />
                            </Button>
                          </Link>
                        </div>
                        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                          <FileText className="size-3.5" />
                          <span>{project.documentCount} doc{project.documentCount !== 1 ? "s" : ""}</span>
                          <span>·</span>
                          <span>{formatDate(project.createdAt)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {data.documents.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <FileText className="size-4" /> Documents
                </h2>
                <div className="space-y-2">
                  {data.documents.map((doc) => (
                    <Card key={doc.id} className="hover:border-primary/40 transition-colors" data-testid={`search-result-document-${doc.id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm">{doc.title}</p>
                              <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${EXT_COLORS[doc.fileType] ?? "bg-muted text-muted-foreground"}`}>
                                {doc.fileType.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                              {doc.projectName && (
                                <Link href={`/projects/${doc.projectId}`} className="hover:underline text-primary">
                                  {doc.projectName}
                                </Link>
                              )}
                              <span>·</span>
                              <span>{formatBytes(doc.fileSize)}</span>
                              <span>·</span>
                              <span>{doc.uploadedByName}</span>
                              <span>·</span>
                              <span>{formatDate(doc.createdAt)}</span>
                            </div>
                          </div>
                          <a
                            href={`/api/dms/documents/${doc.id}/file`}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`link-download-${doc.id}`}
                          >
                            <Button variant="ghost" size="icon" className="size-7 shrink-0">
                              <Download className="size-3.5" />
                            </Button>
                          </a>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {totalResults === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <Search className="size-10 mb-3 opacity-30" />
                <p className="text-sm">No results found for "{submitted}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
