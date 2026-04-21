"use client";

import { useEffect, useMemo, useState } from "react";
import { useProject, useProjectSaveSlot } from "@/hooks/use-project";
import { useTasks } from "@/hooks/use-tasks";
import { useTestItems } from "@/hooks/use-test-items";
import { UserProgressCard } from "@/components/progress/user-progress-card";
import { TaskBoard } from "@/components/progress/task-board";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";

export function ProgressView() {
  const { projectId, members, loading: projectLoading } = useProject();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const defaultUserId = useMemo(() => {
    if (currentUserId && members.some((m) => m.user_id === currentUserId))
      return currentUserId;
    return members[0]?.user_id ?? null;
  }, [currentUserId, members]);

  const boardUserId = selectedUserId ?? defaultUserId;

  const tasks = useTasks(projectId, boardUserId);
  const checklist = useTestItems(projectId);
  useProjectSaveSlot("progress", tasks.saveState);

  const testedTaskIds = useMemo(
    () => new Set(checklist.completedNewFeatureItems.map((i) => i.source_task_id as string)),
    [checklist.completedNewFeatureItems],
  );

  const activeTestTaskIds = useMemo(
    () =>
      new Set(
        checklist.items
          .filter((i) => i.tab !== "completed" && i.source_task_id != null)
          .map((i) => i.source_task_id as string),
      ),
    [checklist.items],
  );

  const testChecklistUrl = `/project/${projectId}/test-checklist`;

  const selectedMember = useMemo(
    () => members.find((m) => m.user_id === boardUserId) ?? null,
    [members, boardUserId],
  );

  if (projectLoading || tasks.loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!boardUserId || !selectedMember) {
    return (
      <p className="text-sm text-muted-foreground">
        Add members to this project to track progress.
      </p>
    );
  }

  return (
    <div className="relative mx-auto max-w-7xl space-y-8">
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Teammates</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <UserProgressCard
              key={m.user_id}
              member={m}
              selected={m.user_id === boardUserId}
              onSelect={() => setSelectedUserId(m.user_id)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Task board</h2>
        <TaskBoard
          boardUserId={boardUserId}
          tasksByStatus={tasks.tasksByStatus}
          testedTaskIds={testedTaskIds}
          activeTestTaskIds={activeTestTaskIds}
          testChecklistUrl={testChecklistUrl}
          onMoveStatus={(t, dir) => void tasks.moveStatus(t, dir)}
          onTogglePin={(t) => void tasks.togglePin(t)}
          onMarkComplete={(t) => void tasks.markComplete(t)}
          onDeleteTask={(t) => void tasks.deleteTask(t.id)}
          onReviewPatch={tasks.patchReviewFields}
          onAddToChecklist={(taskId, fields) => void checklist.insertTestItemForTask(taskId, fields)}
          onCreateForUser={tasks.createTaskForUser}
        />
      </div>
    </div>
  );
}
