import { TableSkeleton } from "@/components/shared/loading-skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
      <TableSkeleton rows={4} columns={4} />
    </div>
  );
}