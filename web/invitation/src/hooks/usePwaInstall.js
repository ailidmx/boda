import { useCallback, useEffect, useState } from "react";

/**
 * usePwaInstall
 *
 * Drives the "Install app" option in the user menu so the invitation can be
 * installed as a standalone app / shortcut on every platform:
 *
 *  - Android + Chrome/Edge desktop (Windows & Mac): the browser fires a
 *    `beforeinstallprompt` event. We capture it and call `prompt()` when the
 *    guest taps "Install app", which shows the native install dialog and
 *    creates a real app icon on the home screen / desktop.
 *  - iOS Safari: there is NO `beforeinstallprompt`. The only way to install is
 *    the manual "Share → Add to Home Screen" flow, so we expose `isIOS` and let
 *    the UI show step-by-step instructions instead.
 *  - Desktop Safari / Firefox: also no `beforeinstallprompt`, so we fall back
 *    to generic instructions (browser menu → install / create shortcut).
 *
 * We also detect when the app is ALREADY running standalone (installed), in
 * which case the UI should hide the install option entirely.
 *
 * @returns {{
 *   canInstall: boolean,   // a beforeinstallprompt is available (Android/desktop Chromium)
 *   isIOS: boolean,        // iOS Safari (manual Add to Home Screen flow)
 *   isStandalone: boolean, // already running as an installed app
 *   install: () => Promise<boolean>, // triggers the native prompt; resolves true if installed
 * }}
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);

  // Detect iOS Safari (needs the manual "Add to Home Screen" flow).
  const isIOS = (() => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    const isIphone = /iPhone|iPod/.test(ua);
    const isIpad =
      /iPad/.test(ua) ||
      // iPadOS 13+ reports as a Mac desktop UA; detect via touch + platform.
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    return isIphone || isIpad;
  })();

  useEffect(() => {
    // Already installed / running standalone (display-mode: standalone or
    // iOS fullscreen). Hide the install option in that case.
    const checkStandalone = () => {
      const mode =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        window.matchMedia?.("(display-mode: fullscreen)").matches ||
        window.matchMedia?.("(display-mode: minimal-ui)").matches ||
        // iOS Safari standalone detection.
        window.navigator.standalone === true;
      setIsStandalone(Boolean(mode));
    };
    checkStandalone();

    const onDisplayMode = (e) => setIsStandalone(e.matches);
    const mql = window.matchMedia?.("(display-mode: standalone)");
    mql?.addEventListener?.("change", onDisplayMode);

    // Capture the install prompt so we can trigger it later on demand.
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      mql?.removeEventListener?.("change", onDisplayMode);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    // The prompt can only be used once; clear it regardless of the outcome.
    setDeferredPrompt(null);
    return choice?.outcome === "accepted";
  }, [deferredPrompt]);

  return {
    canInstall: Boolean(deferredPrompt),
    isIOS,
    isStandalone,
    install,
  };
}
