// Capture + persist the ?ref=<uuid> query param across the OAuth round-trip.
//
// Uses localStorage (NOT sessionStorage) because in-app browsers like WhatsApp,
// Twitter, and Instagram lose session context when the user is bounced out to
// the system browser for Google OAuth — localStorage survives that hop.

const KEY = "pending_referrer";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Read `?ref=<uuid>` from the current URL and persist it for later consumption. */
export function captureReferral(): void {
  if (typeof window === "undefined") return;
  const ref = new URLSearchParams(window.location.search).get("ref");
  if (!ref || !UUID_RE.test(ref)) return;
  try { window.localStorage.setItem(KEY, ref); } catch {}
}

/** Read and delete the pending referrer uuid, if any. */
export function consumePendingReferral(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(KEY);
    if (v) window.localStorage.removeItem(KEY);
    return v && UUID_RE.test(v) ? v : null;
  } catch {
    return null;
  }
}
