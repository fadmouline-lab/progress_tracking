"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import type { ProjectMemberWithProfile } from "@/components/project/project-provider";
import type { ScopeBullet as ScopeBulletRow } from "@/types";
import type { TaskWithAssignees } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScopeBullet } from "@/components/scope/scope-bullet";
import { PriorityBadge } from "@/components/shared/priority-badge";
import { UserAvatar } from "@/components/shared/user-avatar";

export function UserScopeCard({
  member,
  bullets,
  assignedTasks,
  onAddBullet,
  onRemoveBullet,
  onContentChange,
  persistBulletContent,
  reorderBulletsForUser,
}: {
  member: ProjectMemberWithProfile;
  bullets: ScopeBulletRow[];
  assignedTasks: TaskWithAssignees[];
  onAddBullet: (userId: string) => void;
  onRemoveBullet: (id: string) => void;
  onContentChange: (id: string, content: string) => void;
  persistBulletContent: (id: string, content: string) => Promise<void>;
  reorderBulletsForUser: (userId: string, next: ScopeBulletRow[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = useMemo(() => bullets.map((b) => b.id), [bullets]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = bullets.findIndex((b) => b.id === active.id);
    const newIndex = bullets.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(bullets, oldIndex, newIndex);
    reorderBulletsForUser(member.user_id, next);
  }

  const name =
    member.profile?.full_name?.trim() || member.profile?.email || "Member";
  const [tasksOpen, setTasksOpen] = useState(false);

  return (
    <Card className="flex h-full flex-col border shadow-sm">
      <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
        <UserAvatar name={name} avatarUrl={member.profile?.avatar_url} />
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate text-base">{name}</CardTitle>
          <CardDescription>Scope summary & assigned tasks</CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onAddBullet(member.user_id)}
        >
          <Plus className="mr-1 size-4" />
          General Scope
        </Button>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2">
              {bullets.map((b) => (
                <ScopeBullet
                  key={b.id}
                  bullet={b}
                  onRemove={onRemoveBullet}
                  persistBulletContent={persistBulletContent}
                  onContentChange={onContentChange}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Collapsible open={tasksOpen} onOpenChange={setTasksOpen}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="flex w-full justify-between px-0 text-left"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                Assigned Tasks Needing Review
                {assignedTasks.length > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                    {assignedTasks.length}
                  </span>
                )}
              </span>
              {tasksOpen ? (
                <ChevronDown className="size-4 shrink-0" />
              ) : (
                <ChevronRight className="size-4 shrink-0" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <motion.div
              initial={false}
              className="mt-2 space-y-2 rounded-md border bg-muted/30 p-3"
              layout
            >
              <AnimatePresence initial={false}>
                {assignedTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No assigned tasks yet.
                  </p>
                ) : (
                  assignedTasks.map((t) => (
                    <motion.div
                      key={t.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {t.title}
                      </span>
                      <PriorityBadge priority={t.priority} className="shrink-0 text-xs" />
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </motion.div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
