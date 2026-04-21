"use client";

import { useProject, useProjectSaveSlot } from "@/hooks/use-project";
import { useScopeBullets } from "@/hooks/use-scope-bullets";
import { useTasks } from "@/hooks/use-tasks";
import { TaskInputBar } from "@/components/scope/task-input-bar";
import { UserScopeCard } from "@/components/scope/user-scope-card";
import { Skeleton } from "@/components/ui/skeleton";

export function ScopeView() {
  const { projectId, members, loading: projectLoading } = useProject();
  const scope = useScopeBullets(projectId);
  const tasks = useTasks(projectId, null);
  useProjectSaveSlot("scope", scope.saveState);

  if (projectLoading || scope.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="mx-auto h-40 max-w-3xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-6xl space-y-8">
      <TaskInputBar
        members={members}
        onCreateTask={tasks.createTask}
      />

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No members on this project yet — add people from the database or recreate the project.
        </p>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        {members.map((m) => {
          const list = scope.bulletsByUser.get(m.user_id) ?? [];
          const assigned = tasks.tasksAssignedForScope(m.user_id);
          return (
            <UserScopeCard
              key={m.user_id}
              member={m}
              bullets={list}
              assignedTasks={assigned}
              onAddBullet={scope.addBullet}
              onRemoveBullet={scope.removeBullet}
              onContentChange={scope.updateBulletContent}
              persistBulletContent={scope.persistBulletContent}
              reorderBulletsForUser={scope.reorderBulletsForUser}
            />
          );
        })}
      </div>
    </div>
  );
}
