"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { PRIORITIES } from "@/lib/constants";
import type { ProjectMemberWithProfile } from "@/components/project/project-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <Card className="mx-auto w-full max-w-3xl border shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="space-y-2">
            <Label htmlFor="scope-task-title">New task</Label>
            <Input
              id="scope-task-title"
              placeholder="Describe the task, assign people, set priority…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submit();
                }
              }}
            />
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            <div className="flex-1 space-y-2">
              <Label>Assign to</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {members.map((m) => {
                  const id = m.user_id;
                  const name =
                    m.profile?.full_name?.trim() ||
                    m.profile?.email ||
                    "Member";
                  return (
                    <label
                      key={id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm"
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
                      <span className="truncate">{name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="w-full space-y-2 md:w-56">
              <Label>Priority</Label>
              <Select
                value={String(priority)}
                onValueChange={(v) => setPriority(Number(v))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={String(p.value)}>
                      <span className={p.textClass}>{p.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => void submit()}
              disabled={
                submitting || !title.trim() || !Object.values(assignees).some(Boolean)
              }
            >
              {submitting ? "Adding…" : "Add task"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
