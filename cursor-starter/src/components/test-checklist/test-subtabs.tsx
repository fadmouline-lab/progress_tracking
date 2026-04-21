"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Archive, CheckCircle2, Sparkles } from "lucide-react";
import { TEST_CHECKLIST_SUBTABS } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SUBTAB_ICONS: Record<string, LucideIcon> = {
  new: Sparkles,
  core: Archive,
  completed: CheckCircle2,
};

export function TestSubtabs({
  value,
  onValueChange,
  children,
}: {
  value: "core" | "new" | "completed";
  onValueChange: (v: "core" | "new" | "completed") => void;
  children: {
    core: ReactNode;
    new: ReactNode;
    completed: ReactNode;
  };
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onValueChange(v as typeof value)}
      className="space-y-6"
    >
      <TabsList className="grid w-full max-w-2xl grid-cols-3">
        {TEST_CHECKLIST_SUBTABS.map((t) => {
          const Icon = SUBTAB_ICONS[t.id];
          return (
            <TabsTrigger key={t.id} value={t.id} className="flex items-center gap-1.5 text-sm">
              {Icon && <Icon className="size-3.5 shrink-0" />}
              {t.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
      <TabsContent value="core" className="mt-0">
        {children.core}
      </TabsContent>
      <TabsContent value="new" className="mt-0">
        {children.new}
      </TabsContent>
      <TabsContent value="completed" className="mt-0">
        {children.completed}
      </TabsContent>
    </Tabs>
  );
}
