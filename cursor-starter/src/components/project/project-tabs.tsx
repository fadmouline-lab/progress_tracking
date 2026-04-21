"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProjectContext } from "@/components/project/project-provider";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "scope", label: "Scope" },
  { href: "progress", label: "Progress" },
  { href: "test-checklist", label: "Test Checklist" },
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
              "relative -mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
