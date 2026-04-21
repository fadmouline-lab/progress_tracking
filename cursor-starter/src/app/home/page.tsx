"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ProjectWithMeta } from "@/types";
import { Button } from "@/components/ui/button";
import { ProjectSelector } from "@/components/home/project-selector";
import { CreateProjectDialog } from "@/components/home/create-project-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProfileMenu } from "@/components/layout/profile-menu";

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
  const [selectOpen, setSelectOpen] = useState(false);
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

      <main className="flex w-full flex-1 flex-col justify-center px-6 py-16">
        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-8 text-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your workspace</h1>
            <p className="mt-2 text-muted-foreground">
              Choose an existing project or create a new one.
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading projects…</p>
          ) : (
            <div className="flex w-full max-w-lg flex-col gap-4 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="h-auto min-h-24 flex-1 py-6 text-lg"
                variant="default"
                onClick={() => setSelectOpen(true)}
              >
                Select project
              </Button>
              <Button
                size="lg"
                className="h-auto min-h-24 flex-1 py-6 text-lg"
                variant="secondary"
                onClick={() => setCreateOpen(true)}
              >
                Create project
              </Button>
            </div>
          )}
        </div>

        <ProjectSelector
          open={selectOpen}
          onOpenChange={setSelectOpen}
          projects={projects}
        />
        <CreateProjectDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={refresh}
        />
      </main>
    </div>
  );
}
