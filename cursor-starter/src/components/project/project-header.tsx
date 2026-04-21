"use client";

import { useEffect, useState } from "react";
import { useProjectContext } from "@/components/project/project-provider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function ProjectHeader() {
  const { project, members, loading, refresh, projectId } = useProjectContext();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const isMember = currentUserId
    ? members.some((m) => m.user_id === currentUserId)
    : true; // hide button until we know

  async function handleJoin() {
    if (!currentUserId) return;
    setJoining(true);
    try {
      await createClient()
        .from("project_members")
        .insert({ project_id: projectId, user_id: currentUserId, role: "member" });
      await refresh();
    } finally {
      setJoining(false);
    }
  }

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
      <div className="flex-1">
        <h1 className="text-xl font-semibold tracking-tight">
          {project?.name ?? "Project"}
        </h1>
        <p className="text-sm text-muted-foreground">Team development tracking</p>
      </div>
      {!loading && currentUserId && !isMember && (
        <Button onClick={handleJoin} disabled={joining} size="sm">
          {joining ? "Joining…" : "Join Project"}
        </Button>
      )}
    </div>
  );
}
