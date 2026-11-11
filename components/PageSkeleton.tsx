export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-surface-2" />
      <div className="h-32 animate-pulse rounded-2xl bg-surface-2" />
      <div className="h-20 animate-pulse rounded-2xl bg-surface-2" />
    </div>
  );
}
