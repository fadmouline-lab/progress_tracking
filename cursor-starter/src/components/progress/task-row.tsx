"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pin } from "lucide-react";
import { TASK_STATUSES } from "@/lib/constants";
import type { TaskWithAssignees } from "@/types";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { cn } from "@/lib/utils";

export function TaskRow({
  task,
  onMove,
  onTogglePin,
  onSelect,
}: {
  task: TaskWithAssignees;
  onMove: (direction: "left" | "right") => void;
  onTogglePin: () => void;
  onSelect: () => void;
}) {
  const idx = TASK_STATUSES.indexOf(task.status as (typeof TASK_STATUSES)[number]);
  const canLeft = idx > 0;
  const canRight = idx < TASK_STATUSES.length - 1;

  return (
    <motion.div
      layout
      layoutId={`task-${task.id}`}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className="flex w-full cursor-pointer flex-col gap-1 px-3 py-2.5 transition-colors hover:bg-accent/50"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          aria-label={task.is_pinned ? "Unpin task" : "Pin task"}
        >
          <Pin
            className={cn(
              "size-3",
              task.is_pinned ? "text-primary" : "text-muted-foreground",
            )}
          />
        </Button>
        <p className="min-w-0 flex-1 truncate text-sm font-medium leading-tight">{task.title}</p>
      </div>
      <div className="flex items-center justify-between pl-8">
        <PriorityBadge priority={task.priority} className="text-xs" />
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6"
            disabled={!canLeft}
            onClick={(e) => {
              e.stopPropagation();
              onMove("left");
            }}
            aria-label="Move status back"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6"
            disabled={!canRight}
            onClick={(e) => {
              e.stopPropagation();
              onMove("right");
            }}
            aria-label="Move status forward"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
