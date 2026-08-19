import React, { useEffect, useRef, useState } from "react";

import { useApp } from "../context/AppContext.jsx";
import { getActiveGuests } from "../guests.js";
import {
  getGroupMembers,
  resolveGuestInvitationGroup,
  saveIdentityCheckPassed,
  subscribeGuestsCache,
} from "../guest-profiles.js";
import { getGroupTag } from "../invitation-profile.js";

import { CoupleNames } from "./ui.jsx";
import { Dialog } from "./ui/Dialog.jsx";
import { MemberCard, MemberTabs } from "../features/identity/index.js";

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
  // Bumped whenever the live `guests` cache updates while the modal is open.
  // The group-scoped onSnapshot in loadGuestProfiles() is asynchronous: right
  // after sign-in it may deliver only the signed-in guest's record, then a
  // moment later the rest of the group. `members` is computed at render time
  // from getActiveGuests(), so without this tick the modal would render only
  // the first record and never show the other group members (e.g. Karla when
  // Fred signs in). Subscribing to cache updates forces a re-render once the
  // full group is available.
  const [cacheTick, setCacheTick] = useState(0);
  // Randomly pick which name order to show on open (David left / Aydé right,
  // or the reverse), then keep it static — no crossing animation.
  const [nameOrder] = useState(() =>
    Math.random() < 0.5 ? "primary" : "secondary",
  );
  // Ref to the scrollable list of member cards, used by the badge selector to
  // scroll the selected member into view.
  const listRef = useRef(null);
  const tabsRef = useRef(null);
  // Ref to the scrollable modal body. When the modal opens with several
  // members, the browser can render it scrolled to the bottom; we reset it to
  // the top once everything is laid out.
  const bodyRef = useRef(null);


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

  // Initialize active member once when the modal is shown.
  useEffect(() => {
    if (!identityPrompt || !guest?.id) return;
    setActiveId(guest.id);
  }, [identityPrompt, guest?.id]);

  // Re-render when the live `guests` cache updates while the modal is open.
  // The group-scoped onSnapshot in loadGuestProfiles() is asynchronous: right
  // after sign-in it may deliver only the signed-in guest's record, then a
  // moment later the rest of the group. `members` is computed at render time
  // from getActiveGuests(), so without this subscription the modal would show
  // only the first record and never reveal the other group members (e.g. Karla
  // when Fred signs in). Bumping `cacheTick` forces a re-render once the full
  // group is available.
  useEffect(() => {
    if (!identityPrompt || !guest?.id) return undefined;
    return subscribeGuestsCache(() => setCacheTick((t) => t + 1));
  }, [identityPrompt, guest?.id]);

  // When the modal opens with several members, the browser can render the
  // scrollable body already scrolled to the bottom (the last member card is
  // focused/active). After all elements are laid out we reset the scroll
  // position back to the top so the guest always starts at the first member.
  useEffect(() => {
    if (!identityPrompt || !guest?.id) return;
    const body = bodyRef.current;
    if (!body) return;
    // Double requestAnimationFrame guarantees the DOM is fully painted and
    // laid out (member cards, tabs, avatars) before we touch scrollTop.
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        console.log("[IdentityModal] resetting modal body scroll to top");
        console.log(
          `[IdentityModal] before: scrollTop=${body.scrollTop}, scrollHeight=${body.scrollHeight}, clientHeight=${body.clientHeight}`,
        );
        body.scrollTop = 0;
        console.log(
          `[IdentityModal] after: scrollTop=${body.scrollTop}`,
        );
      });
      return raf2;
    });
    return () => cancelAnimationFrame(raf1);
  }, [identityPrompt, guest?.id]);

  if (!identityPrompt || !guest) return null;


  const members = getGroupMembers(guest, getActiveGuests());
  const activeMember = members.find((m) => m.id === activeId) || guest;
  const invitationGroup =
    resolveGuestInvitationGroup(guest) ||
    guest.invitationGroup ||
    guest.group ||
    "";
  const invitationGroupLabel = invitationGroup
    ? getGroupTag(invitationGroup).label || invitationGroup
    : "";
  const identityTitle =
    members.length > 1
      ? (identity.titleGroup || identity.title || "").replace(
          "{count}",
          String(members.length),
        )
      : identity.titleSingle || identity.title || "";

  const handleConfirm = async () => {
    setSaving(true);
    setFooterMessage(null);
    try {
      // Confirming the identity check acknowledges it for the WHOLE invitation
      // group, so the modal won't pop up again for any member. The signed-in
      // guest is allowed to write `idCheckUser` for every member of their own
      // group (enforced by the Firestore rules).
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
    <Dialog
      open={!!identityPrompt}
      onClose={dismissIdentityPrompt}
      ariaLabelledBy="identity-modal-title"
      closeLabel={identity.cancel}
      overlayClassName="identity-modal-overlay"
      cardClassName="identity-modal-card"
      closeClassName="identity-modal-close"
    >
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
            <p
              className="identity-group-badge"
              aria-label={identity.membersLabel || "Invitation group"}
            >
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
        <div className="identity-modal-body" ref={bodyRef}>

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
              {saving ? identity.saving : identity.confirm || identity.ok}
            </button>
          </div>
        </div>
    </Dialog>
  );
}
