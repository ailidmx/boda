import React from "react";
import { useApp } from "../context/AppContext.jsx";
import { useInstallPrompt } from "../hooks/useInstallPrompt.js";

const HELP_ID = "install-app-help";

export function InstallApp() {
  const { t } = useApp();
  const text = (t.footer && t.footer.installApp) || {};
  const { installed, showHelp, setShowHelp, isIOS, promptInstall } = useInstallPrompt();

  if (installed) return null;

  return (
    <div className="install-app">
      <button
        className="install-app__button"
        type="button"
        onClick={promptInstall}
        aria-expanded={showHelp}
        aria-controls={showHelp ? HELP_ID : undefined}
      >
        <span aria-hidden="true">⬇</span> {text.install}
      </button>
      {showHelp && (
        <div className="install-app__help" id={HELP_ID}>
          <strong>{text.title}</strong>
          <p>{isIOS ? text.ios : text.fallback}</p>
          <button type="button" onClick={() => setShowHelp(false)}>{text.close}</button>
        </div>
      )}
    </div>
  );
}
