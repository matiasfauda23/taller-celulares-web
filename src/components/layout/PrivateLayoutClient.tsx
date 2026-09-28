"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Panel", icon: null },
  { href: "/clients", label: "Clientes", icon: null },
  { href: "/devices", label: "Dispositivos", icon: null },
  { href: "/work-orders", label: "Órdenes", icon: null },
] as const;

export function PrivateLayoutClient({ children, profile }: { children: React.ReactNode; profile: { workshop: { name: string }; account: { ownerName: string } } | null }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col p-4 sm:p-6">
      {/* Header - Mobile */}
      <header className="mb-6 flex items-center justify-between gap-4 border-b pb-4 sm:hidden">
        <Link href="/dashboard" className="block flex-1">
          <p className="text-sm font-medium truncate">{profile?.workshop.name ?? "Taller"}</p>
          <p className="text-xs text-muted-foreground truncate">{profile?.account.ownerName ?? ""}</p>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      {/* Mobile Menu Sheet */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-background shadow-xl p-4 flex flex-col">
            <div className="mb-4 pb-4 border-b flex items-center justify-between">
              <div>
                <p className="font-medium">{profile?.workshop.name ?? "Taller"}</p>
                <p className="text-sm text-muted-foreground">{profile?.account.ownerName ?? ""}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex flex-col gap-1 flex-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    pathname === item.href || pathname.startsWith(item.href + "/")
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <LogoutButtonMobile onClick={() => setMobileMenuOpen(false)} />
            </nav>
          </div>
        </div>
      )}

      {/* Header + Sidebar - Desktop */}
      <div className="flex flex-col gap-6 sm:flex-row">
        <aside className="hidden w-56 flex-shrink-0 sm:block">
          <Link href="/dashboard" className="block mb-6">
            <p className="text-sm font-medium">{profile?.workshop.name ?? "Taller"}</p>
            <p className="text-xs text-muted-foreground">{profile?.account.ownerName ?? ""}</p>
          </Link>
          <nav className="flex flex-col gap-1" aria-label="Navegación principal">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === item.href || pathname.startsWith(item.href + "/")
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
            <LogoutButtonDesktop className="mt-auto" />
          </nav>
        </aside>
        <main className="flex-1 min-w-0">
          <header className="mb-6 border-b pb-4 sm:hidden">
            {/* Empty on desktop - nav is in sidebar */}
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}

function LogoutButtonMobile({ onClick }: { onClick?: () => void }) {
  const router = useRouter();

  return (
    <form
      action="/api/session/logout"
      onSubmit={async (e) => {
        e.preventDefault();
        onClick?.();
        // Awaited: navigating before the BFF confirms the teardown leaves the session
        // alive, so the next protected navigation would still render as signed in.
        await fetch("/api/session/logout", { method: "POST", credentials: "include" });
        router.push("/login");
      }}
    >
      <button type="submit" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
        Cerrar sesión
      </button>
    </form>
  );
}

function LogoutButtonDesktop({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <form
      action="/api/session/logout"
      className={className}
      onSubmit={async (e) => {
        e.preventDefault();
        // Awaited: navigating before the BFF confirms the teardown leaves the session
        // alive, so the next protected navigation would still render as signed in.
        await fetch("/api/session/logout", { method: "POST", credentials: "include" });
        router.push("/login");
      }}
    >
      <button type="submit" className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
        Cerrar sesión
      </button>
    </form>
  );
}