import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArchiveClientButton } from "@/features/clients/components/archive-client-button";
import { getClient } from "@/features/clients/api/clients";
import { getSessionForRender } from "@/lib/session/session";

interface ClientPageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientPage({ params }: ClientPageProps) {
  const session = await getSessionForRender();
  if (!session) redirect("/login");

  const { id } = await params;
  const result = await getClient(session.record.accessToken, id);

  if (result.status === "error") {
    if (result.error.statusCode === 404) {
      redirect("/clients");
    }
    return (
      <div className="flex flex-col gap-6">
        <p role="alert" className="text-sm text-destructive">
          No se pudo cargar el cliente: {result.error.message}
        </p>
      </div>
    );
  }

  const client = result.client;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base leading-snug font-medium">{client.firstName} {client.lastName}</h1>
          <p className="text-sm text-muted-foreground">{client.phone}</p>
        </div>
        <ArchiveClientButton clientId={client.id} clientName={`${client.firstName} ${client.lastName}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalle del cliente</CardTitle>
          <CardDescription>Información de contacto y dirección</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{client.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Dirección</dt>
              <dd>{client.address}</dd>
            </div>
            {client.notes ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Notas</dt>
                <dd>{client.notes}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-muted-foreground">Creado</dt>
              <dd>{new Date(client.createdAt).toLocaleString("es-AR")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Actualizado</dt>
              <dd>{new Date(client.updatedAt).toLocaleString("es-AR")}</dd>
            </div>
            {client.archivedAt ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Archivado</dt>
                <dd className="text-destructive">{new Date(client.archivedAt).toLocaleString("es-AR")}</dd>
              </div>
            ) : null}
          </dl>

          <div className="flex gap-3 pt-2 border-t">
            <Link href={`/clients/${client.id}/edit`} className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted">
              Editar cliente
            </Link>
            <Link href="/clients" className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted">
              Volver a la lista
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}