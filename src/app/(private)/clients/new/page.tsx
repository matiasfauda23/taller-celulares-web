import { Card, CardContent } from "@/components/ui/card";
import { ClientForm } from "@/features/clients/components/client-form";

export default function NewClientPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-base leading-snug font-medium">New client</h1>
      <Card>
        <CardContent className="pt-4">
          <ClientForm mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}
