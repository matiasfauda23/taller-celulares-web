import { redirect } from "next/navigation";
import { callNestApi } from "@/lib/api/nest-client";
import type { MeResponse } from "@/lib/api/types";
import { getSessionForRender } from "@/lib/session/session";
import { PrivateLayoutClient } from "@/components/layout/PrivateLayoutClient";

export const dynamic = "force-dynamic";

export default async function PrivateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
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
    <PrivateLayoutClient profile={profile}>
      {children}
    </PrivateLayoutClient>
  );
}