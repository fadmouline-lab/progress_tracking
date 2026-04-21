"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ProjectWithMeta } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CreateProjectDialog } from "@/components/home/create-project-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { Plus } from "lucide-react";

async function loadProjects(): Promise<ProjectWithMeta[]> {
  const supabase = createClient();
  const { data: projects, error } = await supabase
    .from("projects")
    .select("id, name, logo_url, created_by, created_at, updated_at")
    .order("name", { ascending: true });

  if (error || !projects) {
    return [];
  }

  const withCounts = await Promise.all(
    projects.map(async (p) => {
      const { count } = await supabase
        .from("project_members")
        .select("id", { count: "exact", head: true })
        .eq("project_id", p.id);
      return {
        ...p,
        member_count: count ?? 0,
      } satisfies ProjectWithMeta;
    }),
  );

  return withCounts;
}

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithMeta[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setProjects(await loadProjects());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-svh flex-col bg-muted/20">
      <header className="flex h-14 items-center justify-between border-b bg-background px-4">
        <span className="text-sm font-semibold tracking-tight">
          Team progress
        </span>
        <div className="flex items-center gap-2">
          <ProfileMenu />
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={() => void handleSignOut()}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="flex w-full flex-1 flex-col px-6 py-10">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Your workspace</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">Current projects</p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              Create project
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading projects…</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No projects yet — create one to get started.
            </p>
          ) : (
            <div className="grid gap-3">
              {projects.map((p) => (
                <Link key={p.id} href={`/project/${p.id}/progress`}>
                  <Card className="transition-colors hover:bg-muted/60">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-md border bg-muted">
                        {p.logo_url ? (
                          <img
                            src={p.logo_url}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
                            —
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {p.member_count}{" "}
                          {p.member_count === 1 ? "member" : "members"}
                        </p>
                      </div>
                      <Button type="button" size="sm" variant="secondary" tabIndex={-1}>
                        Open
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={refresh}
      />
    </div>
  );
}
