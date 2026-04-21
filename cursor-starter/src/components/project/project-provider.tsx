"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Project } from "@/types";
import type { SaveState } from "@/hooks/use-auto-save";
import { mergeSaveStates } from "@/components/shared/auto-save-indicator";

export type ProjectMemberWithProfile = {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile: Pick<
    Profile,
    "id" | "email" | "full_name" | "avatar_url"
  > | null;
};

type ProjectContextValue = {
  projectId: string;
  project: Project | null;
  members: ProjectMemberWithProfile[];
  loading: boolean;
  refresh: () => Promise<void>;
  mergedSaveState: SaveState;
  registerProjectSaveState: (slotId: string, state: SaveState) => void;
};

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveSlotMap, setSaveSlotMap] = useState<Record<string, SaveState>>({});

  const registerProjectSaveState = useCallback((slotId: string, state: SaveState) => {
    setSaveSlotMap((prev) => {
      if (prev[slotId] === state) return prev;
      return { ...prev, [slotId]: state };
    });
  }, []);

  const mergedSaveState = useMemo(() => {
    const active = Object.values(saveSlotMap).filter((s) => s !== "idle");
    if (active.length === 0) return "idle" as SaveState;
    return mergeSaveStates(...active);
  }, [saveSlotMap]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: proj } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();
      setProject(proj);

      const { data: memberRows } = await supabase
        .from("project_members")
        .select("id, project_id, user_id, role, created_at")
        .eq("project_id", projectId);

      const userIds = [...new Set((memberRows ?? []).map((m) => m.user_id))];
      let profileById: Record<
        string,
        Pick<Profile, "id" | "email" | "full_name" | "avatar_url">
      > = {};

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email, full_name, avatar_url")
          .in("id", userIds);
        profileById = Object.fromEntries(
          (profiles ?? []).map((p) => [p.id, p]),
        );
      }

      setMembers(
        (memberRows ?? []).map((m) => ({
          ...m,
          profile: profileById[m.user_id] ?? null,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      projectId,
      project,
      members,
      loading,
      refresh,
      mergedSaveState,
      registerProjectSaveState,
    }),
    [
      projectId,
      project,
      members,
      loading,
      refresh,
      mergedSaveState,
      registerProjectSaveState,
    ],
  );

  return (
    <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useProjectContext must be used within ProjectProvider");
  }
  return ctx;
}

export function useProjectSaveSlot(slotId: string, state: SaveState) {
  const { registerProjectSaveState } = useProjectContext();
  useEffect(() => {
    registerProjectSaveState(slotId, state);
    return () => registerProjectSaveState(slotId, "idle");
  }, [slotId, state, registerProjectSaveState]);
}
