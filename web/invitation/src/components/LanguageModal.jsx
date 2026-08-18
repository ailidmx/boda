import React from "react";
import { useApp } from "../context/AppContext.jsx";
import { CoupleNames, LANGUAGE_FLAGS_ONLY } from "./ui.jsx";
import { Dialog } from "./ui/Dialog.jsx";

// Fills {current} and {preferred} placeholders in a translated string,
// rendering each language name in bold with its flag emoji in front.
function fill(template, current, preferred) {
  const parts = template.split(/(\{current\}|\{preferred\})/g);
  return parts.map((part, i) => {
    if (part === "{current}") return <strong key={i}>{current}</strong>;
    if (part === "{preferred}") return <strong key={i}>{preferred}</strong>;
    return part;
  });
}

// Shown right after sign-in when the guest's preferred language differs from
// the language they were seeing (the login page, Spanish by default). The
// invitation has already switched to the preferred language in the background;
// this modal lets the guest confirm it or switch back to the previous language.
export function LanguageModal() {

  const {
    langPrompt,
    langNames,
    interfaceText,
    dismissLangPrompt,
    revertLangPrompt,
  } = useApp();

  if (!langPrompt) return null;

  const { current, preferred } = langPrompt;
  // Prepend the flag emoji to each language name so the guest instantly
  // recognises the two languages being offered.
  const currentName = `${LANGUAGE_FLAGS_ONLY[current] || ""} ${langNames[current] || current}`.trim();
  const preferredName = `${LANGUAGE_FLAGS_ONLY[preferred] || ""} ${langNames[preferred] || preferred}`.trim();
  const copy = interfaceText.langPrompt;

  return (
    <Dialog
      open={!!langPrompt}
      onClose={dismissLangPrompt}
      ariaLabelledBy="lang-modal-title"
      closeLabel={copy.title}
      overlayClassName="lang-modal-overlay"
      cardClassName="lang-modal-card"
      closeClassName="lang-modal-close"
    >
      <div className="lang-modal-scroll">
        <div className="identity-modal-monogram">
          <CoupleNames variant="identity-swap--modal-names" />
        </div>
        <h2 id="lang-modal-title" className="lang-modal-title">
          {copy.title}
        </h2>
        <p className="lang-modal-body">
          {fill(copy.body, currentName, preferredName)}
        </p>
        <div className="lang-modal-actions">
          <button
            type="button"
            className="lang-modal-btn lang-modal-btn--primary"
            onClick={dismissLangPrompt}
          >
            {fill(copy.keep, currentName, preferredName)}
          </button>
          <button
            type="button"
            className="lang-modal-btn lang-modal-btn--ghost"
            onClick={revertLangPrompt}
          >
            {fill(copy.switch, currentName, preferredName)}
          </button>
        </div>
      </div>
    </Dialog>
  );

}
