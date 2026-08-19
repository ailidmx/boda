import React, { useEffect, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { getActiveGuests } from "../guests.js";
import {
  getGroupMembers,
  resolveGuestName,
  resolveGuestPhoto,
  resolveGuestPhone,
  saveGuestName,
  saveGuestPhoto,
  saveGuestContact,
  subscribeGuestsCache,
} from "../guest-profiles.js";
import { uploadAvatar, validateAvatarFile } from "../cloudinary-upload.js";
import { PhoneInput } from "./PhoneInput.jsx";


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
    <span className="identity-avatar identity-avatar--initials" style={{ width: size, height: size }}>
      {initials}
    </span>
  );
}

// A single member card that combines name confirmation (edit + photo) and
// their own mobile number field, so the whole identity check fits in one step.
function MemberCard({ guest, isSelf, copy, onSaved }) {
  const { firstName, lastName } = resolveGuestName(guest);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const hasPhoto = !!resolveGuestPhoto(guest);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(fullName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [phone, setPhone] = useState(resolveGuestPhone(guest));
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneMessage, setPhoneMessage] = useState(null);

  const startEdit = () => {
    setDraftName(fullName);
    setMessage(null);
    setEditing(true);
  };

  const saveName = async (event) => {
    event.preventDefault();
    if (!draftName.trim()) {
      setMessage({ type: "error", text: copy.nameRequired });
      return;
    }
    // Split the single full-name field into first + last for storage.
    const parts = draftName.trim().split(/\s+/);
    const nextFirst = parts[0];
    const nextLast = parts.slice(1).join(" ");
    setSaving(true);
    setMessage(null);
    try {
      await saveGuestName(guest, { firstName: nextFirst, lastName: nextLast }, guest.id);
      setEditing(false);
      setMessage({ type: "success", text: copy.saved });
      onSaved?.();
    } catch (error) {
      console.error("saveGuestName failed", error);
      setMessage({ type: "error", text: copy.saveError });
    } finally {
      setSaving(false);
    }
  };


  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const validation = validateAvatarFile(file);
    if (validation) {
      setMessage({ type: "error", text: validation });
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      const url = await uploadAvatar(file);
      await saveGuestPhoto(guest, url, guest.id);
      setMessage({ type: "success", text: copy.photoSaved });
      onSaved?.();
    } catch (error) {
      console.error("uploadAvatar failed", error);
      // Surface the real Cloudinary error so guests can report it accurately.
      const detail = error?.message || "";
      const text = detail && !detail.includes("Upload failed")
        ? `${copy.photoError} ${detail}`
        : copy.photoError;
      setMessage({ type: "error", text });
    } finally {

      setUploading(false);
      event.target.value = "";
    }
  };

  const savePhone = async (event) => {
    event.preventDefault();
    if (!phone.trim()) {
      setPhoneMessage({ type: "error", text: copy.phoneRequired });
      return;
    }
    setSavingPhone(true);
    setPhoneMessage(null);
    try {
      await saveGuestContact(guest, { phone }, guest.id);
      setPhoneMessage({ type: "success", text: copy.contactSaved });
      onSaved?.();
    } catch (error) {
      console.error("saveGuestContact (phone) failed", error);
      setPhoneMessage({ type: "error", text: copy.saveError });
    } finally {
      setSavingPhone(false);
    }
  };

  return (
    <article className={`identity-member${isSelf ? " identity-member--self" : ""}`}>
      <Avatar guest={guest} />
      <div className="identity-member-body">
        <div className="identity-member-name">
          <strong>{firstName} {lastName}</strong>
          {isSelf && <span className="identity-member-tag">{copy.you}</span>}
        </div>

        {editing ? (
          <form className="identity-name-form" onSubmit={saveName}>
            <div className="form-field form-field-wide">
              <label htmlFor={`identity-name-${guest.id}`}>{copy.fullName}</label>
              <input
                id={`identity-name-${guest.id}`}
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                required
              />
            </div>
            <div className="identity-name-actions">

              <button className="button button-light button-small" type="submit" disabled={saving}>
                {saving ? copy.saving : copy.save}
              </button>
              <button
                className="button button-ghost button-small"
                type="button"
                onClick={() => setEditing(false)}
              >
                {copy.cancel}
              </button>
            </div>
          </form>
        ) : (
          <div className="identity-member-actions">
            <button className="text-link" type="button" onClick={startEdit}>
              {copy.editName}
            </button>
            <label className="text-link identity-photo-label">
              {uploading ? copy.uploading : (hasPhoto ? copy.changePhoto : copy.addPhoto)}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhoto}
                disabled={uploading}
                hidden
              />
            </label>
          </div>
        )}

        {message && (
          <p className={`identity-message identity-message--${message.type}`}>
            {message.text}
          </p>
        )}

        {/* Each member's own mobile number */}
        <form className="identity-phone-form" onSubmit={savePhone}>
          <div className="form-field form-field-wide">
            <label htmlFor={`identity-phone-${guest.id}`}>{copy.phoneLabel}</label>
            <PhoneInput
              id={`identity-phone-${guest.id}`}
              name="phone"
              autoComplete="tel"
              value={phone}
              onChange={setPhone}
              placeholder={copy.phonePlaceholder}
            />
          </div>
          <div className="identity-phone-actions">
            <button className="button button-light button-small" type="submit" disabled={savingPhone}>
              {savingPhone ? copy.saving : copy.correctNumber}
            </button>
          </div>
        </form>

        {phoneMessage && (
          <p className={`identity-message identity-message--${phoneMessage.type}`}>
            {phoneMessage.text}
          </p>
        )}
      </div>
    </article>
  );
}

// Single WhatsApp group invitation shown once below all member cards.
function WhatsAppCard({ copy }) {
  return (
    <div className="identity-whatsapp">
      <a
        className="identity-whatsapp-link"
        href={copy.whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="identity-whatsapp-icon" aria-hidden="true">💬</span>
        <span className="identity-whatsapp-text">
          <strong>{copy.whatsappLabel}</strong>
          <small>{copy.whatsappHint}</small>
        </span>
        <span className="identity-whatsapp-arrow" aria-hidden="true">↗</span>
      </a>
    </div>
  );
}


export function IdentitySection() {
  const { t, profile } = useApp();
  const identity = t.identity || {};
  const guest = profile?.guest;
  const [refreshKey, setRefreshKey] = useState(0);
  // Bumped whenever the live `guests` cache updates. The group-scoped
  // onSnapshot in loadGuestProfiles() is asynchronous: right after sign-in it
  // may deliver only the signed-in guest's record, then a moment later the rest
  // of the group. `members` is computed at render time from getActiveGuests(),
  // so without this tick the section would render only the first record and
  // never reveal the other group members (e.g. Karla when Fred signs in).
  const [cacheTick, setCacheTick] = useState(0);

  // Re-render when the live `guests` cache updates so the full group appears
  // once the async snapshot delivers all members.
  useEffect(() => {
    if (!guest?.id) return undefined;
    return subscribeGuestsCache(() => setCacheTick((t) => t + 1));
  }, [guest?.id]);

  if (!guest) return null;

  const members = getGroupMembers(guest, getActiveGuests());

  return (
    <section className="identity-section section" id="identity">
      {/* The eyebrow sits at the very top of the section, above the card, so
          it reads as the section label rather than being trapped inside the
          frame. */}
      <p className="eyebrow identity-section-eyebrow">{identity.eyebrow}</p>

      <div className="identity-center">
        <div className="identity-frame reveal">
          <h2>{identity.title}</h2>
          <p className="lead">{identity.body}</p>
          <p className="identity-note">{identity.note}</p>

          <div className="identity-members" key={refreshKey}>
            {members.map((member) => (
              <MemberCard
                key={member.id}
                guest={member}
                isSelf={member.id === guest.id}
                copy={identity}
                onSaved={() => setRefreshKey((k) => k + 1)}
              />
            ))}
          </div>

          <WhatsAppCard copy={identity} />
        </div>
      </div>

      <nav className="section-nav section-nav--light" aria-label="Continue">
        <a className="section-nav-link" href="#story">
          <span>{identity.navStory}</span>
          <span aria-hidden="true">↓</span>
        </a>
      </nav>
    </section>
  );

}
