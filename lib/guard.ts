import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { findPatientForUser, getCollections } from "@/lib/db";
import { accessRedirect, type Area } from "@/lib/access";

/**
 * Server-side route guard, called from each protected route's layout. It runs
 * on every request (including refreshes and directly typed URLs) before any
 * page code reaches the browser. The API routes still check the session
 * themselves; this guard decides where a person belongs, it doesn't replace
 * server-side authorization.
 */
export async function guard(area: Area, path: string) {
  const user = await getCurrentUser();
  const hasPatient = user ? Boolean(await findPatientForUser(await getCollections(), user.id)) : false;
  const target = accessRedirect(area, { signedIn: Boolean(user), hasPatient }, path);
  if (target) redirect(target);
}
