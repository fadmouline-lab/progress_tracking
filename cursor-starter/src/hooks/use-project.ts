"use client";

import {
  useProjectContext,
  useProjectSaveSlot,
} from "@/components/project/project-provider";

export function useProject() {
  return useProjectContext();
}

export { useProjectSaveSlot };
