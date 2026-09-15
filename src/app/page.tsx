import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl items-center p-4 sm:p-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            <h1 className="text-base leading-snug font-medium">Mobile Repair Shop</h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Frontend foundation is ready.</p>
          <Button type="button" disabled>Authentication is not set up yet</Button>
        </CardContent>
      </Card>
    </main>
  );
}
