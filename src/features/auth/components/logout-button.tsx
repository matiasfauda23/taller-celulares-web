"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      await fetch("/api/session/logout", { method: "POST", credentials: "include" });
    } finally {
      await router.push("/login");
    }
  }

  return (
    <Button type="button" variant="outline" onClick={handleLogout} disabled={pending}>
      {pending ? "Cerrando sesión..." : "Cerrar sesión"}
    </Button>
  );
}
