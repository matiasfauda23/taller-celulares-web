import { redirect } from "next/navigation";
import { getSessionForRender } from "@/lib/session/session";

export default async function Home() {
  const session = await getSessionForRender();
  redirect(session ? "/dashboard" : "/login");
}