import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-3 md:p-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <div className="grid gap-4 md:grid-cols-[4fr_2fr_2fr_2fr]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-lg border">
            <Skeleton className="h-10 rounded-none border-b" />
            <div className="space-y-px p-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              {i === 0 && <Skeleton className="h-16" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
