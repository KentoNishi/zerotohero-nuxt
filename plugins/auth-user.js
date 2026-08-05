/**
 * Self-heal $auth.user name fields on session restore.
 *
 * Flask's login response now returns both camelCase (firstName/lastName) and
 * snake_case (first_name/last_name) name fields, but sessions restored from
 * browser storage may predate that change — leaving the profile page showing
 * "undefined undefined" and the top-bar/cogwheel menus falling back to
 * "Login" (they gate on $auth.user.first_name existing).
 *
 * The Supabase access token always carries user_metadata with the names, so
 * decode it and fill in any missing fields. No-op for fresh logins that
 * already have both spellings.
 */
const decodePayload = (token) => {
  const parts = String(token || "").replace(/^Bearer\s+/i, "").split(".");
  if (parts.length < 2) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof Buffer !== "undefined"
        ? Buffer.from(b64, "base64").toString("utf8")
        : decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
};

export default function ({ app }) {
  const auth = app.$auth;
  if (!auth) return;
  const user = auth.user;
  if (!auth.loggedIn || !user) return;
  const payload = decodePayload(auth.strategy.token.get());
  const meta = (payload && payload.user_metadata) || {};
  if (meta.first_name === undefined && meta.last_name === undefined) return;

  const firstName = meta.first_name || "";
  const lastName = meta.last_name || "";
  let changed = false;
  const patched = { ...user };
  for (const [key, value] of [
    ["first_name", firstName],
    ["last_name", lastName],
    ["firstName", firstName],
    ["lastName", lastName],
  ]) {
    if (patched[key] === undefined || patched[key] === null) {
      patched[key] = value;
      changed = true;
    }
  }
  if (changed) auth.setUser(patched);
}
