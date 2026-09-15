import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardData, DashboardMetric, RecentOrders } from "@/features/dashboard/api/get-dashboard";
import type { WorkOrder } from "@/lib/api/types";

const QUICK_LINKS = [
  { href: "/clients", label: "View clients" },
  { href: "/devices", label: "View devices" },
  { href: "/work-orders", label: "View work orders" },
  { href: "/work-orders/new", label: "New work order" },
] as const;

const METRICS: Array<{
  key: "activeClients" | "activeDevices" | "totalWorkOrders" | "readyWorkOrders";
  label: string;
}> = [
  { key: "activeClients", label: "Active clients" },
  { key: "activeDevices", label: "Active devices" },
  { key: "totalWorkOrders", label: "Work orders" },
  { key: "readyWorkOrders", label: "Ready for pickup" },
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
            Could not load this metric.
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
        Could not load recent orders.
      </p>
    );
  }

  if (recentOrders.data.length === 0) {
    return <p className="text-sm text-muted-foreground">No work orders yet.</p>;
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
      <h1 className="text-base leading-snug font-medium">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {METRICS.map(({ key, label }) => (
          <MetricCard key={key} label={label} metric={data[key]} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <p className="text-sm font-medium">Orders by reception date</p>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RecentOrdersSection recentOrders={data.recentOrders} />
        </CardContent>
      </Card>

      <nav aria-label="Quick links" className="flex flex-wrap gap-3">
        {QUICK_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted">
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
