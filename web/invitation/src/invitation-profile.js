/**
 * invitation-profile.js — group-level custom content and tag helpers for the
 * signed-in guest's OWN invitation group.
 *
 * The invitation-code system (profile codes / per-guest codes) was removed:
 * login is now email/password and guest data is sourced from the live
 * Firestore `guests` cache. This module only handles the group-level content
 * that is scoped to the authenticated guest's own invitation group.
 */

import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { collections } from "../../shared/firestore-paths.js";

// ── Group-level custom content cache ──────────────────────────────────

/** @type {Map<string, Object>} */
const groupContentCache = new Map();

/**
 * Full group data cache (includes tag, customContent, etc.).
 * @type {Map<string, Object>}
 */
const groupDataCache = new Map();

function logDb(event, detail) {
  console.log(`[db][invitation-profile][${event}]`, detail);
}

/**
 * Load custom content for the signed-in guest's OWN invitation group from
 * Firestore. The Firestore rules scope reads to the guest's own group, so
 * this must be called with the guest's invitationGroup (resolved from their
 * own guest document after authentication).
 *
 * @param {string} invitationGroup - the signed-in guest's invitation group
 * @returns {Promise<void>}
 */
export async function loadGroupCustomContent(invitationGroup) {
  try {
    if (!invitationGroup) {
      console.warn("[invitation] No invitationGroup provided; skipping group content load");
      return;
    }
    // Read only the guest's own group document (document ID = group name).
    // This matches the Firestore rule: a guest may only read their own group.
    const ref = doc(db, collections.invitationGroups, invitationGroup);

    logDb("read:start", { collection: collections.invitationGroups, docId: invitationGroup, op: "getDoc" });
    const snapshot = await getDoc(ref);
    if (snapshot.exists()) {
      const data = snapshot.data();
      // Store full data
      groupDataCache.set(snapshot.id, data);
      // Store customContent separately for backward compat
      if (data.customContent) {
        groupContentCache.set(snapshot.id, data.customContent);
      }
      logDb("read:success", { collection: collections.invitationGroups, docId: snapshot.id, op: "getDoc", data });
      console.log(`[invitation] Loaded group custom content for "${snapshot.id}"`);
    } else {
      logDb("read:empty", { collection: collections.invitationGroups, docId: invitationGroup, op: "getDoc" });
      console.log(`[invitation] No group content found for "${invitationGroup}"`);
    }
  } catch (error) {
    logDb("read:error", { collection: collections.invitationGroups, docId: invitationGroup, op: "getDoc", error: error.message });
    console.warn("[invitation] Could not load group custom content", error.message);
  }
}

/**
 * Get custom content for a guest profile.
 * Merges group-level content (from invitation_groups collection) with
 * per-guest content (per-guest overrides group-level).
 *
 * Returns an object with optional greeting, message, section, and hideSections,
 * or null if no custom content exists at any level.
 *
 * @param {Object} profile - the guest profile (with `guest` populated)
 * @returns {Object|null}
 */
export function getCustomContent(profile) {
  if (!profile?.guest) return null;

  const groupName = profile.guest.invitationGroup || profile.guest.group;
  const groupContent = groupName ? groupContentCache.get(groupName) : null;
  const guestContent = profile.guest.customContent;

  // If neither exists, return null
  if (!groupContent && !guestContent) return null;

  // Merge: guest overrides group
  const merged = { ...(groupContent || {}) };
  if (guestContent) {
    // Deep merge: each field from guest overrides group
    if (guestContent.greeting !== undefined) merged.greeting = guestContent.greeting;
    if (guestContent.message !== undefined) merged.message = guestContent.message;
    if (guestContent.section !== undefined) merged.section = guestContent.section;
    if (guestContent.hideSections !== undefined) merged.hideSections = guestContent.hideSections;
  }

  return merged;
}

/**
 * Get the group-level custom content cache (for debugging / dashboard).
 * @returns {Map<string, Object>}
 */
export function getGroupContentCache() {
  return groupContentCache;
}

/**
 * Get tag styling for a group name.
 * Looks up the group in the invitation_groups cache and returns
 * { color, textColor, label } or a default.
 *
 * @param {string} groupName
 * @returns {{ color: string, textColor: string, label: string }}
 */
export function getGroupTag(groupName) {
  if (!groupName) {
    return { color: "#55452d", textColor: "#ffffff", label: groupName || "" };
  }
  const group = groupDataCache.get(groupName);
  if (group?.tag) {
    return {
      color: group.tag.color || "#55452d",
      textColor: group.tag.textColor || "#ffffff",
      label: group.tag.label || groupName,
    };
  }
  return { color: "#55452d", textColor: "#ffffff", label: groupName };
}
