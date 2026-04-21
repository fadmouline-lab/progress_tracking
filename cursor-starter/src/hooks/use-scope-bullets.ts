"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { ScopeBullet } from "@/types";
import type { SaveState } from "@/hooks/use-auto-save";

export function useScopeBullets(projectId: string) {
  const [bullets, setBullets] = useState<ScopeBullet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const reorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runWithSaveState = useCallback(async (fn: () => Promise<void>) => {
    setSaveState("saving");
    try {
      await fn();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1200);
    } catch (e) {
      setSaveState("error");
      toast.error(
        e instanceof Error ? e.message : "Could not save scope bullets.",
      );
    }
  }, []);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("scope_bullets")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    setBullets(data ?? []);
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("scope_bullets")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        setBullets([]);
      } else {
        setBullets(data ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const bulletsByUser = useMemo(() => {
    const map = new Map<string, ScopeBullet[]>();
    for (const b of bullets) {
      const list = map.get(b.user_id) ?? [];
      list.push(b);
      map.set(b.user_id, list);
    }
    return map;
  }, [bullets]);

  const addBullet = useCallback(
    async (userId: string) => {
      const supabase = createClient();
      const forUser = bullets.filter((b) => b.user_id === userId);
      const nextOrder =
        forUser.reduce((m, b) => Math.max(m, b.sort_order), -1) + 1;
      const tempId = `temp-${crypto.randomUUID()}`;
      const optimistic: ScopeBullet = {
        id: tempId,
        project_id: projectId,
        user_id: userId,
        content: "New scope item",
        sort_order: nextOrder,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setBullets((prev) => [...prev, optimistic]);
      setSaveState("saving");
      try {
        const { data, error } = await supabase
          .from("scope_bullets")
          .insert({
            project_id: projectId,
            user_id: userId,
            content: "New scope item",
            sort_order: nextOrder,
          })
          .select("*")
          .single();
        if (error) throw new Error(error.message);
        setBullets((prev) =>
          prev.map((b) => (b.id === tempId ? (data as ScopeBullet) : b)),
        );
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1200);
      } catch (e) {
        setBullets((prev) => prev.filter((b) => b.id !== tempId));
        setSaveState("error");
        toast.error(
          e instanceof Error ? e.message : "Could not add scope bullet.",
        );
      }
    },
    [bullets, projectId],
  );

  const removeBullet = useCallback(async (id: string) => {
    if (id.startsWith("temp-")) return;
    const prev = bullets;
    setBullets((p) => p.filter((b) => b.id !== id));
    setSaveState("saving");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("scope_bullets").delete().eq("id", id);
      if (error) throw new Error(error.message);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1200);
    } catch (e) {
      setBullets(prev);
      setSaveState("error");
      toast.error(
        e instanceof Error ? e.message : "Could not delete scope bullet.",
      );
    }
  }, [bullets]);

  const updateBulletContent = useCallback((id: string, content: string) => {
    setBullets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, content } : b)),
    );
  }, []);

  const persistBulletContent = useCallback(async (id: string, content: string) => {
    if (id.startsWith("temp-")) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("scope_bullets")
      .update({ content })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }, []);

  const scheduleReorderPersist = useCallback(
    (ordered: ScopeBullet[]) => {
      if (reorderTimer.current) clearTimeout(reorderTimer.current);
      reorderTimer.current = setTimeout(() => {
        void (async () => {
          await runWithSaveState(async () => {
            const supabase = createClient();
            for (let i = 0; i < ordered.length; i++) {
              const b = ordered[i];
              const { error } = await supabase
                .from("scope_bullets")
                .update({ sort_order: i })
                .eq("id", b.id);
              if (error) throw new Error(error.message);
            }
          });
        })();
      }, 500);
    },
    [runWithSaveState],
  );

  const reorderBulletsForUser = useCallback(
    (userId: string, nextOrdered: ScopeBullet[]) => {
      const normalized = nextOrdered.map((b, i) => ({
        ...b,
        sort_order: i,
      }));
      setBullets((prev) => {
        const others = prev.filter((b) => b.user_id !== userId);
        return [...others, ...normalized];
      });
      scheduleReorderPersist(normalized);
    },
    [scheduleReorderPersist],
  );

  useEffect(() => {
    return () => {
      if (reorderTimer.current) clearTimeout(reorderTimer.current);
    };
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let t: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        t = null;
        void refresh();
      }, 200);
    };
    const channel = supabase
      .channel(`scope-bullets-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scope_bullets",
          filter: `project_id=eq.${projectId}`,
        },
        () => schedule(),
      )
      .subscribe();
    return () => {
      if (t) clearTimeout(t);
      void supabase.removeChannel(channel);
    };
  }, [projectId, refresh]);

  return {
    bullets,
    bulletsByUser,
    loading,
    saveState,
    refresh,
    addBullet,
    removeBullet,
    updateBulletContent,
    persistBulletContent,
    reorderBulletsForUser,
  };
}
