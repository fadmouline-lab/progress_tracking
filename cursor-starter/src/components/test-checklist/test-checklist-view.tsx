"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useProject, useProjectSaveSlot } from "@/hooks/use-project";
import { useTestItems } from "@/hooks/use-test-items";
import { useIsLg } from "@/hooks/use-mobile";
import { TestSubtabs } from "@/components/test-checklist/test-subtabs";
import { TestTable } from "@/components/test-checklist/test-table";
import { TestCardList } from "@/components/test-checklist/test-card";
import { CompletedList } from "@/components/test-checklist/completed-list";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { TestItem } from "@/types";

export function TestChecklistView() {
  const { projectId, members, loading: projectLoading } = useProject();
  const checklist = useTestItems(projectId);
  useProjectSaveSlot("test", checklist.saveState);

  const isLg = useIsLg();
  const [sub, setSub] = useState<"core" | "new" | "completed">("new");
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

  const [passOpen, setPassOpen] = useState(false);
  const [passTarget, setPassTarget] = useState<{
    item: TestItem;
    next: "pass" | "fixed";
  } | null>(null);

  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<TestItem | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TestItem | null>(null);

  const resolveMemberName = useCallback(
    (userId: string | null) => {
      if (!userId) return "Unknown";
      const m = members.find((x) => x.user_id === userId);
      return m?.profile?.full_name ?? m?.profile?.email ?? "Member";
    },
    [members],
  );

  const { saveRowFields } = checklist;

  const coreRows = [...checklist.itemsByTab("core")].sort((a, b) => {
    const aSettled = a.result === "pass" || a.result === "fixed" ? 1 : 0;
    const bSettled = b.result === "pass" || b.result === "fixed" ? 1 : 0;
    return aSettled - bSettled;
  });
  const newRows = checklist.itemsByTab("new");

  const onSubmitCore = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const ok = await checklist.submitCoreBatch(user?.id ?? null);
    if (ok) {
      toast.success("Core checklist submitted — find it under Completed.");
    }
  }, [checklist]);

  const onPassIntent = useCallback((item: TestItem, next: "pass" | "fixed") => {
    setPassTarget({ item, next });
    setPassOpen(true);
  }, []);

  const onPassConfirm = useCallback(async () => {
    if (!passTarget) return;
    try {
      await checklist.saveRowFields(passTarget.item.id, {
        result: passTarget.next,
      });
      await checklist.completeNewRow(passTarget.item.id);
      toast.success("Row completed.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not complete this row.",
      );
      throw e;
    }
  }, [passTarget, checklist]);

  const onRestoreClick = useCallback((item: TestItem) => {
    setRestoreTarget(item);
    setRestoreOpen(true);
  }, []);

  const onRestoreConfirm = useCallback(async () => {
    if (!restoreTarget) return;
    try {
      await checklist.restoreNewFromCompleted(restoreTarget.id);
      toast.success("Row restored to New Features.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not restore this row.",
      );
      throw e;
    }
  }, [restoreTarget, checklist]);

  const onDeleteIntent = useCallback((item: TestItem) => {
    setDeleteTarget(item);
    setDeleteOpen(true);
  }, []);

  const onDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await checklist.deleteRow(deleteTarget.id);
      toast.success("Row deleted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete row.");
      throw e;
    }
  }, [deleteTarget, checklist]);

  if (projectLoading || checklist.loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 max-w-xl" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <TestSubtabs value={sub} onValueChange={setSub}>
        {{
          core: isLg ? (
            <TestTable
              tab="core"
              rows={coreRows}
              emptyHint="No core rows yet — add what you regression-test every release."
              showAddRow
              onAddRow={() => void checklist.addRow("core")}
              saveRowFields={saveRowFields}
              onDeleteRow={onDeleteIntent}
              footer={
                <div className="flex justify-end">
                  <Button
                    type="button"
                    disabled={!checklist.coreCanSubmit}
                    onClick={() => void onSubmitCore()}
                  >
                    Close and Submit
                  </Button>
                </div>
              }
            />
          ) : (
            <TestCardList
              tab="core"
              rows={coreRows}
              emptyHint="No core rows yet — add what you regression-test every release."
              showAddRow
              onAddRow={() => void checklist.addRow("core")}
              saveRowFields={saveRowFields}
              onDeleteRow={onDeleteIntent}
              footer={
                <div className="flex justify-end">
                  <Button
                    type="button"
                    disabled={!checklist.coreCanSubmit}
                    onClick={() => void onSubmitCore()}
                  >
                    Close and Submit
                  </Button>
                </div>
              }
            />
          ),
          new: isLg ? (
            <TestTable
              tab="new"
              rows={newRows}
              emptyHint="No new-feature rows — they appear when Progress tasks are Waiting on Review, or use Add row."
              showAddRow
              onAddRow={() => void checklist.addRow("new")}
              saveRowFields={saveRowFields}
              onResultPassOrFixed={onPassIntent}
              onDeleteRow={onDeleteIntent}
              taskTitles={checklist.taskTitles}
            />
          ) : (
            <TestCardList
              tab="new"
              rows={newRows}
              emptyHint="No new-feature rows — they appear when Progress tasks are Waiting on Review, or use Add row."
              showAddRow
              onAddRow={() => void checklist.addRow("new")}
              saveRowFields={saveRowFields}
              onResultPassOrFixed={onPassIntent}
              onDeleteRow={onDeleteIntent}
              taskTitles={checklist.taskTitles}
            />
          ),
          completed: (
            <CompletedList
              batches={checklist.completedCoreBatches}
              expandedBatchId={expandedBatchId}
              onBatchOpenChange={(id, open) => {
                setExpandedBatchId((cur) => {
                  if (open) return id;
                  return cur === id ? null : cur;
                });
              }}
              itemsForBatch={checklist.itemsForBatch}
              completedNewItems={checklist.completedNewFeatureItems}
              onRestoreNew={onRestoreClick}
              onDeleteRow={onDeleteIntent}
              saveRowFields={saveRowFields}
              resolveMemberName={resolveMemberName}
            />
          ),
        }}
      </TestSubtabs>

      <ConfirmDialog
        open={passOpen}
        onOpenChange={(o) => {
          setPassOpen(o);
          if (!o) setPassTarget(null);
        }}
        title="Want to mark this complete?"
        description="This moves the checklist row to Completed and, if it came from Progress, marks the source task completed."
        confirmLabel="Yes, complete"
        cancelLabel="Not yet"
        onConfirm={onPassConfirm}
      />

      <ConfirmDialog
        open={restoreOpen}
        onOpenChange={(o) => {
          setRestoreOpen(o);
          if (!o) setRestoreTarget(null);
        }}
        title="Restore this row?"
        description="Moves the item back to New Features as Pending and clears the Fix field."
        confirmLabel="Restore"
        cancelLabel="Cancel"
        onConfirm={onRestoreConfirm}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o);
          if (!o) setDeleteTarget(null);
        }}
        title="Delete this row?"
        description="This permanently removes the row from the checklist. This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={onDeleteConfirm}
      />
    </div>
  );
}
