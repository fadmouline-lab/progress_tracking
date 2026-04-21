"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/lib/constants";
import type { TaskWithAssignees } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { ReviewFields } from "@/components/progress/review-fields";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { cn } from "@/lib/utils";

type ReviewValue = {
  review_platform: string | null;
  review_role: string | null;
  review_page: string | null;
  review_test_step: string | null;
};

export function TaskDetailDialog({
  task,
  open,
  isTested,
  hasActiveTest = false,
  onOpenChange,
  onMove,
  onReviewPatch,
  onAddToChecklist,
  onDelete,
}: {
  task: TaskWithAssignees | null;
  open: boolean;
  isTested: boolean;
  hasActiveTest?: boolean;
  onOpenChange: (open: boolean) => void;
  onMove: (task: TaskWithAssignees, direction: "left" | "right") => void;
  onReviewPatch: (taskId: string, fields: ReviewValue) => void;
  onAddToChecklist?: (taskId: string, fields: { platform: string | null; role: string | null; page_tab: string | null; test_step: string | null }) => void;
  onDelete?: (task: TaskWithAssignees) => void;
}) {
  const [reviewValues, setReviewValues] = useState<ReviewValue>({
    review_platform: task?.review_platform ?? null,
    review_role: task?.review_role ?? null,
    review_page: task?.review_page ?? null,
    review_test_step: task?.review_test_step ?? null,
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (task) {
      setReviewValues({
        review_platform: task.review_platform,
        review_role: task.review_role,
        review_page: task.review_page,
        review_test_step: task.review_test_step,
      });
    }
  }, [task?.id, task?.review_platform, task?.review_role, task?.review_page, task?.review_test_step]);

  if (!task) return null;

  const idx = TASK_STATUSES.indexOf(task.status as (typeof TASK_STATUSES)[number]);
  const canLeft = idx > 0;
  const canRight = idx < TASK_STATUSES.length - 1;

  const isWaitingReview = task.status === "waiting_review";
  const canAddToChecklist = !!(
    reviewValues.review_platform ||
    reviewValues.review_role ||
    reviewValues.review_page?.trim() ||
    reviewValues.review_test_step?.trim()
  );

  function handleReviewPatch(taskId: string, fields: ReviewValue) {
    setReviewValues(fields);
    onReviewPatch(taskId, fields);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          {onDelete && (
            <button
              type="button"
              aria-label="Delete task"
              onClick={() => setDeleteConfirmOpen(true)}
              className="absolute top-4 right-10 rounded-xs opacity-40 transition-opacity hover:opacity-70 focus:outline-none"
            >
              <Trash2 className="size-4" />
            </button>
          )}
          <DialogHeader>
            <DialogTitle className="pr-6 text-base">{task.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Priority</span>
                <PriorityBadge priority={task.priority} className="text-xs" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Test Status</span>
                {isTested ? (
                  <span className="inline-flex items-center gap-1 font-medium text-green-600 dark:text-green-400">
                    <CheckCircle2 className="size-3.5" />
                    Test Successful
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>

            {isWaitingReview && (
              <ReviewFields key={task.id} task={task} onPatch={handleReviewPatch} />
            )}

            <div className={cn("flex items-center border-t pt-3", isWaitingReview ? "justify-between" : "justify-between")}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canLeft}
                onClick={() => onMove(task, "left")}
              >
                <ChevronLeft className="mr-1 size-4" />
                Move back
              </Button>

              {isWaitingReview && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={!canAddToChecklist}
                  onClick={() => {
                    onAddToChecklist?.(task.id, {
                      platform: reviewValues.review_platform,
                      role: reviewValues.review_role,
                      page_tab: reviewValues.review_page?.trim() || null,
                      test_step: reviewValues.review_test_step?.trim() || null,
                    });
                    onOpenChange(false);
                  }}
                >
                  Add to Test Checklist
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canRight || (isWaitingReview && hasActiveTest)}
                onClick={() => onMove(task, "right")}
              >
                Move forward
                <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={(o) => setDeleteConfirmOpen(o)}
        title="Delete this task?"
        description={`"${task.title}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
          onDelete?.(task);
          onOpenChange(false);
        }}
      />
    </>
  );
}
