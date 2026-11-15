import { redirect } from "next/navigation";
import { getCurrentUser, homeForRole } from "@/server/session";

/** Role-aware landing after sign-in / email verification. */
export default async function DashboardRedirect() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(homeForRole(user.role));
}
