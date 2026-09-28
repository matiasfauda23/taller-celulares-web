import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData, DashboardMetric, RecentOrders } from "@/features/dashboard/api/get-dashboard";
import type { WorkOrder } from "@/lib/api/types";

const QUICK_LINKS = [
  { href: "/clients", label: "Ver clientes" },
  { href: "/devices", label: "Ver dispositivos" },
  { href: "/work-orders", label: "Ver órdenes de trabajo" },
  { href: "/work-orders/new", label: "Nueva orden" },
] as const;

const METRICS: Array<{
  key: "activeClients" | "activeDevices" | "totalWorkOrders" | "readyWorkOrders";
  label: string;
}> = [
  { key: "activeClients", label: "Clientes activos" },
  { key: "activeDevices", label: "Dispositivos activos" },
  { key: "totalWorkOrders", label: "Órdenes de trabajo" },
  { key: "readyWorkOrders", label: "Listos para retirar" },
];

function MetricCard({ label, metric }: { label: string; metric: DashboardMetric }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        {metric.status === "ok" ? (
          <p className="text-2xl font-semibold">{metric.total}</p>
        ) : (
          <p role="alert" className="text-sm text-destructive">
            No se pudo cargar esta métrica.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function formatReceivedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function RecentOrdersSection({ recentOrders }: { recentOrders: RecentOrders }) {
  if (recentOrders.status === "error") {
    return (
      <p role="alert" className="text-sm text-destructive">
        No se pudieron cargar las órdenes recientes.
      </p>
    );
  }

  if (recentOrders.data.length === 0) {
    return <p className="text-sm text-muted-foreground">Aún no hay órdenes de trabajo.</p>;
  }

  return (
    <ul className="flex flex-col divide-y">
      {recentOrders.data.map((order: WorkOrder) => (
        <li key={order.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-sm">
          <span className="font-medium">{order.number}</span>
          <span className="text-muted-foreground">{order.status}</span>
          <span className="text-muted-foreground">{formatReceivedAt(order.receivedAt)}</span>
        </li>
      ))}
    </ul>
  );
}

export function DashboardView({ data }: { data: DashboardData }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-base leading-snug font-medium">Panel</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {METRICS.map(({ key, label }) => (
          <MetricCard key={key} label={label} metric={data[key]} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <p className="text-sm font-medium">Órdenes por fecha de recepción</p>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RecentOrdersSection recentOrders={data.recentOrders} />
        </CardContent>
      </Card>

      <nav aria-label="Enlaces rápidos" className="flex flex-wrap gap-3">
        {QUICK_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted">
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
