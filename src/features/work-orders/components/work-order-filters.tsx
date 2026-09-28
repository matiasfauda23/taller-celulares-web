import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { WorkOrderStatus } from "@/lib/api/types";

const STATUS_FILTERS: { value: WorkOrderStatus; label: string }[] = [
  { value: "RECEIVED", label: "Recibido" },
  { value: "DIAGNOSING", label: "Diagnosticando" },
  { value: "WAITING_PARTS", label: "Esperando repuestos" },
  { value: "REPAIRING", label: "Reparando" },
  { value: "READY", label: "Listo" },
  { value: "DELIVERED", label: "Entregado" },
  { value: "CANCELLED", label: "Cancelado" },
];

export interface WorkOrderFilterValues {
  status?: string;
  clientId?: string;
  deviceId?: string;
  from?: string;
  to?: string;
}

interface WorkOrderFiltersProps {
  values: WorkOrderFilterValues;
  clients: { id: string; firstName: string; lastName: string }[];
  devices: { id: string; brand: string; model: string }[];
}

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * GET form with native controls: filters live in the URL, so a filtered list is shareable, the
 * back button restores it, and it keeps working with JavaScript disabled. An empty option value
 * means "no filter" and is dropped by the page before reaching NestJS.
 */
export function WorkOrderFilters({ values, clients, devices }: WorkOrderFiltersProps) {
  return (
    <form method="GET" action="/work-orders" className="flex flex-col gap-4">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="filter-status">Estado</FieldLabel>
          <select id="filter-status" name="status" defaultValue={values.status ?? ""} className={selectClassName}>
            <option value="">Todos los estados</option>
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field>
          <FieldLabel htmlFor="filter-client">Cliente</FieldLabel>
          <select id="filter-client" name="clientId" defaultValue={values.clientId ?? ""} className={selectClassName}>
            <option value="">Todos los clientes</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.firstName} {client.lastName}
              </option>
            ))}
          </select>
        </Field>

        <Field>
          <FieldLabel htmlFor="filter-device">Dispositivo</FieldLabel>
          <select id="filter-device" name="deviceId" defaultValue={values.deviceId ?? ""} className={selectClassName}>
            <option value="">Todos los dispositivos</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.brand} {device.model}
              </option>
            ))}
          </select>
        </Field>

        <Field>
          <FieldLabel htmlFor="filter-from">Recibidas desde</FieldLabel>
          <Input id="filter-from" name="from" type="date" defaultValue={values.from ?? ""} />
        </Field>

        <Field>
          <FieldLabel htmlFor="filter-to">Recibidas hasta</FieldLabel>
          <Input id="filter-to" name="to" type="date" defaultValue={values.to ?? ""} />
        </Field>
      </FieldGroup>

      <div className="flex gap-3">
        <button type="submit" className={buttonVariants()}>
          Aplicar filtros
        </button>
        <Link href="/work-orders" className={cn(buttonVariants({ variant: "outline" }))}>
          Limpiar
        </Link>
      </div>
    </form>
  );
}
