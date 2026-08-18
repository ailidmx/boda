/**
 * Service Worker for D&A Boda invitation.
 * Provides offline support and enables the PWA install prompt.
 *
 * Strategy:
 *  - Navigation requests (HTML): network-first, falling back to cache. This
 *    guarantees guests always get the latest content when online.
 *  - Static assets (hashed by Vite): cache-first with a runtime cache, so
 *    repeated visits are fast and work offline.
 *  - Cross-origin (fonts, images): network-first, cache successful responses.
 *
 * CACHE_VERSION is auto-bumped on every build by scripts/postbuild.mjs (it
 * injects the build number), so the service worker cache is invalidated on
 * each deploy and guests are never served a stale app shell.
 */

const CACHE_VERSION = "boda-v6";




const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./favicon.ico",
  "./favicon-16x16.png",
  "./favicon-32x32.png",
  "./favicon-48x48.png",
  "./android-chrome-192x192.png",
  "./android-chrome-512x512.png",
  "./apple-touch-icon-180x180.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch((err) => {
        // A missing optional asset must not block installation.
        console.warn("[SW] shell pre-cache failed:", err);
      }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Only handle http(s) requests. Browser extensions (chrome-extension://,
  // moz-extension://, etc.) and other non-http schemes cannot be cached and
  // would throw "Request scheme ... is unsupported" on cache.put().
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // Same-origin navigation → network-first.

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() =>
          caches.match("./index.html").then((cached) => cached || caches.match("./")),
        ),
    );
    return;
  }

  // Same-origin static assets → cache-first, then network.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Cross-origin (fonts, images) → network-first, cache successes.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
