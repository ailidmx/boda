import React from "react";

import { useApp } from "../context/AppContext.jsx";
import { FEATURES } from "../features.js";
import { Dialog } from "./ui/Dialog.jsx";

// "À propos" popup shown from the user menu. It lists the newest features of
// the invitation (see features.js) in the guest's active language, so guests
// can discover what has been added since they last visited.
export function AboutModal({ open, onClose }) {
  const { t, language } = useApp();
  const nav = t.nav || {};

  if (!open) return null;

  const features = FEATURES[language] || FEATURES.es || [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      ariaLabelledBy="about-modal-title"
      closeLabel={nav.aboutClose || nav.close}
      overlayClassName="user-menu-modal__overlay about-modal__overlay"
      cardClassName="user-menu-modal__card about-modal__card"
      closeClassName="user-menu-modal__close"
      closeOnEscape
      closeOnOverlayClick
    >
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
    </Dialog>
  );
}
