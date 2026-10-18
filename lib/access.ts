/**
 * Neura's access model, in one place.
 *
 *   public      landing page, invite page               anyone
 *   auth        /login, /signup                          signed-out visitors (signed-in users are sent on)
 *   onboarding  /onboarding                              signed in, no patient profile yet
 *   app         dashboard and every care feature          signed in AND has a patient profile
 *
 * "Onboarding complete" means the caregiver is linked to a saved patient record
 * (patients.caregiverIds contains their id). That record is only written after
 * the onboarding form validates on the server, so a failed or partial save can
 * never mark onboarding as done, and the state survives refreshes, new tabs and
 * new sessions because it lives in the database rather than the browser.
 *
 * This module is pure (no Next.js imports) so the rules are unit-tested; the
 * server guard in lib/guard.ts applies them on every request.
 */

export type Area = "auth" | "onboarding" | "app";
export type AccessState = { signedIn: boolean; hasPatient: boolean };

/** Where to send the visitor instead, or null if they may stay. */
export function accessRedirect(area: Area, state: AccessState, path: string): string | null {
  if (area === "auth") {
    if (!state.signedIn) return null;
    return state.hasPatient ? "/dashboard" : "/onboarding";
  }
  if (!state.signedIn) return `/login?next=${encodeURIComponent(path)}`;
  if (area === "onboarding") return state.hasPatient ? "/dashboard" : null;
  return state.hasPatient ? null : "/onboarding";
}

/**
 * A post-login destination taken from `?next=`. Only same-site paths are
 * accepted, so the parameter can't be used to bounce users to another site.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  if (next.startsWith("/login") || next.startsWith("/signup")) return null;
  return next;
}
