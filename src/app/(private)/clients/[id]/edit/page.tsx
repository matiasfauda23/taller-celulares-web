import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { ClientForm } from "@/features/clients/components/client-form";
import { getClient } from "@/features/clients/api/clients";
import { getSessionForRender } from "@/lib/session/session";

interface EditClientPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditClientPage({ params }: EditClientPageProps) {
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
          Could not load client: {result.error.message}
        </p>
      </div>
    );
  }

  const client = result.client;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-base leading-snug font-medium">Edit client</h1>
      <Card>
        <CardContent className="pt-4">
          <ClientForm mode="edit" clientId={client.id} defaultValues={{
            firstName: client.firstName,
            lastName: client.lastName,
            phone: client.phone,
            email: client.email ?? "",
            address: client.address,
            notes: client.notes ?? "",
          }} />
        </CardContent>
      </Card>
    </div>
  );
}