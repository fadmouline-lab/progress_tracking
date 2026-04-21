"use client";

import { useEffect, useRef, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";

export type SaveState = "idle" | "saving" | "saved" | "error";

function stableStringify(value: unknown): string {
  if (typeof value === "string" || typeof value === "number")
    return JSON.stringify(value);
  if (value === null || value === undefined) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const keys = Object.keys(o).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function valuesEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) {
    return stableStringify(a) === stableStringify(b);
  }
  return false;
}

export function useAutoSave<T>(
  value: T,
  saveFn: (value: T) => Promise<void>,
  delayMs = 500,
) {
  const debounced = useDebounce(value, delayMs);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const mounted = useRef(false);
  const lastSaved = useRef<T | undefined>(undefined);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      lastSaved.current = debounced;
      return;
    }

    if (valuesEqual(debounced, lastSaved.current)) {
      return;
    }

    let cancelled = false;
    let savedTimer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      setSaveState("saving");
      try {
        await saveFn(debounced);
        if (cancelled) return;
        lastSaved.current = debounced;
        setSaveState("saved");
        savedTimer = setTimeout(() => {
          if (!cancelled) setSaveState("idle");
        }, 1200);
      } catch {
        if (!cancelled) setSaveState("error");
      }
    })();

    return () => {
      cancelled = true;
      if (savedTimer) clearTimeout(savedTimer);
    };
  }, [debounced, saveFn]);

  return { saveState, setSaveState } as const;
}
