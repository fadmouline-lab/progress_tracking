"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { PLATFORMS, ROLE_LABELS, ROLES } from "@/lib/constants";
import type { TaskWithAssignees } from "@/types";
import { useAutoSave } from "@/hooks/use-auto-save";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type ReviewValue = {
  review_platform: string | null;
  review_role: string | null;
  review_page: string | null;
  review_test_step: string | null;
};

export function ReviewFields({
  task,
  onPatch,
}: {
  task: TaskWithAssignees;
  onPatch: (id: string, fields: ReviewValue) => void;
}) {
  const initial = useMemo<ReviewValue>(
    () => ({
      review_platform: task.review_platform,
      review_role: task.review_role,
      review_page: task.review_page ?? "",
      review_test_step: task.review_test_step ?? "",
    }),
    [task.review_platform, task.review_role, task.review_page, task.review_test_step],
  );

  const [value, setValue] = useState<ReviewValue>(initial);

  useEffect(() => {
    setValue(initial);
  }, [initial]);

  useAutoSave(value, async (next) => {
    try {
      const supabase = createClient();
      const payload = {
        review_platform: next.review_platform,
        review_role: next.review_role,
        review_page: next.review_page?.trim() ? next.review_page.trim() : null,
        review_test_step: next.review_test_step?.trim()
          ? next.review_test_step.trim()
          : null,
      };
      const { error } = await supabase
        .from("tasks")
        .update(payload)
        .eq("id", task.id);
      if (error) throw new Error(error.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save review fields.");
      throw e;
    }
  });

  function update(partial: Partial<ReviewValue>) {
    setValue((prev) => {
      const next = { ...prev, ...partial };
      onPatch(task.id, {
        review_platform: next.review_platform,
        review_role: next.review_role,
        review_page: next.review_page,
        review_test_step: next.review_test_step,
      });
      return next;
    });
  }

  const platformValue = value.review_platform ?? "__none__";
  const roleValue = value.review_role ?? "__none__";

  return (
    <div className="mt-3 grid gap-3 rounded-md border bg-muted/30 p-3 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Platform</Label>
        <Select
          value={platformValue}
          onValueChange={(v) =>
            update({ review_platform: v === "__none__" ? null : v })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Select…</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p} value={p}>
                {p === "mobile" ? "Mobile" : "Web"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>User account / role</Label>
        <Select
          value={roleValue}
          onValueChange={(v) =>
            update({ review_role: v === "__none__" ? null : v })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Select…</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r] ?? r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 md:col-span-1">
        <Label>Page / tab</Label>
        <Input
          value={value.review_page ?? ""}
          onChange={(e) => update({ review_page: e.target.value })}
          placeholder="Where in the app?"
        />
      </div>
      <div className="space-y-2 md:col-span-1">
        <Label>Test step</Label>
        <Input
          value={value.review_test_step ?? ""}
          onChange={(e) => update({ review_test_step: e.target.value })}
          placeholder="What should reviewers do?"
        />
      </div>
    </div>
  );
}
