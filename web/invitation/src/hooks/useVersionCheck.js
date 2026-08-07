import { useEffect } from "react";

/**
 * useVersionCheck
 *
 * Forces guests onto the latest deployed version of the invitation.
 *
 * The app is built with a `__BUILD_NUMBER__` (a UTC timestamp injected by
 * vite.config.js). On every deploy, scripts/postbuild.mjs writes a
 * `version.json` file containing that same build number.
 *
 * This hook periodically fetches `version.json` (served with no-cache headers)
 * and compares it to the build number the current page was built with. If they
 * differ, a newer release has shipped, so we force a hard reload to pick up the
 * latest assets. This guarantees no guest stays on a stale cached version for
 * more than a few seconds after a deploy.
 *
 * @param {number} intervalMs How often to check for a new version (ms).
 */
export function useVersionCheck(intervalMs = 60_000) {
  useEffect(() => {
    // Only run in production. In dev there is no version.json and HMR handles
    // updates.
    if (!import.meta.env.PROD) return;

    const currentBuild = __BUILD_NUMBER__;
    if (!currentBuild) return;

    let timer = null;

    // Guard against an infinite reload loop. If a mismatch somehow persists
    // (e.g. a stale version.json), we must not reload forever. We remember the
    // last build we reloaded to in sessionStorage and only reload once per
    // distinct build, so a persistent mismatch can never loop.
    const reloadKey = "boda-version-reloaded";
    const lastReloaded = (() => {
      try {
        return sessionStorage.getItem(reloadKey);
      } catch {
        return null;
      }
    })();

    const check = async () => {
      try {
        // Cache-bust the request itself so a cached version.json can never
        // mask a new release.
        const res = await fetch(`version.json?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const latest = data && data.build;
        if (!latest) return;

        if (latest !== currentBuild && latest !== lastReloaded) {
          console.info(
            `[version] New build detected (${currentBuild} → ${latest}). Reloading…`,
          );
          // Remember we are reloading to this build so we never loop on it.
          try {
            sessionStorage.setItem(reloadKey, latest);
          } catch {
            /* ignore */
          }
          // Hard reload, bypassing the service worker cache entirely.
          window.location.reload();
        }
      } catch (err) {
        // Network hiccup — ignore and try again on the next tick.
        console.warn("[version] check failed:", err);
      }
    };


    // Check immediately on mount, then on an interval.
    check();
    timer = setInterval(check, intervalMs);

    return () => {
      if (timer) clearInterval(timer);
    };

  }, [intervalMs]);
}
