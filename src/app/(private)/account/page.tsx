import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountPage() {
  return (
    <main className="flex-1">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-base leading-snug font-medium">Session active</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You are signed in. Client, device and work-order management arrive in later phases.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
