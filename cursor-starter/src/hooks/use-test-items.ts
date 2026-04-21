"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { SaveState } from "@/hooks/use-auto-save";
import type { TestBatch, TestItem } from "@/types";

function debounce<T extends (...args: never[]) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn(...args);
    }, ms);
  };
}

export function useTestItems(projectId: string) {
  const [items, setItems] = useState<TestItem[]>([]);
  const [batches, setBatches] = useState<TestBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const runWithSaveState = useCallback(async (fn: () => Promise<void>) => {
    setSaveState("saving");
    try {
      await fn();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1200);
    } catch (e) {
      setSaveState("error");
      toast.error(
        e instanceof Error ? e.message : "Could not save test checklist.",
      );
    }
  }, []);

  const loadAll = useCallback(async () => {
    const supabase = createClient();
    const [itemsRes, batchesRes] = await Promise.all([
      supabase
        .from("test_items")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("test_batches")
        .select("*")
        .eq("project_id", projectId)
        .order("submitted_at", { ascending: false }),
    ]);
    if (itemsRes.error) {
      toast.error(itemsRes.error.message);
      return;
    }
    if (batchesRes.error) {
      toast.error(batchesRes.error.message);
      return;
    }
    setItems((itemsRes.data ?? []) as TestItem[]);
    setBatches((batchesRes.data ?? []) as TestBatch[]);
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadAll();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAll]);

  const syncWaitingReviewRows = useCallback(async () => {
    const supabase = createClient();
    const { data: tasks, error: tErr } = await supabase
      .from("tasks")
      .select("id, review_platform, review_role, review_page, review_test_step, status")
      .eq("project_id", projectId)
      .eq("status", "waiting_review");
    if (tErr) {
      toast.error(tErr.message);
      return;
    }
    const { data: existing, error: eErr } = await supabase
      .from("test_items")
      .select("source_task_id")
      .eq("project_id", projectId)
      .not("source_task_id", "is", null);
    if (eErr) {
      toast.error(eErr.message);
      return;
    }
    const used = new Set(
      (existing ?? [])
        .map((r) => r.source_task_id as string | null)
        .filter(Boolean) as string[],
    );

    const ready = (tasks ?? []).filter((task) => {
      if (!task.review_platform || !task.review_role) return false;
      const page = (task.review_page ?? "").trim();
      const step = (task.review_test_step ?? "").trim();
      return page.length > 0 && step.length > 0;
    });

    for (const task of ready) {
      if (used.has(task.id)) continue;
      const { data: nextRows } = await supabase
        .from("test_items")
        .select("sort_order")
        .eq("project_id", projectId)
        .eq("tab", "new")
        .order("sort_order", { ascending: false })
        .limit(1);
      const nextOrder = (nextRows?.[0]?.sort_order ?? -1) + 1;
      const { error: insErr } = await supabase.from("test_items").upsert(
        {
          project_id: projectId,
          tab: "new",
          source_task_id: task.id,
          platform: task.review_platform,
          role: task.review_role,
          page_tab: task.review_page,
          test_step: task.review_test_step,
          result: "pending",
          sort_order: nextOrder,
        },
        { onConflict: "project_id,source_task_id", ignoreDuplicates: true },
      );
      if (insErr) {
        toast.error(insErr.message);
        return;
      }
      used.add(task.id);
    }
    await loadAll();
  }, [projectId, loadAll]);

  const debouncedSync = useMemo(
    () => debounce(() => void syncWaitingReviewRows(), 400),
    [syncWaitingReviewRows],
  );

  const debouncedReload = useMemo(
    () => debounce(() => void loadAll(), 250),
    [loadAll],
  );

  useEffect(() => {
    void syncWaitingReviewRows();
  }, [syncWaitingReviewRows]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`test-items-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "test_items",
          filter: `project_id=eq.${projectId}`,
        },
        () => debouncedReload(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "test_batches",
          filter: `project_id=eq.${projectId}`,
        },
        () => debouncedReload(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `project_id=eq.${projectId}`,
        },
        () => debouncedSync(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, debouncedReload, debouncedSync]);

  const itemsByTab = useCallback(
    (tab: "core" | "new" | "completed") =>
      items.filter((i) => i.tab === tab).sort((a, b) => a.sort_order - b.sort_order),
    [items],
  );

  const coreCanSubmit = useMemo(() => {
    const core = itemsByTab("core");
    if (core.length === 0) return false;
    return core.every((r) => r.result === "pass" || r.result === "fixed");
  }, [itemsByTab]);

  const completedCoreBatches = useMemo(
    () => batches.filter((b) => b.batch_type === "core"),
    [batches],
  );

  const completedNewFeatureItems = useMemo(
    () => items.filter((i) => i.tab === "completed" && i.source_task_id != null),
    [items],
  );

  const addRow = useCallback(
    async (tab: "core" | "new") => {
      const supabase = createClient();
      const list = items.filter((i) => i.tab === tab);
      const nextOrder = list.reduce((m, i) => Math.max(m, i.sort_order), -1) + 1;
      await runWithSaveState(async () => {
        const { error } = await supabase.from("test_items").insert({
          project_id: projectId,
          tab,
          sort_order: nextOrder,
          result: "pending",
        });
        if (error) throw new Error(error.message);
        await loadAll();
      });
    },
    [items, projectId, loadAll, runWithSaveState],
  );

  const patchItem = useCallback(
    async (id: string, patch: Partial<TestItem>) => {
      const supabase = createClient();
      const { error } = await supabase.from("test_items").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    [],
  );

  const updateItemLocal = useCallback((id: string, patch: Partial<TestItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const saveRowFields = useCallback(
    async (id: string, fields: Partial<TestItem>) => {
      const snapshot = items;
      updateItemLocal(id, fields);
      try {
        await patchItem(id, fields);
      } catch (e) {
        setItems(snapshot);
        toast.error(
          e instanceof Error ? e.message : "Could not save test row.",
        );
        throw e;
      }
    },
    [items, patchItem, updateItemLocal],
  );

  const submitCoreBatch = useCallback(
    async (submittedBy: string | null): Promise<boolean> => {
      const core = items.filter((i) => i.tab === "core");
      if (!core.length) {
        toast.message("Add at least one core row before submitting.");
        return false;
      }
      if (!core.every((r) => r.result === "pass" || r.result === "fixed")) {
        toast.error("Every core row must be Pass or Fixed before submit.");
        return false;
      }
      const snapshot = items;
      setSaveState("saving");
      try {
        const supabase = createClient();
        const { data: batch, error: bErr } = await supabase
          .from("test_batches")
          .insert({
            project_id: projectId,
            submitted_by: submittedBy,
            batch_type: "core",
          })
          .select("*")
          .single();
        if (bErr) throw new Error(bErr.message);
        const batchId = batch.id as string;
        const now = new Date().toISOString();
        for (const row of core) {
          const { error } = await supabase
            .from("test_items")
            .update({
              tab: "completed",
              checklist_batch_id: batchId,
              completed_at: now,
            })
            .eq("id", row.id);
          if (error) throw new Error(error.message);
        }
        await loadAll();
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1200);
        return true;
      } catch (e) {
        setItems(snapshot);
        setSaveState("error");
        toast.error(
          e instanceof Error ? e.message : "Could not submit core checklist.",
        );
        return false;
      }
    },
    [items, projectId, loadAll],
  );

  const completeNewRow = useCallback(
    async (itemId: string) => {
      const row = items.find((i) => i.id === itemId);
      if (!row) return;
      const snapshot = items;
      const now = new Date().toISOString();
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, tab: "completed", completed_at: now, result: i.result }
            : i,
        ),
      );
      try {
        await patchItem(itemId, {
          tab: "completed",
          completed_at: now,
        });
        if (row.source_task_id) {
          const supabase = createClient();
          const { error } = await supabase
            .from("tasks")
            .update({ status: "completed" })
            .eq("id", row.source_task_id);
          if (error) throw new Error(error.message);
        }
        await loadAll();
      } catch (e) {
        setItems(snapshot);
        toast.error(e instanceof Error ? e.message : "Could not complete row.");
        throw e;
      }
    },
    [items, patchItem, loadAll],
  );

  const restoreNewFromCompleted = useCallback(
    async (itemId: string) => {
      const row = items.find((i) => i.id === itemId);
      if (!row) return;
      const snapshot = items;
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? {
                ...i,
                tab: "new",
                result: "pending",
                fix: null,
                completed_at: null,
              }
            : i,
        ),
      );
      try {
        await patchItem(itemId, {
          tab: "new",
          result: "pending",
          fix: null,
          completed_at: null,
        });
        await loadAll();
      } catch (e) {
        setItems(snapshot);
        toast.error(e instanceof Error ? e.message : "Could not restore row.");
        throw e;
      }
    },
    [items, patchItem, loadAll],
  );

  const itemsForBatch = useCallback(
    (batchId: string) =>
      items
        .filter((i) => i.checklist_batch_id === batchId)
        .sort((a, b) => a.sort_order - b.sort_order),
    [items],
  );

  return {
    items,
    batches,
    loading,
    saveState,
    refresh: loadAll,
    itemsByTab,
    coreCanSubmit,
    completedCoreBatches,
    completedNewFeatureItems,
    addRow,
    updateItemLocal,
    submitCoreBatch,
    completeNewRow,
    restoreNewFromCompleted,
    itemsForBatch,
    patchItem,
    saveRowFields,
  };
}
