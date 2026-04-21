import { PRIORITIES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PriorityBadge({
  priority,
  className,
}: {
  priority: number;
  className?: string;
}) {
  const meta = PRIORITIES.find((p) => p.value === priority) ?? PRIORITIES[2];
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-transparent font-medium",
        meta.bgClass,
        priority === 3 ? "text-black" : "text-white",
        className,
      )}
    >
      {meta.label}
    </Badge>
  );
}
