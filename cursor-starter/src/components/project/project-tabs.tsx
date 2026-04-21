"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, Columns2, ListTodo } from "lucide-react";
import { useProjectContext } from "@/components/project/project-provider";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "scope", label: "Scope", icon: ListTodo },
  { href: "progress", label: "Progress", icon: Columns2 },
  { href: "test-checklist", label: "Test Checklist", icon: ClipboardCheck },
] as const;

export function ProjectTabs() {
  const pathname = usePathname();
  const { projectId } = useProjectContext();

  return (
    <nav className="flex gap-1 border-b bg-muted/30 px-4">
      {tabs.map((tab) => {
        const href = `/project/${projectId}/${tab.href}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={tab.href}
            href={href}
            className={cn(
              "relative -mb-px flex items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <tab.icon className="size-4 shrink-0" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
