import React, { useEffect, useRef, useState } from "react";

import { useApp } from "../context/AppContext.jsx";
import { AUTH_EMAIL_DOMAIN, getActiveGuests } from "../guests.js";
import {
  getGroupMembers,
  resolveGuestInvitationGroup,
  resolveIdentityCheckPassed,
  resolveGuestName,
  resolveGuestPhoto,
  resolveGuestPhone,
  saveGuestName,
  saveGuestPhoto,
  saveIdentityCheckPassed,
} from "../guest-profiles.js";
import { getGroupTag } from "../invitation-profile.js";

import { uploadAvatar, validateAvatarFile } from "../cloudinary-upload.js";
import { PhoneInput } from "./PhoneInput.jsx";
import { CoupleNames } from "./ui.jsx";

// Curated country list (flag, dial code) used to derive the flag shown next
// to a stored E.164 phone number. Kept in sync with PhoneInput's list.
const FLAG_BY_CODE = {
  "+52": "🇲🇽",
  "+1": "🇺🇸",
  "+44": "🇬🇧",
  "+33": "🇫🇷",
  "+34": "🇪🇸",
  "+49": "🇩🇪",
  "+39": "🇮🇹",
  "+31": "🇳🇱",
  "+32": "🇧🇪",
  "+41": "🇨🇭",
  "+43": "🇦🇹",
  "+351": "🇵🇹",
  "+353": "🇮🇪",
  "+46": "🇸🇪",
  "+47": "🇳🇴",
  "+45": "🇩🇰",
  "+358": "🇫🇮",
  "+48": "🇵🇱",
  "+420": "🇨🇿",
  "+30": "🇬🇷",
  "+90": "🇹🇷",
  "+54": "🇦🇷",
  "+55": "🇧🇷",
  "+56": "🇨🇱",
  "+57": "🇨🇴",
  "+51": "🇵🇪",
  "+593": "🇪🇨",
  "+502": "🇬🇹",
  "+506": "🇨🇷",
  "+507": "🇵🇦",
  "+53": "🇨🇺",
  "+81": "🇯🇵",
  "+82": "🇰🇷",
  "+86": "🇨🇳",
  "+91": "🇮🇳",
  "+61": "🇦🇺",
  "+64": "🇳🇿",
  "+27": "🇿🇦",
  "+971": "🇦🇪",
  "+972": "🇮🇱",
};

// Fallback flag per UI language, used when a phone number is unknown.
const LANG_FLAG = {
  es: "🇲🇽",
  fr: "🇫🇷",
  en: "🇬🇧",
};

/** Derive the flag emoji for an E.164 phone number (longest dial-code match).
 *  When no number is known, fall back to the flag of the user's language. */
function flagForPhone(e164, lang = "es") {
  const digits = (e164 || "").replace(/\D/g, "");
  if (!digits) return LANG_FLAG[lang] || "🌐";
  let best = null;
  for (const code of Object.keys(FLAG_BY_CODE)) {
    const codeDigits = code.replace(/\D/g, "");
    if (
      digits.startsWith(codeDigits) &&
      (!best || codeDigits.length > best.length)
    ) {
      best = codeDigits;
    }
  }
  return best ? FLAG_BY_CODE[`+${best}`] : LANG_FLAG[lang] || "🌐";
}

/** Format an E.164 phone number for display (e.g. "+52 33 1234 5678"). */
function formatPhone(e164) {
  const digits = (e164 || "").replace(/\D/g, "");
  if (!digits) return "";
  // Find the dial code.
  let code = "";
  for (const c of Object.keys(FLAG_BY_CODE)) {
    const cd = c.replace(/\D/g, "");
    if (digits.startsWith(cd) && cd.length > code.length) code = cd;
  }
  const national = code ? digits.slice(code.length) : digits;
  let grouped;
  if (code === "33") {
    // French format: X XX XX XX XX (leading digit, then pairs).
    const first = national.slice(0, 1);
    const rest = national.slice(1).match(/.{1,2}/g)?.join(" ") || "";
    grouped = [first, rest].filter(Boolean).join(" ");
  } else {
    grouped = national.match(/.{1,2}/g)?.join(" ") || national;
  }
  return code ? `+${code} ${grouped}` : grouped;
}


function formatDisplayEmail(email) {
  const normalized = String(email || "").trim();
  const suffix = `@${AUTH_EMAIL_DOMAIN}`;
  if (!normalized) return "";
  if (normalized.toLowerCase().endsWith(suffix.toLowerCase())) {
    return normalized.slice(0, -suffix.length);
  }
  return normalized;
}

function Avatar({ guest, size = 64 }) {
  const photo = resolveGuestPhoto(guest);
  const { firstName } = resolveGuestName(guest);
  const initials = (firstName || "?")
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (photo) {
    return (
      <span className="identity-avatar" style={{ width: size, height: size }}>
        <img src={photo} alt="" loading="lazy" decoding="async" />
      </span>
    );
  }
  return (
    <span
      className="identity-avatar identity-avatar--initials"
      style={{ width: size, height: size }}
    >
      {initials}
    </span>
  );
}

// A single member card. Shows avatar, name, phone (with flag) and email, plus
// a single Edit button on the right. Clicking Edit reveals the identity edit
// wizard for name + phone, while email stays read-only in this flow.
function MemberCard({
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
  const identityVerified = resolveIdentityCheckPassed(guest) || guest?.idCheckUser === true;

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
        aria-label={identityVerified ? "Identity verified" : "Identity verification pending"}
        title={identityVerified ? "Identity verified" : "Identity verification pending"}
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
          aria-label={identityVerified ? copy.edit : copy.verify}
          aria-pressed={false}
        >
          {identityVerified ? copy.edit || "Edit" : copy.verify || "Verify"}
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
                <strong>
                  {fullName}
                </strong>
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
                <span>{email ? formatDisplayEmail(email) : copy.emailPlaceholder}</span>
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
                        onChange={(e) => setDraftMaternalLastName(e.target.value)}
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

// Horizontal tab selector shown only when the invitation group has more than
// one member. Each tab shows the member's avatar, first name and phone flag.
function MemberTabs({ members, activeId, onSelect, copy, lang, tabsRef }) {
  return (
    <div
      ref={tabsRef}
      className="identity-tabs"
      role="tablist"
      aria-label={copy.membersLabel || "Members"}
    >
      {members.map((member) => {
        const { firstName } = resolveGuestName(member);
        const phone = resolveGuestPhone(member);
        const isActive = member.id === activeId;
        return (
          <button
            key={member.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-member-tab-id={member.id}
            className={`identity-tab${isActive ? " is-active" : ""}`}
            onClick={() => onSelect(member.id)}
          >
            <Avatar guest={member} size={32} />
            <span className="identity-tab-name">{firstName}</span>
            <span className="identity-tab-flag" aria-hidden="true">
              {flagForPhone(phone, lang)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Identity-check modal shown after sign-in (and reopenable from the user menu).
// The guest can confirm or correct their name, add a photo, a phone number and
// see the current email (read-only). Clicking OK records
// `identityCheckPassed = true` so it won't pop up again; closing/cancelling
// does NOT record it, so it pops up again on next nav.
export function IdentityModal() {
  const {
    t,
    profile,
    identityPrompt,
    dismissIdentityPrompt,
    confirmIdentityPrompt,
  } = useApp();

  const identity = t.identity || {};
  const lang = t.locale?.startsWith("fr")
    ? "fr"
    : t.locale?.startsWith("en")
      ? "en"
      : "es";
  const guest = profile?.guest;
  const authEmail = profile?.email || "";
  const [refreshKey, setRefreshKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [footerMessage, setFooterMessage] = useState(null);
  // Randomly pick which name order to show on open (David left / Aydé right,
  // or the reverse), then keep it static — no crossing animation.
  const [nameOrder] = useState(() =>
    Math.random() < 0.5 ? "primary" : "secondary",
  );
  // Ref to the scrollable list of member cards, used by the badge selector to
  // scroll the selected member into view.
  const listRef = useRef(null);
  const tabsRef = useRef(null);

  const scrollTabToLeft = (id, behavior = "smooth") => {
    const tabs = tabsRef.current;
    if (!tabs) return;
    const tab = tabs.querySelector(`[data-member-tab-id="${id}"]`);
    if (!tab) return;

    const nextLeft = Math.max(0, tab.offsetLeft - tabs.offsetLeft);
    tabs.scrollTo({ left: nextLeft, behavior });
  };

  // Scroll the extended list so the selected member's card is in view, then
  // highlight it. The badge selector on top drives this.
  const selectMember = (id) => {
    setActiveId(id);
    scrollTabToLeft(id);
    const card = listRef.current?.querySelector(`[data-member-id="${id}"]`);
    card?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  // Keep the top badge strip synchronized when active member changes.
  useEffect(() => {
    if (!activeId) return;
    scrollTabToLeft(activeId);
  }, [activeId]);

  // Lock background scroll while the modal is open.
  useEffect(() => {
    if (!identityPrompt) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [identityPrompt]);

  // Initialize active member once when the modal is shown.
  useEffect(() => {
    if (!identityPrompt || !guest?.id) return;
    setActiveId(guest.id);
  }, [identityPrompt, guest?.id]);

  if (!identityPrompt || !guest) return null;

  const members = getGroupMembers(guest, getActiveGuests());
  const activeMember = members.find((m) => m.id === activeId) || guest;
  const invitationGroup = resolveGuestInvitationGroup(guest) || guest.invitationGroup || guest.group || "";
  const invitationGroupLabel = invitationGroup
    ? getGroupTag(invitationGroup).label || invitationGroup
    : "";
  const identityTitle = members.length > 1
    ? (identity.titleGroup || identity.title || "")
      .replace("{count}", String(members.length))
    : (identity.titleSingle || identity.title || "");

  // Clicking "Confirmer" means the guest has reviewed the identity of every
  // member of their invitation group. We therefore record `idCheckUser = true`
  // for the whole group (the signed-in guest + all their group members), so the
  // identity window won't pop up again for any of them on their next visit.
  // The Firestore rules allow a guest to write the identity-check flag of any
  // member of their own invitation group.
  const handleConfirm = async () => {
    setSaving(true);
    setFooterMessage(null);
    try {
      await Promise.all(
        members.map((member) =>
          saveIdentityCheckPassed(member, true, guest.id),
        ),
      );
      confirmIdentityPrompt();
    } catch (error) {
      console.error("saveIdentityCheckPassed failed", error);
      // Even if the write fails, close the modal so the guest isn't stuck.
      confirmIdentityPrompt();
    } finally {
      setSaving(false);
    }
  };


  return (
    <div
      className="identity-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="identity-modal-title"
    >
      <div className="identity-modal-card">
        <button
          type="button"
          className="identity-modal-close"
          aria-label={identity.cancel}
          onClick={dismissIdentityPrompt}
        >
          ✕
        </button>

        {/* Header — always visible, never scrolls */}
        <div className="identity-modal-header">
          <div className="identity-modal-monogram">
            <CoupleNames
              variant={`identity-swap--modal-names is-${nameOrder}`}
            />
          </div>
          <h2
            id="identity-modal-title"
            className="eyebrow identity-modal-eyebrow"
          >
            {identity.eyebrow}
          </h2>
          {invitationGroupLabel && (
            <p className="identity-group-badge" aria-label={identity.membersLabel || "Invitation group"}>
              {invitationGroupLabel}
            </p>
          )}
          <p className="identity-modal-title">{identityTitle}</p>
          {members.length > 1 && (
            <div className="identity-tabs-viewport">
              <MemberTabs
                members={members}
                activeId={activeMember.id}
                onSelect={selectMember}
                copy={identity}
                lang={lang}
                tabsRef={tabsRef}
              />
            </div>
          )}
        </div>

        {/* Body — only this scrolls vertically */}
        <div className="identity-modal-body">
          {/* Extended scrollable list of every member in the invitation group.
              Each card has a fixed height so the front/back flip never changes
              the layout. The badge selector above scrolls to and highlights
              the selected member. */}
          <div className="identity-members" ref={listRef}>
            {members.map((member) => (
              <MemberCard
                key={member.id}
                guest={member}
                isSelf={member.id === guest.id}
                isActive={member.id === activeMember.id}
                copy={identity}
                lang={lang}
                authEmail={authEmail}
                onStatusChange={setFooterMessage}
                onSaved={() => setRefreshKey((k) => k + 1)}
              />
            ))}
          </div>
        </div>

        {/* Footer — always visible, never scrolls */}
        <div className="identity-modal-footer">
          {footerMessage && (
            <p
              className={`identity-modal-message identity-modal-message--${footerMessage.type}`}
            >
              {footerMessage.name ? (
                <>
                  {footerMessage.prefix}
                  <strong>{footerMessage.name}</strong>
                  {footerMessage.suffix}
                </>
              ) : (
                footerMessage.text
              )}
            </p>
          )}
          <div className="identity-modal-actions">
            <button
              type="button"
              className="identity-modal-btn identity-modal-btn--primary"
              onClick={handleConfirm}
              disabled={saving}
            >
              {saving ? identity.saving : (identity.confirm || identity.ok)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
