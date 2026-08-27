import { useEffect, useState } from "react";

function isStandalone() {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

const isIOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

/**
 * Shared PWA install logic used by the footer CTA and the user-menu entry.
 *
 * Captures the native `beforeinstallprompt` event (Chromium), tracks the
 * `appinstalled` event, and detects standalone (already-installed) mode so
 * callers can hide their install control. When no native prompt is available
 * (iOS, or a browser that doesn't fire `beforeinstallprompt`), `promptInstall`
 * flips `showHelp` so the caller can surface manual instructions.
 */
export function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowHelp(false);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  // Close the inline help on Escape — it's a disclosure, not a modal.
  useEffect(() => {
    if (!showHelp) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") setShowHelp(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showHelp]);

  const promptInstall = async () => {
    if (!installPrompt) {
      setShowHelp(true);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  };

  return { installed, showHelp, setShowHelp, isIOS, promptInstall };
}
