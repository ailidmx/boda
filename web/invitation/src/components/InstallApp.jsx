import React, { useEffect, useState } from "react";

const COPY = {
  es: {
    install: "Instalar la app",
    installed: "App instalada",
    title: "Añadir al inicio",
    ios: "En iPhone/iPad: toca Compartir y después ‘Añadir a pantalla de inicio’.",
    fallback: "Abre el menú del navegador y elige ‘Instalar app’ o ‘Añadir a pantalla de inicio’.",
    close: "Cerrar",
  },
  fr: {
    install: "Installer l’app",
    installed: "App installée",
    title: "Ajouter à l’écran d’accueil",
    ios: "Sur iPhone/iPad : touchez Partager puis ‘Sur l’écran d’accueil’.",
    fallback: "Ouvrez le menu du navigateur puis choisissez ‘Installer l’application’ ou ‘Ajouter à l’écran d’accueil’.",
    close: "Fermer",
  },
  en: {
    install: "Install app",
    installed: "App installed",
    title: "Add to Home Screen",
    ios: "On iPhone/iPad: tap Share, then ‘Add to Home Screen’.",
    fallback: "Open your browser menu and choose ‘Install app’ or ‘Add to Home Screen’.",
    close: "Close",
  },
};

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function InstallApp({ language = "es" }) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [showHelp, setShowHelp] = useState(false);
  const text = COPY[language] || COPY.es;

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
        <span aria-hidden="true">↓</span> {text.install}
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
