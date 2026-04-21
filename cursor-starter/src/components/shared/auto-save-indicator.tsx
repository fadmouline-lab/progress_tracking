"use client";

import { Check, Loader2 } from "lucide-react";
import type { SaveState } from "@/hooks/use-auto-save";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function mergeSaveStates(...states: SaveState[]): SaveState {
  if (states.includes("error")) return "error";
  if (states.includes("saving")) return "saving";
  if (states.includes("saved")) return "saved";
  return "idle";
}

export function AutoSaveIndicator({
  state,
  onRetry,
  className,
}: {
  state: SaveState;
  onRetry?: () => void;
  className?: string;
}) {
  if (state === "idle") return null;

  if (state === "saving") {
    return (
      <div
        className={cn(
          "pointer-events-none flex items-center gap-1 rounded-full border bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm",
          className,
        )}
        aria-live="polite"
      >
        <Loader2 className="size-3.5 animate-spin" />
        Saving
      </div>
    );
  }

  if (state === "saved") {
    return (
      <div
        className={cn(
          "pointer-events-none flex items-center gap-1 rounded-full border bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm",
          className,
        )}
        aria-live="polite"
      >
        <Check className="size-3.5 text-emerald-600" />
        Saved
      </div>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex size-3 rounded-full bg-destructive shadow-sm ring-2 ring-background",
            className,
          )}
          onClick={() => onRetry?.()}
          aria-label="Save error — click to retry if available"
        />
      </TooltipTrigger>
      <TooltipContent side="left">
        Save failed{onRetry ? ". Click dot to retry." : "."}
      </TooltipContent>
    </Tooltip>
  );
}
