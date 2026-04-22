"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { useAutoSave } from "@/hooks/use-auto-save";
import type { ScopeBullet as ScopeBulletRow } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ScopeBullet({
  bullet,
  onRemove,
  persistBulletContent,
  onContentChange,
}: {
  bullet: ScopeBulletRow;
  onRemove: (id: string) => void;
  persistBulletContent: (id: string, content: string) => Promise<void>;
  onContentChange: (id: string, content: string) => void;
}) {
  useAutoSave(bullet.content, async (next) => {
    const safe = next.trim().length ? next : "New scope item";
    if (safe !== next) {
      onContentChange(bullet.id, safe);
    }
    await persistBulletContent(bullet.id, safe);
  });

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: bullet.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-card px-3 py-2 shadow-xs",
        isDragging && "opacity-70 ring-2 ring-primary/30",
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground/40 hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label="Reorder bullet"
      >
        <GripVertical className="size-4" />
      </button>
      <Input
        className="flex-1 border-0 bg-transparent dark:bg-transparent px-0 shadow-none focus-visible:ring-0"
        value={bullet.content}
        onChange={(e) => {
          const v = e.target.value;
          onContentChange(bullet.id, v);
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground/40 hover:text-destructive"
        onClick={() => onRemove(bullet.id)}
        aria-label="Delete bullet"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
