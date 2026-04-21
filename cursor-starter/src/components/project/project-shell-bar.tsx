"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AutoSaveIndicator } from "@/components/shared/auto-save-indicator";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { useProject } from "@/hooks/use-project";

export function ProjectShellBar() {
  const { mergedSaveState } = useProject();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/home" className="flex items-center gap-1.5">
          <ArrowLeft className="size-4 shrink-0" />
          Home
        </Link>
      </Button>
      <div className="flex items-center gap-3">
        <AutoSaveIndicator state={mergedSaveState} />
        <ProfileMenu />
        <ThemeToggle />
      </div>
    </header>
  );
}
