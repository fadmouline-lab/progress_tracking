"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Flame, ArrowUp, Sparkles, Paintbrush, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/lib/constants";
import type { TaskWithAssignees } from "@/types";
import { cn } from "@/lib/utils";
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

const PRIORITY_ICONS: Record<number, React.ElementType> = {
  1: Flame,
  2: ArrowUp,
  3: Sparkles,
  4: Paintbrush,
  5: Clock,
};

const COLUMN_HEADER_CLASS: Record<string, string> = {
  assigned: "bg-info/10",
  working_on: "bg-brand/10",
  waiting_review: "bg-warning/10",
  completed: "bg-success/10",
};

const COLUMN_COUNT_CLASS: Record<string, string> = {
  assigned: "text-info",
  working_on: "text-brand",
  waiting_review: "text-warning",
  completed: "text-success",
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
  onDeleteTask,
  onReviewPatch,
  onAddToChecklist,
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
  onDeleteTask: (task: TaskWithAssignees) => void;
  onAddToChecklist: (taskId: string, fields: { platform: string | null; role: string | null; page_tab: string | null; test_step: string | null }) => void;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [completingTask, setCompletingTask] = useState<TaskWithAssignees | null>(null);
  const [mobileTab, setMobileTab] = useState<string>("working_on");

  const COLUMN_MOBILE_LABELS: Record<string, string> = {
    assigned: "Queue",
    working_on: "Active",
    waiting_review: "Review",
    completed: "Done",
  };

  const selectedTask =
    selectedTaskId !== null
      ? (Object.values(tasksByStatus).flat().find((t) => t.id === selectedTaskId) ?? null)
      : null;

  async function submitInline() {
    const trimmed = title.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await onCreateForUser(boardUserId, trimmed, priority, user?.id ?? null);
      setTitle("");
      setPriority(3);
      setAdding(false);
    } finally {
      setIsSubmitting(false);
    }
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
          className="grid gap-y-3 gap-x-8 rounded-lg border bg-muted/30 p-4 md:grid-cols-[1fr_160px_auto]"
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
                {PRIORITIES.map((p) => {
                  const Icon = PRIORITY_ICONS[p.value];
                  return (
                    <SelectItem key={p.value} value={String(p.value)}>
                      <span className={`flex items-center gap-1.5 ${p.textClass}`}>
                        <Icon className="size-3.5 shrink-0" />
                        {p.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2 md:ml-10">
            <Button type="button" onClick={() => void submitInline()} disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        </motion.div>
      ) : null}

      {/* Mobile: tab-switcher (hidden on md+) */}
      <div className="md:hidden">
        <div className="flex gap-1 rounded-lg border bg-muted/30 p-1">
          {TASK_STATUSES.map((status) => {
            const tasks = tasksByStatus[status] ?? [];
            const isActive = mobileTab === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setMobileTab(status)}
                className={cn(
                  "flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="leading-none">{COLUMN_MOBILE_LABELS[status]}</span>
                <span className={cn(
                  "text-[10px] font-semibold tabular-nums leading-none",
                  isActive && tasks.length > 0 ? COLUMN_COUNT_CLASS[status] : "text-muted-foreground",
                )}>
                  {tasks.length}
                </span>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {TASK_STATUSES.filter((s) => s === mobileTab).map((status) => {
            const tasks = tasksByStatus[status] ?? [];
            return (
              <motion.section
                key={status}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="mt-2 overflow-hidden rounded-lg border"
              >
                <div className={cn("flex items-center justify-between gap-2 border-b px-3 py-2", COLUMN_HEADER_CLASS[status])}>
                  <h3 className="text-sm font-semibold tracking-tight">{TASK_STATUS_LABELS[status]}</h3>
                  <span className={cn("text-xs font-medium tabular-nums", tasks.length > 0 ? COLUMN_COUNT_CLASS[status] : "text-muted-foreground")}>{tasks.length}</span>
                </div>
                <div className="flex flex-col divide-y">
                  <AnimatePresence initial={false}>
                    {tasks.length === 0 ? (
                      <p className="px-3 py-4 text-xs text-muted-foreground">No tasks yet.</p>
                    ) : (
                      tasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          showBadge={true}
                          isTested={testedTaskIds.has(task.id)}
                          hasActiveTest={activeTestTaskIds.has(task.id)}
                          testChecklistUrl={testChecklistUrl}
                          onMove={(dir) => {
                            onMoveStatus(task, dir);
                            const nextIdx = TASK_STATUSES.indexOf(task.status as (typeof TASK_STATUSES)[number]) + (dir === "right" ? 1 : -1);
                            if (TASK_STATUSES[nextIdx] === "waiting_review") setSelectedTaskId(task.id);
                          }}
                          onTogglePin={() => onTogglePin(task)}
                          onMarkComplete={() => setCompletingTask(task)}
                          onSelect={() => setSelectedTaskId(task.id)}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </motion.section>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Desktop: 4-column grid (hidden on mobile) */}
      <div className="hidden md:grid md:grid-cols-[4fr_2fr_2fr_2fr] md:gap-4">
        {TASK_STATUSES.map((status) => {
          const tasks = tasksByStatus[status] ?? [];
          const showBadge = true;
          return (
            <section key={status} className="overflow-hidden rounded-lg border">
              <div className={cn("flex items-center justify-between gap-2 border-b px-3 py-2", COLUMN_HEADER_CLASS[status])}>
                <h3 className="text-sm font-semibold tracking-tight">
                  {TASK_STATUS_LABELS[status]}
                </h3>
                <span className={cn("text-xs font-medium tabular-nums", tasks.length > 0 ? COLUMN_COUNT_CLASS[status] : "text-muted-foreground")}>{tasks.length}</span>
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
        onAddToChecklist={onAddToChecklist}
        onDelete={(t) => { onDeleteTask(t); setSelectedTaskId(null); }}
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
