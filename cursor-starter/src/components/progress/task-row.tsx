"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Pin } from "lucide-react";
import { TASK_STATUSES } from "@/lib/constants";
import type { TaskWithAssignees } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { cn } from "@/lib/utils";

export function TaskRow({
  task,
  showBadge = true,
  isTested = false,
  hasActiveTest = false,
  testChecklistUrl = "",
  onMove,
  onTogglePin,
  onMarkComplete,
  onSelect,
}: {
  task: TaskWithAssignees;
  showBadge?: boolean;
  isTested?: boolean;
  hasActiveTest?: boolean;
  testChecklistUrl?: string;
  onMove: (direction: "left" | "right") => void;
  onTogglePin: () => void;
  onMarkComplete: () => void;
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
    >
      <div
        className={cn(
          "w-full cursor-pointer px-3 py-2.5 transition-colors hover:bg-accent/50",
          task.status === "waiting_review" && "border-l-2 border-l-warning",
        )}
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
          <p className={cn("min-w-0 flex-1 truncate text-sm font-medium leading-tight", isTested && "text-green-600 dark:text-green-400")}>{task.title}</p>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {task.status !== "completed" && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 shrink-0 [&_svg]:transition-colors hover:[&_svg]:text-emerald-500"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkComplete();
                }}
                aria-label="Mark task as complete"
              >
                <Check className="size-3 text-muted-foreground" />
              </Button>
            )}
            {hasActiveTest && testChecklistUrl ? (
              <Link
                href={testChecklistUrl}
                onClick={(e) => e.stopPropagation()}
              >
                <Badge className="border-transparent bg-sky-100 text-xs font-medium text-sky-700 hover:bg-sky-200 dark:bg-sky-900/40 dark:text-sky-300">
                  Testing
                </Badge>
              </Link>
            ) : showBadge ? (
              <PriorityBadge priority={task.priority} className="text-xs" />
            ) : (
              <span />
            )}
          </div>
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
              disabled={!canRight || (task.status === "waiting_review" && hasActiveTest)}
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
      </div>
    </motion.div>
  );
}
