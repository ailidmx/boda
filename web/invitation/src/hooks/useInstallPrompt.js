import { createContext, createElement, useContext, useEffect, useMemo, useState } from "react";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function detectIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

const InstallPromptContext = createContext(null);

export function InstallPromptProvider({ children }) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => isStandalone());

  useEffect(() => {
    const onBeforeInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const value = useMemo(() => ({
    installed,
    hasNativePrompt: Boolean(installPrompt),
    async requestInstall() {
      if (!installPrompt) return false;
      try {
        await installPrompt.prompt();
        await installPrompt.userChoice;
        return true;
      } finally {
        // A BeforeInstallPromptEvent can be consumed only once, regardless of
        // whether the user accepts or dismisses the browser prompt.
        setInstallPrompt(null);
      }
    },
  }), [installPrompt, installed]);

  return createElement(InstallPromptContext.Provider, { value }, children);
}

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
  const shared = useContext(InstallPromptContext);
  if (!shared) throw new Error("useInstallPrompt must be used inside InstallPromptProvider");
  const [showHelp, setShowHelp] = useState(false);

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
    if (!shared.hasNativePrompt) {
      setShowHelp(true);
      return;
    }
    try {
      await shared.requestInstall();
    } catch {
      // Browser state can change between the captured event and the click.
      // Fall back to manual instructions instead of surfacing a rejection.
      setShowHelp(true);
    }
  };

  return { installed: shared.installed, showHelp, setShowHelp, isIOS: detectIOS(), promptInstall };
}
