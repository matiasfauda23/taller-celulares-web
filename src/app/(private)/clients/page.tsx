import Link from "next/link";
import { redirect } from "next/navigation";
import { listClients } from "@/features/clients/api/clients";
import { ClientList } from "@/features/clients/components/client-list";
import { getSessionForRender } from "@/lib/session/session";

interface ClientsPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const session = await getSessionForRender();
  if (!session) redirect("/login");

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const result = await listClients(session.record.accessToken, { page });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-base leading-snug font-medium">Clientes</h1>
        <Link href="/clients/new" className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted">
          Nuevo cliente
        </Link>
      </div>

      {result.status === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          No se pudieron cargar los clientes: {result.error.message}
        </p>
      ) : (
        <ClientList page={result.page} />
      )}
    </div>
  );
}
