import React, { useEffect } from "react";

import { useApp } from "../context/AppContext.jsx";
import { FEATURES } from "../features.js";

// "À propos" popup shown from the user menu. It lists the newest features of
// the invitation (see features.js) in the guest's active language, so guests
// can discover what has been added since they last visited.
export function AboutModal({ open, onClose }) {
  const { t, language } = useApp();
  const nav = t.nav || {};

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEscape);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  const features = FEATURES[language] || FEATURES.es || [];

  return (
    <div
      className="user-menu-modal__overlay about-modal__overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      onClick={onClose}
    >
      <div
        className="user-menu-modal__card about-modal__card"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="user-menu-modal__close"
          type="button"
          aria-label={nav.aboutClose || nav.close}
          onClick={onClose}
        >
          ✕
        </button>

        <h2 className="user-menu-modal__title" id="about-modal-title">
          {nav.aboutTitle}
        </h2>
        {nav.aboutSubtitle && (
          <p className="about-modal__subtitle">{nav.aboutSubtitle}</p>
        )}

        <ul className="about-modal__list">
          {features.map((feature, index) => (
            <li className="about-modal__item" key={index}>
              <span className="about-modal__icon" aria-hidden="true">
                {feature.icon}
              </span>
              <div className="about-modal__text">
                <span className="about-modal__feature-title">
                  {feature.title}
                </span>
                <span className="about-modal__feature-body">
                  {feature.body}
                </span>
              </div>
            </li>
          ))}
        </ul>

        <div className="about-modal__actions">
          <button
            className="user-menu-modal__btn user-menu-modal__btn--primary"
            type="button"
            onClick={onClose}
          >
            {nav.aboutClose || nav.close}
          </button>
        </div>
      </div>
    </div>
  );
}
