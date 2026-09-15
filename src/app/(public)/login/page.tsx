import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-base leading-snug font-medium">Sign in</h1>
          </CardTitle>
          <CardDescription>Access your workshop.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <LoginForm />
          <p className="text-sm text-muted-foreground">
            No account yet?{" "}
            <Link href="/register" className="underline">
              Register
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
