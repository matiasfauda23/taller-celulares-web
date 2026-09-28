import { TableSkeleton } from "@/components/shared/loading-skeleton";

export default function WorkOrdersLoading() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
        <div className="h-10 bg-muted rounded w-32 animate-pulse" />
      </div>
      <TableSkeleton rows={5} columns={5} />
    </div>
  );
}