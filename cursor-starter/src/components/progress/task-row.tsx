"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pin } from "lucide-react";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/lib/constants";
import type { TaskWithAssignees } from "@/types";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { ReviewFields } from "@/components/progress/review-fields";
import { cn } from "@/lib/utils";

export function TaskRow({
  task,
  onMove,
  onTogglePin,
  onReviewPatch,
}: {
  task: TaskWithAssignees;
  onMove: (direction: "left" | "right") => void;
  onTogglePin: () => void;
  onReviewPatch: (
    id: string,
    fields: {
      review_platform: string | null;
      review_role: string | null;
      review_page: string | null;
      review_test_step: string | null;
    },
  ) => void;
}) {
  const idx = TASK_STATUSES.indexOf(task.status as (typeof TASK_STATUSES)[number]);
  const canLeft = idx > 0;
  const canRight = idx < TASK_STATUSES.length - 1;

  return (
    <motion.div
      layout
      layoutId={`task-${task.id}`}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className="rounded-lg border bg-card"
    >
      <div className="flex flex-wrap items-center gap-3 p-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onTogglePin}
          aria-label={task.is_pinned ? "Unpin task" : "Pin task"}
        >
          <Pin
            className={cn(
              "size-4",
              task.is_pinned ? "text-primary" : "text-muted-foreground",
            )}
          />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium leading-tight">{task.title}</p>
          <p className="text-xs text-muted-foreground">
            {TASK_STATUS_LABELS[task.status] ?? task.status}
          </p>
        </div>
        <PriorityBadge priority={task.priority} className="shrink-0 text-xs" />
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!canLeft}
            onClick={() => onMove("left")}
            aria-label="Move status back"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!canRight}
            onClick={() => onMove("right")}
            aria-label="Move status forward"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
      {task.status === "waiting_review" ? (
        <ReviewFields key={task.id} task={task} onPatch={onReviewPatch} />
      ) : null}
    </motion.div>
  );
}
