import { cookies } from "next/headers";
import DashboardApp from "@/components/DashboardApp";
import { dashboardPasswordConfigured, sessionCookieName, verifySessionCookieValue } from "@/lib/session";

export default async function Home() {
  const cookieStore = await cookies();
  const isAuthed = verifySessionCookieValue(cookieStore.get(sessionCookieName())?.value);

  return <DashboardApp initialAuthed={isAuthed} passwordEnabled={dashboardPasswordConfigured()} />;
}
