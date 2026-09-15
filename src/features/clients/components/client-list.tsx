import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArchiveClientButton } from "@/features/clients/components/archive-client-button";
import type { Client, Page } from "@/lib/api/types";

interface ClientListProps {
  page: Page<Client>;
}

export function ClientList({ page }: ClientListProps) {
  const { data, meta } = page;

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No active clients yet.</p>;
  }

  const hasPrev = meta.page > 1;
  const hasNext = meta.page * meta.limit < meta.total;

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {data.map((client) => (
          <li key={client.id}>
            <Card>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link href={`/clients/${client.id}`} className="font-medium hover:underline">
                    {client.firstName} {client.lastName}
                  </Link>
                  <p className="text-sm text-muted-foreground">{client.phone}</p>
                </div>
                <ArchiveClientButton clientId={client.id} clientName={`${client.firstName} ${client.lastName}`} />
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Page {meta.page} of {Math.max(1, Math.ceil(meta.total / meta.limit))} ({meta.total} total)
        </span>
        <div className="flex gap-2">
          {hasPrev ? (
            <Link href={`/clients?page=${meta.page - 1}`} className="rounded-lg border border-input px-3 py-1.5 hover:bg-muted">
              Previous
            </Link>
          ) : (
            <span className="rounded-lg border border-input px-3 py-1.5 text-muted-foreground opacity-50">Previous</span>
          )}
          {hasNext ? (
            <Link href={`/clients?page=${meta.page + 1}`} className="rounded-lg border border-input px-3 py-1.5 hover:bg-muted">
              Next
            </Link>
          ) : (
            <span className="rounded-lg border border-input px-3 py-1.5 text-muted-foreground opacity-50">Next</span>
          )}
        </div>
      </nav>
    </div>
  );
}
