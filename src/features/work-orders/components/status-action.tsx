"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateWorkOrderStatus } from "@/features/work-orders/api/work-order-actions";
import type { WorkOrderStatus } from "@/lib/api/types";

const STATUS_OPTIONS: { value: WorkOrderStatus; label: string }[] = [
  { value: "RECEIVED", label: "Received" },
  { value: "DIAGNOSING", label: "Diagnosing" },
  { value: "WAITING_PARTS", label: "Waiting parts" },
  { value: "REPAIRING", label: "Repairing" },
  { value: "READY", label: "Ready" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

const TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  RECEIVED: ["DIAGNOSING", "CANCELLED"],
  DIAGNOSING: ["WAITING_PARTS", "REPAIRING", "CANCELLED"],
  WAITING_PARTS: ["REPAIRING", "CANCELLED"],
  REPAIRING: ["WAITING_PARTS", "READY", "CANCELLED"],
  READY: ["DELIVERED", "REPAIRING"],
  DELIVERED: [],
  CANCELLED: [],
};

interface StatusActionProps {
  workOrderId: string;
  currentStatus: WorkOrderStatus;
}

export function StatusAction({ workOrderId, currentStatus }: StatusActionProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowedStatuses = TRANSITIONS[currentStatus];

  async function handleChange(newStatus: WorkOrderStatus) {
    if (!allowedStatuses.includes(newStatus)) return;

    setPending(true);
    setError(null);

    const result = await updateWorkOrderStatus(workOrderId, { status: newStatus });

    if (result.status === "error") {
      setError(result.error.message);
      setStatus(currentStatus);
    } else {
      setStatus(newStatus);
      router.refresh();
    }

    setPending(false);
  }

  if (allowedStatuses.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">
        No transitions available (final state)
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Select value={status} onValueChange={handleChange} disabled={pending}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent>
          {allowedStatuses.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_OPTIONS.find((opt) => opt.value === s)?.label ?? s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}