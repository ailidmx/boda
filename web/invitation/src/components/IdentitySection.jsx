import React, { useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { getActiveGuests } from "../guests.js";
import {
  getGroupMembers,
  resolveGuestName,
  resolveGuestPhoto,
  saveGuestName,
  saveGuestPhoto,
} from "../guest-profiles.js";
import { uploadAvatar, validateAvatarFile } from "../cloudinary-upload.js";

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

function MemberCard({ guest, isSelf, copy, onSaved }) {
  const { firstName, lastName } = resolveGuestName(guest);
  const [editing, setEditing] = useState(false);
  const [draftFirst, setDraftFirst] = useState(firstName);
  const [draftLast, setDraftLast] = useState(lastName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [uploading, setUploading] = useState(false);

  const startEdit = () => {
    setDraftFirst(firstName);
    setDraftLast(lastName);
    setMessage(null);
    setEditing(true);
  };

  const saveName = async (event) => {
    event.preventDefault();
    if (!draftFirst.trim()) {
      setMessage({ type: "error", text: copy.nameRequired });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await saveGuestName(guest, { firstName: draftFirst, lastName: draftLast }, guest.id);
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
      setMessage({ type: "error", text: copy.photoError });
    } finally {
      setUploading(false);
      event.target.value = "";
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
            <div className="form-field">
              <label htmlFor={`identity-first-${guest.id}`}>{copy.firstName}</label>
              <input
                id={`identity-first-${guest.id}`}
                type="text"
                value={draftFirst}
                onChange={(e) => setDraftFirst(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor={`identity-last-${guest.id}`}>{copy.lastName}</label>
              <input
                id={`identity-last-${guest.id}`}
                type="text"
                value={draftLast}
                onChange={(e) => setDraftLast(e.target.value)}
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
              {uploading ? copy.uploading : copy.addPhoto}
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
      </div>
    </article>
  );
}

export function IdentitySection() {
  const { t, profile } = useApp();
  const identity = t.identity || {};
  const guest = profile?.guest;
  const [refreshKey, setRefreshKey] = useState(0);

  if (!guest) return null;

  const members = getGroupMembers(guest, getActiveGuests());

  return (
    <section className="identity-section section" id="identity">
      <div className="identity-frame reveal">
        <p className="eyebrow">{identity.eyebrow}</p>
        <h2>{identity.title}</h2>
        <p className="lead">{identity.body}</p>
        <p className="identity-note">{identity.note}</p>

        <div className="identity-members" key={refreshKey}>
          {members.map((member, index) => (
            <MemberCard
              key={member.id}
              guest={member}
              isSelf={member.id === guest.id}
              copy={identity}
              onSaved={() => setRefreshKey((k) => k + 1)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
