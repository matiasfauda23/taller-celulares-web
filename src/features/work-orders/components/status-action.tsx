"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  { value: "RECEIVED", label: "Recibido" },
  { value: "DIAGNOSING", label: "Diagnosticando" },
  { value: "WAITING_PARTS", label: "Esperando repuestos" },
  { value: "REPAIRING", label: "Reparando" },
  { value: "READY", label: "Listo" },
  { value: "DELIVERED", label: "Entregado" },
  { value: "CANCELLED", label: "Cancelado" },
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
          No hay transiciones disponibles (estado final)
        </span>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Select value={status} onValueChange={handleChange} disabled={pending}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Seleccionar estado" />
        </SelectTrigger>
        <SelectContent>
          {/* The current status has to exist as an item, otherwise the trigger has no matching item
              to render and the control reads as empty. It is disabled because it is not a
              transition, and `allowedStatuses` never includes it, so there is no duplicate. */}
          <SelectItem value={currentStatus} disabled>
            {STATUS_OPTIONS.find((opt) => opt.value === currentStatus)?.label ?? currentStatus}
          </SelectItem>
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