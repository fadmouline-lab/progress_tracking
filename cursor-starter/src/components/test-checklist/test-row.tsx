"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquarePlus, Monitor, Smartphone, Trash2 } from "lucide-react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell } from "@/components/ui/table";

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

export function TestRow({
  item,
  tab,
  saveRowFields,
  onResultPassOrFixed,
  onDelete,
}: {
  item: TestItem;
  tab: "core" | "new" | "completed";
  saveRowFields: (id: string, patch: Partial<TestItem>) => Promise<void>;
  onResultPassOrFixed?: (next: "pass" | "fixed") => void;
  onDelete?: () => void;
}) {
  const [textDraft, setTextDraft] = useState<TextDraft>(() => draftFromItem(item));

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

  const persistTexts = useCallback(async (next: typeof textPayload) => {
    await saveRowRef.current(item.id, {
      account: next.account || null,
      page_tab: next.page_tab || null,
      test_step: next.test_step || null,
      comments: next.comments || null,
      fix: next.fix || null,
    });
  }, [item.id]);

  useAutoSave(textPayload, persistTexts, 500);

  const resultStyle =
    TEST_RESULT_STYLES[item.result] ?? TEST_RESULT_STYLES.pending;

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

  return (
    <motion.tr
      layout
      layoutId={`test-item-${item.id}`}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 80, transition: { duration: 0.22 } }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={cn("hover:bg-muted/50 border-b transition-colors align-top", ROW_BG[item.result])}
    >
        <TableCell className="min-w-[120px]">
          <Select
            value={item.platform ?? "__none__"}
            onValueChange={(v) =>
              void saveRowFields(item.id, {
                platform: v === "__none__" ? null : v,
              })
            }
          >
            <SelectTrigger className="h-9">
              {item.platform === "web" && <Monitor className="size-3.5 shrink-0 text-muted-foreground" />}
              {item.platform === "mobile" && <Smartphone className="size-3.5 shrink-0 text-muted-foreground" />}
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
        </TableCell>
        <TableCell className="min-w-[140px]">
          <Select
            value={item.role ?? "__none__"}
            onValueChange={(v) =>
              void saveRowFields(item.id, {
                role: v === "__none__" ? null : v,
              })
            }
          >
            <SelectTrigger className="h-9">
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
        </TableCell>
        <TableCell className="min-w-[120px]">
          <Input
            className="h-9"
            value={textDraft.account}
            onChange={(e) =>
              setTextDraft((d) => ({ ...d, account: e.target.value }))
            }
          />
        </TableCell>
        <TableCell className="min-w-[140px]">
          <Input
            className="h-9"
            value={textDraft.page_tab}
            onChange={(e) =>
              setTextDraft((d) => ({ ...d, page_tab: e.target.value }))
            }
          />
        </TableCell>
        <TableCell className="min-w-[160px]">
          <Input
            className="h-9"
            value={textDraft.test_step}
            onChange={(e) =>
              setTextDraft((d) => ({ ...d, test_step: e.target.value }))
            }
          />
        </TableCell>
        <TableCell className="min-w-[120px]">
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
            <SelectTrigger
              className={cn("h-9 capitalize", resultStyle.trigger)}
            >
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
        </TableCell>
        <TableCell className="w-10 text-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "size-8",
                  (textDraft.comments || textDraft.fix)
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
                aria-label="Comments and fix"
              >
                <MessageSquarePlus className="size-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 space-y-3" align="end">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Comments</label>
                <Textarea
                  className="min-h-[72px] resize-y text-sm"
                  placeholder="Add comments…"
                  value={textDraft.comments}
                  onChange={(e) =>
                    setTextDraft((d) => ({ ...d, comments: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Fix</label>
                <Textarea
                  className="min-h-[72px] resize-y text-sm"
                  placeholder="Describe the fix…"
                  value={textDraft.fix}
                  onChange={(e) =>
                    setTextDraft((d) => ({ ...d, fix: e.target.value }))
                  }
                />
              </div>
            </PopoverContent>
          </Popover>
        </TableCell>
        <TableCell className="w-10 text-center">
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground/30 hover:text-destructive/70"
              aria-label="Delete row"
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </TableCell>
    </motion.tr>
  );
}
