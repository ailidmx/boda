import React, { useState } from "react";

import {
  resolveGuestName,
  resolveGuestPhone,
  resolveIdentityCheckPassed,
  saveGuestName,
  saveGuestPhoto,
} from "../../guest-profiles.js";
import { uploadAvatar, validateAvatarFile } from "../../cloudinary-upload.js";
import { PhoneInput } from "../PhoneInput.jsx";
import { Avatar } from "./Avatar.jsx";
import { flagForPhone, formatPhone, formatDisplayEmail } from "./phone-format.js";

// A single member card. Shows avatar, name, phone (with flag) and email, plus
// a single Edit button on the right. Clicking Edit reveals the identity edit
// wizard for name + phone, while email stays read-only in this flow.
export function MemberCard({
  guest,
  isSelf,
  isActive,
  copy,
  lang,
  authEmail,
  onSaved,
  onStatusChange,
}) {
  const { firstName, middleName, lastName, maternalLastName } =
    resolveGuestName(guest);
  const fullName = [firstName, middleName, lastName, maternalLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const phone = resolveGuestPhone(guest);
  const identityVerified =
    resolveIdentityCheckPassed(guest) || guest?.idCheckUser === true;

  // Email display: for the signed-in guest it comes from the auth profile
  // (the real login credential). For other group members it is read-only from
  // the static registry.
  const email = isSelf ? authEmail : guest.firebaseEmail || "";

  const [editing, setEditing] = useState(false);
  const [draftFirstName, setDraftFirstName] = useState(firstName);
  const [draftMiddleName, setDraftMiddleName] = useState(middleName);
  const [draftLastName, setDraftLastName] = useState(lastName);
  const [draftMaternalLastName, setDraftMaternalLastName] =
    useState(maternalLastName);
  const [draftPhone, setDraftPhone] = useState(phone);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState(1);
  const [flipping, setFlipping] = useState(false);
  const [flipDir, setFlipDir] = useState(1);

  const clearStatus = () => {
    onStatusChange?.(null);
  };

  const reportStatus = (type, payload) => {
    if (typeof payload === "string") {
      onStatusChange?.({ type, text: payload, guestId: guest.id });
      return;
    }
    onStatusChange?.({ type, guestId: guest.id, ...(payload || {}) });
  };

  const successMessage = (name) => {
    const full = String(name || "").trim();
    if (copy.savedWithName && full) {
      const [prefix, suffix = ""] = copy.savedWithName.split("{name}");
      return {
        prefix: prefix || "",
        name: full,
        suffix,
      };
    }
    return { text: copy.saved };
  };

  // Steps 1-4 are the four name fields (Nombre, Nombre 2, Apellido,
  // Apellido 2), and step 5 is phone.
  const lastStep = 5;

  // Open the edit form at the first step. The back face is a thin wizard
  // (first name → middle name → last name → second last name → phone)
  // so the card stays short.
  const startEdit = () => {
    setDraftFirstName(firstName);
    setDraftMiddleName(middleName);
    setDraftLastName(lastName);
    setDraftMaternalLastName(maternalLastName);
    setDraftPhone(phone);
    clearStatus();
    setStep(1);
    setEditing(true);
  };

  // Move between wizard steps with a card-flip transition. `dir` is +1 when
  // going forward and -1 when going back; the flip direction is applied via
  // a CSS class so the card visibly turns over between steps.
  const goToStep = (next, dir) => {
    if (next === step) return;
    setFlipDir(dir);
    setFlipping(true);
    window.setTimeout(() => {
      setStep(next);
      setFlipping(false);
    }, 260);
  };

  const saveAll = async (event) => {
    event.preventDefault();
    // ENREGISTER always flips the card back to the view face, whether it
    // succeeds or fails. The error/success message lives ONLY on the view
    // face, so we flip first and then show the result there.
    const fail = (text) => {
      setEditing(false);
      reportStatus("error", text);
    };
    if (!draftFirstName.trim() || !draftLastName.trim()) {
      fail(copy.nameRequired);
      return;
    }

    setSaving(true);
    clearStatus();
    try {
      const nextFullName = [
        draftFirstName,
        draftMiddleName,
        draftLastName,
        draftMaternalLastName,
      ]
        .map((value) => String(value || "").trim())
        .filter(Boolean)
        .join(" ");

      // Name + phone are stored on the `guests` collection.
      await saveGuestName(
        guest,
        {
          firstName: draftFirstName,
          middleName: draftMiddleName,
          lastName: draftLastName,
          maternalLastName: draftMaternalLastName,
          phone: draftPhone,
          idCheckUser: true,
        },
        guest.id,
      );

      setEditing(false);
      reportStatus("success", successMessage(nextFullName));
      onSaved?.();
    } catch (error) {
      console.error("save identity failed", error);
      setEditing(false);
      reportStatus("error", copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const validation = validateAvatarFile(file);
    if (validation) {
      reportStatus("error", validation);
      return;
    }
    setUploading(true);
    clearStatus();
    try {
      const url = await uploadAvatar(file);
      await saveGuestPhoto(guest, url, guest.id);
      reportStatus("success", copy.photoSaved);
      onSaved?.();
    } catch (error) {
      console.error("uploadAvatar failed", error);
      const detail = error?.message || "";
      const text =
        detail && !detail.includes("Upload failed")
          ? `${copy.photoError} ${detail}`
          : copy.photoError;
      reportStatus("error", text);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <article
      data-member-id={guest.id}
      className={`identity-member${isSelf ? " identity-member--self" : ""}${isActive ? " is-active" : ""}${editing ? " is-flipped" : ""}`}
    >
      <span
        className={`identity-member-status${identityVerified ? " is-verified" : " is-pending"}`}
        aria-label={
          identityVerified
            ? "Identity verified"
            : "Identity verification pending"
        }
        title={
          identityVerified
            ? "Identity verified"
            : "Identity verification pending"
        }
      >
        {identityVerified ? "✓" : "?"}
      </span>

      {/* Bottom-right edit link: only shown in view mode to avoid duplicating
          the cancel/back controls that already exist inside the edit form. */}
      {!editing && (
        <button
          type="button"
          className="identity-member-toggle"
          onClick={(e) => {
            e.stopPropagation();
            startEdit();
          }}
          aria-label={copy.edit}
          aria-pressed={false}
        >
          {copy.edit || "Edit"}
        </button>
      )}

      <div className="identity-member-flip">
        {/* FRONT — the display view (avatar, name, phone, email). Clean and
            calm: no per-field edit buttons. The avatar is clickable to change
            the photo, and the single toggle on the top-right opens editing. */}
        <div className="identity-member-face identity-member-face--front">
          <div className="identity-member-head">
            <div className="identity-avatar-wrap">
              <Avatar guest={guest} size={56} />
              <label
                className="identity-avatar-edit"
                title={copy.changePhoto || copy.addPhoto}
                onClick={(e) => e.stopPropagation()}
              >
                {uploading ? "…" : "✎"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhoto}
                  disabled={uploading}
                  hidden
                />
              </label>
            </div>

            <div className="identity-member-id">
              <div className="identity-member-name">
                <strong>{fullName}</strong>
                {isSelf && (
                  <span className="identity-member-tag">{copy.you}</span>
                )}
              </div>
              <div className="identity-member-phone">
                {phone ? (
                  <>
                    <span className="identity-member-flag" aria-hidden="true">
                      {flagForPhone(phone, lang)}
                    </span>
                    <span>{formatPhone(phone)}</span>
                  </>
                ) : (
                  <span className="identity-member-missing">
                    {copy.phoneMissing}
                  </span>
                )}
              </div>
              <div className="identity-member-email">
                <span aria-hidden="true">✉</span>
                <span>
                  {email ? formatDisplayEmail(email) : copy.emailPlaceholder}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BACK — the thin edit wizard. Only one step shows at a time
          (names → last names → phone) so the card stays short. A
            reserved rail at the bottom holds Back/Cancel and Next/Save. */}
        <div className="identity-member-face identity-member-face--back">
          <form className="identity-edit-form" onSubmit={saveAll} noValidate>
            {/* Flip container — the visible step turns over between steps */}
            <div
              className={`identity-wizard-flip${flipping ? ` is-flipping${flipDir > 0 ? " is-forward" : " is-back"}` : ""}`}
            >
              {step === 1 && (
                <div className="identity-wizard-face">
                  <div className="identity-name-grid">
                    <div className="form-field">
                      <label htmlFor={`identity-firstName-${guest.id}`}>
                        {copy.firstNameLabel || copy.nombreLabel}
                      </label>
                      <input
                        id={`identity-firstName-${guest.id}`}
                        type="text"
                        value={draftFirstName}
                        onChange={(e) => setDraftFirstName(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="identity-wizard-face">
                  <div className="identity-name-grid">
                    <div className="form-field">
                      <label htmlFor={`identity-middleName-${guest.id}`}>
                        {copy.middleNameLabel || copy.nombre2Label}
                      </label>
                      <input
                        id={`identity-middleName-${guest.id}`}
                        type="text"
                        value={draftMiddleName}
                        onChange={(e) => setDraftMiddleName(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="identity-wizard-face">
                  <div className="identity-name-grid">
                    <div className="form-field">
                      <label htmlFor={`identity-lastName-${guest.id}`}>
                        {copy.lastNameLabel || copy.apellidoLabel}
                      </label>
                      <input
                        id={`identity-lastName-${guest.id}`}
                        type="text"
                        value={draftLastName}
                        onChange={(e) => setDraftLastName(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="identity-wizard-face">
                  <div className="identity-name-grid">
                    <div className="form-field">
                      <label htmlFor={`identity-maternalLastName-${guest.id}`}>
                        {copy.maternalLastNameLabel || copy.apellido2Label}
                      </label>
                      <input
                        id={`identity-maternalLastName-${guest.id}`}
                        type="text"
                        value={draftMaternalLastName}
                        onChange={(e) =>
                          setDraftMaternalLastName(e.target.value)
                        }
                        autoFocus
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="identity-wizard-face">
                  <div className="form-field form-field-wide">
                    <label htmlFor={`identity-phone-${guest.id}`}>
                      {copy.phoneLabel}
                    </label>
                    <PhoneInput
                      id={`identity-phone-${guest.id}`}
                      name="phone"
                      autoComplete="tel"
                      value={draftPhone}
                      onChange={setDraftPhone}
                      placeholder={copy.phonePlaceholder}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Reserved bottom rail — Back/Cancel on the left, Next/Save
                (golden pill) on the right. Always present so the layout is
                stable and the card stays thin. */}
            <div className="identity-wizard-nav">
              {step > 1 ? (
                <button
                  className="identity-wizard-back"
                  type="button"
                  onClick={() => goToStep(step - 1, -1)}
                >
                  {copy.back || "←"}
                </button>
              ) : (
                <button
                  className="identity-wizard-back"
                  type="button"
                  onClick={() => setEditing(false)}
                >
                  {copy.cancel}
                </button>
              )}
              {step < lastStep ? (
                <button
                  className="identity-wizard-next"
                  type="button"
                  onClick={() => goToStep(step + 1, 1)}
                >
                  {copy.next || "→"}
                </button>
              ) : (
                <button
                  className="identity-wizard-next"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? copy.saving : copy.save}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </article>
  );
}

export default MemberCard;
