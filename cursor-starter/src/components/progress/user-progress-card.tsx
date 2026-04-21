"use client";

import type { ProjectMemberWithProfile } from "@/components/project/project-provider";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function UserProgressCard({
  member,
  selected,
  onSelect,
}: {
  member: ProjectMemberWithProfile;
  selected: boolean;
  onSelect: () => void;
}) {
  const name =
    member.profile?.full_name?.trim() || member.profile?.email || "Member";

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={cn(
        "flex cursor-pointer items-center gap-3 border p-4 shadow-sm transition-colors outline-none hover:bg-muted/40",
        selected && "ring-2 ring-primary/40",
      )}
    >
      <UserAvatar name={name} avatarUrl={member.profile?.avatar_url} />
      <div className="min-w-0">
        <p className="truncate font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">View task board</p>
      </div>
    </Card>
  );
}
