"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/lib/constants";
import type { TaskWithAssignees } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRIORITIES } from "@/lib/constants";
import { TaskRow } from "@/components/progress/task-row";
import { TaskDetailDialog } from "@/components/progress/task-detail-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PRIORITY_BG: Record<number, string> = {
  1: "#ef4444",
  2: "#f97316",
  3: "#eab308",
  4: "#60a5fa",
  5: "#a1a1aa",
};

export function TaskBoard({
  boardUserId,
  tasksByStatus,
  testedTaskIds,
  activeTestTaskIds,
  testChecklistUrl,
  onMoveStatus,
  onTogglePin,
  onMarkComplete,
  onReviewPatch,
  onCreateForUser,
}: {
  boardUserId: string;
  tasksByStatus: Record<string, TaskWithAssignees[]>;
  testedTaskIds: Set<string>;
  activeTestTaskIds: Set<string>;
  testChecklistUrl: string;
  onMoveStatus: (task: TaskWithAssignees, direction: "left" | "right") => void;
  onTogglePin: (task: TaskWithAssignees) => void;
  onReviewPatch: (
    taskId: string,
    fields: {
      review_platform: string | null;
      review_role: string | null;
      review_page: string | null;
      review_test_step: string | null;
    },
  ) => void;
  onMarkComplete: (task: TaskWithAssignees) => void;
  onCreateForUser: (
    userId: string,
    title: string,
    priority: number,
    createdBy: string | null,
  ) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState(3);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [completingTask, setCompletingTask] = useState<TaskWithAssignees | null>(null);

  const selectedTask =
    selectedTaskId !== null
      ? (Object.values(tasksByStatus).flat().find((t) => t.id === selectedTaskId) ?? null)
      : null;

  async function submitInline() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await onCreateForUser(boardUserId, trimmed, priority, user?.id ?? null);
    setTitle("");
    setPriority(3);
    setAdding(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setAdding((v) => !v)}
        >
          <Plus className="mr-1 size-4" />
          Add task
        </Button>
      </div>

      {adding ? (
        <motion.div
          layout
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-3 rounded-lg border bg-muted/30 p-4 md:grid-cols-[1fr_160px_auto]"
        >
          <div className="space-y-2">
            <Label htmlFor="inline-task-title">Title</Label>
            <Input
              id="inline-task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Quick add for this teammate"
              onKeyDown={(e) => {
                if (e.key === "Escape") setAdding(false);
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submitInline();
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select
              value={String(priority)}
              onValueChange={(v) => setPriority(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem
                    key={p.value}
                    value={String(p.value)}
                    className="text-white"
                    style={{ backgroundColor: PRIORITY_BG[p.value] }}
                  >
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button type="button" onClick={() => void submitInline()}>
              Save
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </motion.div>
      ) : null}

      <div className="grid gap-4" style={{ gridTemplateColumns: "4fr 2fr 2fr 2fr" }}>
        {TASK_STATUSES.map((status, colIdx) => {
          const tasks = tasksByStatus[status] ?? [];
          const showBadge = true;
          return (
            <section key={status} className="overflow-hidden rounded-lg border">
              <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
                <h3 className="text-sm font-semibold tracking-tight">
                  {TASK_STATUS_LABELS[status]}
                </h3>
                <span className="text-xs text-muted-foreground">{tasks.length}</span>
              </div>
              <div className="flex flex-col divide-y">
                <AnimatePresence initial={false}>
                  {tasks.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-muted-foreground">
                      No tasks yet.
                    </p>
                  ) : (
                    tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        showBadge={showBadge}
                        isTested={testedTaskIds.has(task.id)}
                        hasActiveTest={activeTestTaskIds.has(task.id)}
                        testChecklistUrl={testChecklistUrl}
                        onMove={(dir) => {
                          onMoveStatus(task, dir);
                          const nextIdx = TASK_STATUSES.indexOf(task.status as (typeof TASK_STATUSES)[number]) + (dir === "right" ? 1 : -1);
                          if (TASK_STATUSES[nextIdx] === "waiting_review") {
                            setSelectedTaskId(task.id);
                          }
                        }}
                        onTogglePin={() => onTogglePin(task)}
                        onMarkComplete={() => setCompletingTask(task)}
                        onSelect={() => setSelectedTaskId(task.id)}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </section>
          );
        })}
      </div>

      <TaskDetailDialog
        task={selectedTask}
        open={selectedTask !== null}
        isTested={selectedTask ? testedTaskIds.has(selectedTask.id) : false}
        hasActiveTest={selectedTask ? activeTestTaskIds.has(selectedTask.id) : false}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(null);
        }}
        onMove={onMoveStatus}
        onReviewPatch={onReviewPatch}
      />

      <Dialog
        open={completingTask !== null}
        onOpenChange={(open) => {
          if (!open) setCompletingTask(null);
        }}
      >
        <DialogContent showCloseButton={false} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark this task as complete?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompletingTask(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (completingTask) onMarkComplete(completingTask);
                setCompletingTask(null);
              }}
            >
              Yes, complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
