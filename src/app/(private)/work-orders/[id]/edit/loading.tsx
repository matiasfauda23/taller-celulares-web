import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

export default function WorkOrderEditLoading() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <LoadingSkeleton className="h-8 w-1/4" />
      <div className="space-y-4">
        {[...Array(8)].map((_, i) => (
          <LoadingSkeleton key={i} className="h-12" />
        ))}
      </div>
    </div>
  );
}