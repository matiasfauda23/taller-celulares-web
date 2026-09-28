import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

export default function WorkOrderDetailLoading() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <LoadingSkeleton className="h-8 w-1/3" />
      <LoadingSkeleton className="h-4 w-1/4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(8)].map((_, i) => (
          <LoadingSkeleton key={i} className="h-20" />
        ))}
      </div>
    </div>
  );
}