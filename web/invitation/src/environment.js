// Client-side environment helpers (shared by analytics + notification writes).

/** True when the invitation is running from the local dev server. */
export function isLocalHost() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

/** Production hostname, or a unique per-write marker when running locally. */
export function sourceHost() {
  if (typeof window === "undefined") return "";
  const host = window.location.hostname;
  if (host !== "localhost" && host !== "127.0.0.1") return host;

  // A unique marker lets Cloud Functions identify the CURRENT local write.
  // Comparing only a persistent `sourceHost: "localhost"` value would silence
  // a later legitimate dashboard update to the same document.
  const writeId = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${host}#${writeId}`;
}
