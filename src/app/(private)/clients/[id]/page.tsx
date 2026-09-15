import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getClient } from "@/features/clients/api/clients";
import { ArchiveClientButton } from "@/features/clients/components/archive-client-button";
import { getSessionForRender } from "@/lib/session/session";

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const session = await getSessionForRender();
  if (!session) redirect("/login");

  const { id } = await params;
  const result = await getClient(session.record.accessToken, id);

  if (result.status === "error") {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/clients" className="text-sm hover:underline">
          ← Back to clients
        </Link>
        <p role="alert" className="text-sm text-destructive">
          {result.error.statusCode === 404 ? "Client not found." : `Could not load this client: ${result.error.message}`}
        </p>
      </div>
    );
  }

  const client = result.client;
  const isArchived = Boolean(client.archivedAt);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/clients" className="text-sm hover:underline">
        ← Back to clients
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-base leading-snug font-medium">
              {client.firstName} {client.lastName}
            </h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {isArchived ? <p className="text-muted-foreground">Archived</p> : null}
          <p>
            <span className="text-muted-foreground">Phone: </span>
            {client.phone}
          </p>
          {client.email ? (
            <p>
              <span className="text-muted-foreground">Email: </span>
              {client.email}
            </p>
          ) : null}
          <p>
            <span className="text-muted-foreground">Address: </span>
            {client.address}
          </p>
          {client.notes ? (
            <p>
              <span className="text-muted-foreground">Notes: </span>
              {client.notes}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {!isArchived ? (
        <div className="flex flex-wrap items-center gap-3">
          <Link href={`/clients/${client.id}/edit`} className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted">
            Edit
          </Link>
          <ArchiveClientButton clientId={client.id} clientName={`${client.firstName} ${client.lastName}`} />
        </div>
      ) : null}
    </div>
  );
}
