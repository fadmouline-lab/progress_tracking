"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProject } from "@/hooks/use-project";
import type { ProjectPipelineEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Trash2 } from "lucide-react";

function displayNameForUser(
  members: { user_id: string; profile: { full_name: string | null; email: string } | null }[],
  userId: string | null,
) {
  if (!userId) return "Unknown";
  const m = members.find((x) => x.user_id === userId);
  return m?.profile?.full_name?.trim() || m?.profile?.email || "Teammate";
}

export function PipelineView() {
  const { projectId, members, loading: projectLoading } = useProject();
  const [entries, setEntries] = useState<ProjectPipelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectPipelineEntry | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data, error: qErr } = await supabase
      .from("project_pipeline_entries")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (qErr) {
      setError(qErr.message);
      setEntries([]);
    } else {
      setError(null);
      setEntries((data ?? []) as ProjectPipelineEntry[]);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`pipeline:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_pipeline_entries",
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, load]);

  const nameByUser = useMemo(
    () => (userId: string | null) => displayNameForUser(members, userId),
    [members],
  );

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;

    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("You must be signed in.");
        return;
      }
      const { error: insErr } = await supabase
        .from("project_pipeline_entries")
        .insert({
          project_id: projectId,
          content: text,
          created_by: user.id,
        });
      if (insErr) {
        setError(insErr.message);
        return;
      }
      setDraft("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDeletePipeline() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setError(null);
    try {
      const supabase = createClient();
      const { error: delErr } = await supabase
        .from("project_pipeline_entries")
        .delete()
        .eq("id", deleteTarget.id)
        .eq("project_id", projectId);
      if (delErr) {
        setError(delErr.message);
        throw new Error(delErr.message);
      }
      setDeleteTarget(null);
      await load();
    } finally {
      setDeletingId(null);
    }
  }

  if (projectLoading || loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline</CardTitle>
          <CardDescription>
            Capture ideas and long-running threads for this project. Everyone on
            the project can add or remove lines; newest appear first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-3">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type something to add to the pipeline…"
              rows={4}
              className="min-h-[100px] resize-y"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={submitting || !draft.trim()}>
                {submitting ? "Adding…" : "Add to pipeline"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          History ({entries.length})
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing in the pipeline yet. Add the first note above.
          </p>
        ) : (
          <ul className="space-y-3">
            {entries.map((row) => (
              <li key={row.id}>
                <Card className="py-4 shadow-none">
                  <CardContent className="flex flex-col gap-2 px-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {row.content}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {nameByUser(row.created_by)} ·{" "}
                        {new Date(row.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      disabled={deletingId === row.id}
                      aria-label="Delete pipeline entry"
                      onClick={() => setDeleteTarget(row)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete pipeline entry?"
        description="This removes the line for everyone on the project. You cannot undo it."
        confirmLabel={deletingId ? "Deleting…" : "Delete"}
        destructive
        onConfirm={confirmDeletePipeline}
      />
    </div>
  );
}
