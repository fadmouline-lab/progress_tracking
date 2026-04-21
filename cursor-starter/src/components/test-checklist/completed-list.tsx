"use client";

import { ChevronRight, Trash2 } from "lucide-react";
import type { TestBatch, TestItem } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { TestTable } from "@/components/test-checklist/test-table";

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function CompletedList({
  batches,
  expandedBatchId,
  onBatchOpenChange,
  itemsForBatch,
  completedNewItems,
  onRestoreNew,
  onDeleteRow,
  saveRowFields,
  resolveMemberName,
}: {
  batches: TestBatch[];
  expandedBatchId: string | null;
  onBatchOpenChange: (batchId: string, open: boolean) => void;
  itemsForBatch: (batchId: string) => TestItem[];
  completedNewItems: TestItem[];
  onRestoreNew: (item: TestItem) => void;
  onDeleteRow?: (item: TestItem) => void;
  saveRowFields: (id: string, patch: Partial<TestItem>) => Promise<void>;
  resolveMemberName: (userId: string | null) => string;
}) {
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Core release checkpoints
        </h3>
        {batches.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No submitted core checklists yet — when you Close and Submit from Core
            Features, a snapshot appears here.
          </p>
        ) : (
          <div className="space-y-2">
            {batches.map((b) => {
              const open = expandedBatchId === b.id;
              const rows = itemsForBatch(b.id);
              return (
                <Collapsible
                  key={b.id}
                  open={open}
                  onOpenChange={(next) => onBatchOpenChange(b.id, next)}
                >
                  <div className="rounded-lg border">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-muted/40"
                      >
                        <span className="font-medium">
                          Core batch · {formatWhen(b.submitted_at)}
                        </span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          {resolveMemberName(b.submitted_by)}
                          <ChevronRight
                            className={cn(
                              "size-4 transition-transform",
                              open && "rotate-90",
                            )}
                          />
                        </span>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t p-3">
                        <TestTable
                          tab="completed"
                          rows={rows}
                          emptyHint="This batch has no rows (unexpected)."
                          saveRowFields={saveRowFields}
                          onDeleteRow={onDeleteRow}
                        />
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Shipped new features
        </h3>
        {completedNewItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No completed new-feature rows yet — mark a New Features row Pass or Fixed
            and confirm to move it here.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {completedNewItems.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium">
                    {(item.page_tab ?? "—") + " · " + (item.test_step ?? "—")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Result: {item.result}
                    {item.source_task_id ? " · Linked to Progress task" : null}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onRestoreNew(item)}
                  >
                    Restore…
                  </Button>
                  {onDeleteRow && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 text-muted-foreground/30 hover:text-destructive/70"
                      aria-label="Delete row"
                      onClick={() => onDeleteRow(item)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
