// Client-side environment helpers (shared by analytics + notification writes).

/** True when the invitation is running from the local dev server. */
export function isLocalHost() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

/** The current origin hostname (e.g. "localhost" or the prod domain). */
export function sourceHost() {
  if (typeof window === "undefined") return "";
  return window.location.hostname;
}
