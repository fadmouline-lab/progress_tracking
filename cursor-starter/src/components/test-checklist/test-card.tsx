"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Info, Monitor, Smartphone, Trash2, Plus } from "lucide-react";
import { useAutoSave } from "@/hooks/use-auto-save";
import {
  PLATFORMS,
  ROLES,
  ROLE_LABELS,
  TEST_RESULT_LABELS,
  TEST_RESULT_STYLES,
  TEST_RESULTS,
} from "@/lib/constants";
import type { TestItem } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TextDraft = {
  account: string;
  page_tab: string;
  test_step: string;
  comments: string;
  fix: string;
};

function draftFromItem(item: TestItem): TextDraft {
  return {
    account: item.account ?? "",
    page_tab: item.page_tab ?? "",
    test_step: item.test_step ?? "",
    comments: item.comments ?? "",
    fix: item.fix ?? "",
  };
}

const ROW_BG: Record<string, string> = {
  pending: "",
  pass: "bg-emerald-50/70 dark:bg-emerald-950/20",
  fail: "bg-red-50/70 dark:bg-red-950/20",
  fixed: "bg-sky-50/70 dark:bg-sky-950/20",
};

const RESULT_DOT: Record<string, string> = {
  pending: "bg-muted-foreground/40",
  pass: "bg-emerald-500",
  fail: "bg-red-500",
  fixed: "bg-sky-500",
};

export function TestCard({
  item,
  tab,
  saveRowFields,
  onResultPassOrFixed,
  onDelete,
  taskTitle,
  showTaskColumn,
}: {
  item: TestItem;
  tab: "core" | "new" | "completed";
  saveRowFields: (id: string, patch: Partial<TestItem>) => Promise<void>;
  onResultPassOrFixed?: (next: "pass" | "fixed") => void;
  onDelete?: () => void;
  taskTitle?: { title: string; assignee: string | null };
  showTaskColumn?: boolean;
}) {
  const [textDraft, setTextDraft] = useState<TextDraft>(() => draftFromItem(item));
  const [notesOpen, setNotesOpen] = useState(
    !!(item.account || item.comments || item.fix),
  );

  const textPayload = useMemo(
    () => ({
      account: textDraft.account.trim() ? textDraft.account : "",
      page_tab: textDraft.page_tab.trim() ? textDraft.page_tab : "",
      test_step: textDraft.test_step.trim() ? textDraft.test_step : "",
      comments: textDraft.comments.trim() ? textDraft.comments : "",
      fix: textDraft.fix.trim() ? textDraft.fix : "",
    }),
    [textDraft],
  );

  const saveRowRef = useRef(saveRowFields);
  useEffect(() => {
    saveRowRef.current = saveRowFields;
  }, [saveRowFields]);

  const persistTexts = useCallback(
    async (next: typeof textPayload) => {
      await saveRowRef.current(item.id, {
        account: next.account || null,
        page_tab: next.page_tab || null,
        test_step: next.test_step || null,
        comments: next.comments || null,
        fix: next.fix || null,
      });
    },
    [item.id],
  );

  useAutoSave(textPayload, persistTexts, 500);

  const resultStyle = TEST_RESULT_STYLES[item.result] ?? TEST_RESULT_STYLES.pending;
  const hasNotes = !!(textDraft.account || textDraft.comments || textDraft.fix);

  return (
    <motion.div
      layout
      layoutId={`test-card-${item.id}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={cn("rounded-lg border p-3 space-y-3", ROW_BG[item.result])}
    >
      {/* Platform + Role */}
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={item.platform ?? "__none__"}
          onValueChange={(v) =>
            void saveRowFields(item.id, { platform: v === "__none__" ? null : v })
          }
        >
          <SelectTrigger className="h-11">
            {item.platform === "web" && (
              <Monitor className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            {item.platform === "mobile" && (
              <Smartphone className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">—</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p} value={p}>
                {p === "mobile" ? "Mobile" : "Web"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={item.role ?? "__none__"}
          onValueChange={(v) =>
            void saveRowFields(item.id, { role: v === "__none__" ? null : v })
          }
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">—</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r] ?? r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Task reference (if available) */}
      {showTaskColumn && taskTitle && (
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="size-3.5 mt-px shrink-0" />
          <div className="min-w-0">
            <p className="truncate">{taskTitle.title}</p>
            {taskTitle.assignee && (
              <p className="truncate text-muted-foreground/70">{taskTitle.assignee}</p>
            )}
          </div>
        </div>
      )}

      {/* Page / Tab */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Page / Tab</label>
        <Input
          className="h-11"
          placeholder="Page or tab…"
          value={textDraft.page_tab}
          onChange={(e) => setTextDraft((d) => ({ ...d, page_tab: e.target.value }))}
        />
      </div>

      {/* Test Step */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Test Step</label>
        <Input
          className="h-11"
          placeholder="What to test…"
          value={textDraft.test_step}
          onChange={(e) => setTextDraft((d) => ({ ...d, test_step: e.target.value }))}
        />
      </div>

      {/* Result */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Result</label>
        <Select
          value={item.result}
          onValueChange={(v) => {
            const next = v as (typeof TEST_RESULTS)[number];
            if (
              tab === "new" &&
              (next === "pass" || next === "fixed") &&
              onResultPassOrFixed
            ) {
              onResultPassOrFixed(next);
              return;
            }
            void saveRowFields(item.id, { result: next });
          }}
        >
          <SelectTrigger className={cn("h-11 w-full capitalize", resultStyle.trigger)}>
            <span className={cn("size-2 shrink-0 rounded-full", RESULT_DOT[item.result])} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TEST_RESULTS.map((r) => (
              <SelectItem key={r} value={r}>
                {TEST_RESULT_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes toggle + Delete */}
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "flex h-11 items-center gap-1.5 px-2 text-xs",
            hasNotes ? "text-primary" : "text-muted-foreground",
          )}
          onClick={() => setNotesOpen((o) => !o)}
        >
          {notesOpen ? (
            <ChevronUp className="size-3.5" />
          ) : (
            <ChevronDown className="size-3.5" />
          )}
          {hasNotes ? "Notes" : "Add notes"}
        </Button>
        {onDelete && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 text-muted-foreground/40 hover:text-destructive/70"
            aria-label="Delete row"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      {/* Inline notes (expandable, no popover) */}
      {notesOpen && (
        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Account</label>
            <Input
              className="h-9 text-sm"
              placeholder="Account used…"
              value={textDraft.account}
              onChange={(e) => setTextDraft((d) => ({ ...d, account: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Comments</label>
            <Textarea
              className="min-h-[60px] resize-y text-sm"
              placeholder="Add comments…"
              value={textDraft.comments}
              onChange={(e) => setTextDraft((d) => ({ ...d, comments: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Fix</label>
            <Textarea
              className="min-h-[60px] resize-y text-sm"
              placeholder="Describe the fix…"
              value={textDraft.fix}
              onChange={(e) => setTextDraft((d) => ({ ...d, fix: e.target.value }))}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function TestCardList({
  tab,
  rows,
  emptyHint,
  onAddRow,
  showAddRow,
  footer,
  saveRowFields,
  onResultPassOrFixed,
  onDeleteRow,
  taskTitles,
}: {
  tab: "core" | "new" | "completed";
  rows: TestItem[];
  emptyHint: string;
  onAddRow?: () => void;
  showAddRow?: boolean;
  footer?: React.ReactNode;
  saveRowFields: (id: string, patch: Partial<TestItem>) => Promise<void>;
  onResultPassOrFixed?: (item: TestItem, next: "pass" | "fixed") => void;
  onDeleteRow?: (item: TestItem) => void;
  taskTitles?: Record<string, { title: string; assignee: string | null }>;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {showAddRow && onAddRow ? (
          <Button type="button" size="sm" variant="secondary" onClick={onAddRow}>
            <Plus className="mr-1 size-4" />
            Add row
          </Button>
        ) : (
          <span />
        )}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border py-8 text-center text-sm text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {rows.map((item) => (
              <TestCard
                key={item.id}
                item={item}
                tab={tab}
                saveRowFields={saveRowFields}
                onResultPassOrFixed={
                  tab === "new" && onResultPassOrFixed
                    ? (next) => onResultPassOrFixed(item, next)
                    : undefined
                }
                onDelete={onDeleteRow ? () => onDeleteRow(item) : undefined}
                taskTitle={
                  taskTitles && item.source_task_id
                    ? taskTitles[item.source_task_id]
                    : undefined
                }
                showTaskColumn={!!taskTitles}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {footer ? <div className="pt-2">{footer}</div> : null}
    </div>
  );
}
