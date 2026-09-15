import { redirect } from "next/navigation";
import { getDashboardData } from "@/features/dashboard/api/get-dashboard";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import { getSessionForRender } from "@/lib/session/session";

export default async function DashboardPage() {
  const session = await getSessionForRender();
  if (!session) redirect("/login");

  const data = await getDashboardData(session.record.accessToken);
  return <DashboardView data={data} />;
}
