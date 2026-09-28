import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-base leading-snug font-medium">Registrar tu taller</h1>
          </CardTitle>
          <CardDescription>Crea una cuenta para tu taller de reparación.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <RegisterForm />
          <p className="text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="underline">
              Iniciar sesión
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}