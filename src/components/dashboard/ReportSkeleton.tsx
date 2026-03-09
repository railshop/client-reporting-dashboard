import { Skeleton } from '@/components/ui/skeleton';

export function ReportSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hero band skeleton */}
      <div className="rounded-2xl border border-border-v1 bg-surface p-6 sm:p-8 space-y-4">
        <Skeleton className="h-3 w-2/5 max-w-[180px] bg-surface-2" />
        <Skeleton className="h-6 w-4/5 max-w-[360px] bg-surface-2" />
        <Skeleton className="h-4 w-full max-w-[500px] bg-surface-2" />
        <Skeleton className="h-4 w-3/4 max-w-[400px] bg-surface-2" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-3/5 bg-surface-2" />
              <Skeleton className="h-7 w-4/5 bg-surface-2" />
            </div>
          ))}
        </div>
      </div>

      {/* Platform cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border-v1 bg-surface p-5 space-y-3">
            <Skeleton className="h-4 w-2/5 bg-surface-2" />
            <Skeleton className="h-3 w-full bg-surface-2" />
            <Skeleton className="h-3 w-3/4 bg-surface-2" />
            <Skeleton className="h-3 w-1/2 bg-surface-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
