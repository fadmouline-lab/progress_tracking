"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, Columns2, ListTodo } from "lucide-react";
import { useProjectContext } from "@/components/project/project-provider";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "progress", label: "Progress", icon: Columns2 },
  { href: "test-checklist", label: "Test Checklist", icon: ClipboardCheck },
  { href: "scope", label: "Scope", icon: ListTodo },
] as const;

export function ProjectTabs() {
  const pathname = usePathname();
  const { projectId } = useProjectContext();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b bg-muted/30 px-4 scrollbar-hide">
      {tabs.map((tab) => {
        const href = `/project/${projectId}/${tab.href}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={tab.href}
            href={href}
            className={cn(
              "relative -mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors md:px-4 md:py-3",
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
