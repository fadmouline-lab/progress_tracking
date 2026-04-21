"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Flame, ArrowUp, Sparkles, Paintbrush, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PRIORITIES } from "@/lib/constants";

const PRIORITY_ICONS: Record<number, React.ElementType> = {
  1: Flame,
  2: ArrowUp,
  3: Sparkles,
  4: Paintbrush,
  5: Clock,
};
import type { ProjectMemberWithProfile } from "@/components/project/project-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

export function TaskInputBar({
  members,
  onCreateTask,
}: {
  members: ProjectMemberWithProfile[];
  onCreateTask: (input: {
    title: string;
    priority: number;
    assigneeUserIds: string[];
    createdBy: string | null;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<number>(3);
  const [assignees, setAssignees] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [flashKey, setFlashKey] = useState(0);

  async function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const ids = Object.entries(assignees)
      .filter(([, v]) => v)
      .map(([id]) => id);
    if (ids.length === 0) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await onCreateTask({
        title: trimmed,
        priority,
        assigneeUserIds: ids,
        createdBy: user?.id ?? null,
      });
      setTitle("");
      setAssignees({});
      setPriority(3);
      setFlashKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      key={flashKey}
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
    >
      <Card className="mx-auto w-full max-w-5xl border shadow-sm">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <Input
              id="scope-task-title"
              placeholder="Describe the task…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submit();
                }
              }}
              className="flex-1"
            />
            <div className="flex shrink-0 items-center gap-2">
              {members.map((m) => {
                const id = m.user_id;
                const name =
                  m.profile?.full_name?.trim() ||
                  m.profile?.email ||
                  "Member";
                return (
                  <label
                    key={id}
                    className="flex cursor-pointer items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm whitespace-nowrap"
                  >
                    <Checkbox
                      checked={!!assignees[id]}
                      onCheckedChange={(v) =>
                        setAssignees((prev) => ({
                          ...prev,
                          [id]: v === true,
                        }))
                      }
                    />
                    <span>{name}</span>
                  </label>
                );
              })}
            </div>
            <Select
              value={String(priority)}
              onValueChange={(v) => setPriority(Number(v))}
            >
              <SelectTrigger className="w-44 shrink-0">
                <SelectValue placeholder="Priority" />
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
            <Button
              type="button"
              onClick={() => void submit()}
              disabled={
                submitting || !title.trim() || !Object.values(assignees).some(Boolean)
              }
              className="shrink-0"
            >
              {submitting ? "Assigning…" : "Assign task"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
