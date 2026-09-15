import { redirect } from "next/navigation";
import { callNestApi } from "@/lib/api/nest-client";
import type { MeResponse } from "@/lib/api/types";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { getSessionForRender } from "@/lib/session/session";

// Every response here is per-user (session cookie, Bearer-authenticated NestJS reads); never
// attempt to prerender or statically cache this subtree.
export const dynamic = "force-dynamic";

export default async function PrivateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Read-only: Next.js forbids writing cookies during a render, so this never ends a session
  // itself (see getSessionForRender's docs). An actual BFF operation enforces and ends an
  // invalid session from its own Route Handler.
  const session = await getSessionForRender();
  if (!session) redirect("/login");

  let profile: MeResponse | null = null;
  try {
    const upstream = await callNestApi<MeResponse>({
      method: "GET",
      path: "/auth/me",
      accessToken: session.record.accessToken,
    });
    if (upstream.status === 200) profile = upstream.body;
  } catch {
    profile = null;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col p-4 sm:p-8">
      <header className="mb-6 flex items-center justify-between gap-4 border-b pb-4">
        <div>
          <p className="text-sm font-medium">{profile?.workshop.name ?? "Workshop"}</p>
          <p className="text-xs text-muted-foreground">{profile?.account.ownerName ?? ""}</p>
        </div>
        <LogoutButton />
      </header>
      {children}
    </div>
  );
}
