"use client";

import type { ReactNode } from "react";
import { TEST_CHECKLIST_SUBTABS } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
        {TEST_CHECKLIST_SUBTABS.map((t) => (
          <TabsTrigger key={t.id} value={t.id} className="text-sm">
            {t.label}
          </TabsTrigger>
        ))}
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
