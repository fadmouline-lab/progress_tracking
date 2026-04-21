"use client";

import { useProjectContext } from "@/components/project/project-provider";

export function ProjectHeader() {
  const { project, loading } = useProjectContext();

  if (loading && !project) {
    return (
      <div className="border-b bg-background px-6 py-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 border-b bg-background px-6 py-4">
      <div className="relative size-12 shrink-0 overflow-hidden rounded-md border bg-muted">
        {project?.logo_url ? (
          <img
            src={project.logo_url}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
            —
          </div>
        )}
      </div>
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {project?.name ?? "Project"}
        </h1>
        <p className="text-sm text-muted-foreground">Team development tracking</p>
      </div>
    </div>
  );
}
