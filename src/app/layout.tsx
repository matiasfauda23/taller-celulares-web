import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taller de Reparación de Celulares",
  description: "Gestión del taller de reparaciones",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
