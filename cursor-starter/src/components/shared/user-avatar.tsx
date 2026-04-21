import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  avatarUrl,
  className,
  size = "md",
}: {
  name: string | null | undefined;
  avatarUrl?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const label = name?.trim() || "User";
  const initials = label
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const sizeClass =
    size === "sm" ? "size-8 text-xs" : size === "lg" ? "size-12 text-base" : "size-10 text-sm";

  return (
    <Avatar className={cn(sizeClass, className)}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}
