/**
 * Stale-token guard (SPEC-039 5.9).
 *
 * The $axios request interceptor already refreshes an expired access token
 * before sending, but on app boot the first batch of user-data fetches would
 * otherwise fire with the stale token. This plugin runs right after
 * $auth.init() (registered via auth.plugins) and refreshes proactively:
 *
 *  - access token expired + refresh token valid → refresh before first render
 *  - refresh token also expired                → clean logout + toast
 *
 * JWT staleness is detected via $auth.check(true), which compares the stored
 * token expirations (derived from the JWT exp at login).
 */
import { wipeLocalUserData } from "../lib/logout-wipe";

export default function ({ app }) {
  if (!process.client) return;
  const auth = app.$auth;
  if (!auth) return;

  const clearDeadSession = async () => {
    // SPEC-062 — a dead session is still a logout: wipe local user data.
    wipeLocalUserData();
    try {
      await auth.logout();
    } catch (e) {
      // Best-effort; local auth state is reset below regardless.
    }
    if (app.$toast) {
      app.$toast.error(
        "Your session has expired. Please log in again.",
        { duration: 5000 }
      );
    }
  };

  const { tokenExpired, refreshTokenExpired } = auth.check(true);
  if (refreshTokenExpired) {
    return clearDeadSession();
  }
  if (tokenExpired) {
    return auth.refreshTokens().catch(() => clearDeadSession());
  }
}
