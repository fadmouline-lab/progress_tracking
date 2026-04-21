"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { TASK_STATUSES } from "@/lib/constants";
import type { TaskWithAssignees } from "@/types";
import type { SaveState } from "@/hooks/use-auto-save";

type TaskRow = TaskWithAssignees;

function statusIndex(status: string): number {
  const i = TASK_STATUSES.indexOf(status as (typeof TASK_STATUSES)[number]);
  return i === -1 ? 0 : i;
}

function sortTasksForBoard(list: TaskRow[]): TaskRow[] {
  const statusRank = (s: string) => statusIndex(s);
  return [...list].sort((a, b) => {
    const ac = a.status === "completed" ? 1 : 0;
    const bc = b.status === "completed" ? 1 : 0;
    if (ac !== bc) return ac - bc;
    const ap = a.is_pinned ? 1 : 0;
    const bp = b.is_pinned ? 1 : 0;
    if (ap !== bp) return bp - ap;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return statusRank(a.status) - statusRank(b.status);
  });
}

function tasksForUser(rows: TaskRow[], userId: string) {
  return rows.filter((t) =>
    (t.task_assignees ?? []).some((a) => a.user_id === userId),
  );
}

export function useTasks(projectId: string, selectedUserId: string | null) {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tasks")
      .select("*, task_assignees(id, task_id, user_id)")
      .eq("project_id", projectId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTasks((data ?? []) as TaskRow[]);
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tasks")
        .select("*, task_assignees(id, task_id, user_id)")
        .eq("project_id", projectId);
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        setTasks([]);
      } else {
        setTasks((data ?? []) as TaskRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    const supabase = createClient();
    let t: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        t = null;
        void refresh();
      }, 200);
    };
    const channel = supabase
      .channel(`tasks-realtime-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `project_id=eq.${projectId}`,
        },
        () => schedule(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_assignees" },
        async (payload) => {
          const row = (payload.new ?? payload.old) as
            | { task_id?: string }
            | null;
          const taskId = row?.task_id;
          if (!taskId) {
            schedule();
            return;
          }
          const { data } = await supabase
            .from("tasks")
            .select("project_id")
            .eq("id", taskId)
            .maybeSingle();
          if (data?.project_id === projectId) schedule();
        },
      )
      .subscribe();
    return () => {
      if (t) clearTimeout(t);
      void supabase.removeChannel(channel);
    };
  }, [projectId, refresh]);

  const tasksForSelectedUser = useMemo(() => {
    if (!selectedUserId) return [];
    return sortTasksForBoard(tasksForUser(tasks, selectedUserId));
  }, [tasks, selectedUserId]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, TaskRow[]> = {
      assigned: [],
      working_on: [],
      waiting_review: [],
      completed: [],
    };
    for (const t of tasksForSelectedUser) {
      const key = t.status in grouped ? t.status : "assigned";
      grouped[key].push(t);
    }
    for (const k of Object.keys(grouped)) {
      grouped[k] = sortTasksForBoard(grouped[k]);
    }
    return grouped;
  }, [tasksForSelectedUser]);

  const createTask = useCallback(
    async (input: {
      title: string;
      priority: number;
      assigneeUserIds: string[];
      createdBy: string | null;
    }) => {
      const supabase = createClient();
      const title = input.title.trim();
      if (!title) return;
      setSaveState("saving");
      try {
        const { data: task, error } = await supabase
          .from("tasks")
          .insert({
            project_id: projectId,
            title,
            priority: input.priority,
            status: "assigned",
            created_by: input.createdBy,
          })
          .select("*, task_assignees(id, task_id, user_id)")
          .single();
        if (error) throw new Error(error.message);
        const taskId = task.id as string;
        if (input.assigneeUserIds.length > 0) {
          const { error: aErr } = await supabase.from("task_assignees").insert(
            input.assigneeUserIds.map((user_id) => ({
              task_id: taskId,
              user_id,
            })),
          );
          if (aErr) throw new Error(aErr.message);
        }
        const { data: full, error: fErr } = await supabase
          .from("tasks")
          .select("*, task_assignees(id, task_id, user_id)")
          .eq("id", taskId)
          .single();
        if (fErr) throw new Error(fErr.message);
        setTasks((prev) => [...prev, full as TaskRow]);
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1200);
      } catch (e) {
        setSaveState("error");
        toast.error(
          e instanceof Error ? e.message : "Could not create task.",
        );
      }
    },
    [projectId],
  );

  const createTaskForUser = useCallback(
    async (userId: string, title: string, priority: number, createdBy: string | null) => {
      await createTask({
        title,
        priority,
        assigneeUserIds: [userId],
        createdBy,
      });
    },
    [createTask],
  );

  const patchTask = useCallback(async (id: string, patch: Partial<TaskRow>) => {
    const supabase = createClient();
    const allowed = [
      "title",
      "priority",
      "status",
      "is_pinned",
      "review_platform",
      "review_role",
      "review_page",
      "review_test_step",
      "sort_order",
    ] as const;
    const payload: Record<string, unknown> = {};
    const p = patch as Record<string, unknown>;
    for (const key of allowed) {
      if (p[key] !== undefined) {
        payload[key] = p[key];
      }
    }
    if (Object.keys(payload).length === 0) return;
    const { error } = await supabase.from("tasks").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  }, []);

  const moveStatus = useCallback(
    async (task: TaskRow, direction: "left" | "right") => {
      const idx = statusIndex(task.status);
      const next =
        direction === "right"
          ? Math.min(TASK_STATUSES.length - 1, idx + 1)
          : Math.max(0, idx - 1);
      const nextStatus = TASK_STATUSES[next];
      const snapshot = { ...task };
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: nextStatus } : t,
        ),
      );
      try {
        await patchTask(task.id, { status: nextStatus });
      } catch (e) {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, ...snapshot } : t)),
        );
        toast.error(
          e instanceof Error ? e.message : "Could not update task status.",
        );
      }
    },
    [patchTask],
  );

  const markComplete = useCallback(
    async (task: TaskRow) => {
      const snapshot = { ...task };
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: "completed" } : t)),
      );
      try {
        await patchTask(task.id, { status: "completed" });
      } catch (e) {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, ...snapshot } : t)),
        );
        toast.error(
          e instanceof Error ? e.message : "Could not complete task.",
        );
      }
    },
    [patchTask],
  );

  const togglePin = useCallback(
    async (task: TaskRow) => {
      const next = !(task.is_pinned ?? false);
      const snapshot = { ...task };
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, is_pinned: next } : t)),
      );
      try {
        await patchTask(task.id, { is_pinned: next });
      } catch (e) {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, ...snapshot } : t)),
        );
        toast.error(
          e instanceof Error ? e.message : "Could not update pin state.",
        );
      }
    },
    [patchTask],
  );

  const tasksAssignedForScope = useCallback(
    (userId: string) => {
      return sortTasksForBoard(
        tasksForUser(tasks, userId).filter((t) => t.status === "assigned"),
      );
    },
    [tasks],
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      const snapshot = tasks;
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      try {
        const supabase = createClient();
        const { error } = await supabase.from("tasks").delete().eq("id", taskId);
        if (error) throw new Error(error.message);
      } catch (e) {
        setTasks(snapshot);
        toast.error(e instanceof Error ? e.message : "Could not delete task.");
        throw e;
      }
    },
    [tasks],
  );

  const patchReviewFields = useCallback(
    (
      taskId: string,
      fields: {
        review_platform: string | null;
        review_role: string | null;
        review_page: string | null;
        review_test_step: string | null;
      },
    ) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...fields } : t)),
      );
    },
    [],
  );

  return {
    tasks,
    tasksByStatus,
    loading,
    saveState,
    refresh,
    createTask,
    createTaskForUser,
    moveStatus,
    markComplete,
    togglePin,
    tasksAssignedForScope,
    patchReviewFields,
    deleteTask,
  };
}
