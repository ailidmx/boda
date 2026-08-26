import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext.jsx";

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function InstallApp() {
  const { t } = useApp();
  const text = (t.footer && t.footer.installApp) || {};
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

  if (installed) return null;

  const install = async () => {
    if (!installPrompt) {
      setShowHelp(true);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  };

  const isiOS = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  return (
    <div className="install-app">
      <button className="install-app__button" type="button" onClick={install}>
        <span aria-hidden="true">⬇</span> {text.install}
      </button>
      {showHelp && (
        <div className="install-app__help" role="dialog" aria-label={text.title}>
          <strong>{text.title}</strong>
          <p>{isiOS ? text.ios : text.fallback}</p>
          <button type="button" onClick={() => setShowHelp(false)}>{text.close}</button>
        </div>
      )}
    </div>
  );
}
