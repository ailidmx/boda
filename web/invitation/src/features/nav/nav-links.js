import { trackAction, ACTION_TYPES } from "../../analytics.js";
import { dispatchNavigate } from "../../hooks/usePageViewTracking.js";

// Dispatch a navigation event (so the page-view tracker attributes the cause)
// and log a categorized navigation action. `sectionId` is the target section
// id; `navigationType` is how the guest navigated (nav / side_drawer /
// mobile_menu / fab).
export function trackNav(sectionId, navigationType = "nav") {
  dispatchNavigate({ sectionId, navigationType });
  trackAction(ACTION_TYPES.NAVIGATION, `nav.${sectionId}`, {
    section_id: sectionId,
    navigation_type: navigationType,
  });
}

// A nav entry is either a flat `[key, href]` tuple or a parent object
// `{ key, href, children: [[key, href], ...] }`. Parents render as a dropdown
// trigger in the desktop nav and as an expandable group in the drawer/mobile
// menus; their `children` are the in-page subsections.
//
// The full ordered list of nav links. The FLIGHTS ("travel") entry is only
// relevant for guests who travel by plane, so it is filtered out for everyone
// else (see getNavLinks below).
export const NAV_LINKS = [
  ["home", "#top"],
  ["story", "#story"],

  ["venue", "#venue"],
  ["weekend", "#weekend"],
  ["tematica", "#attire"],
  ["dressCode", "#dress-code"],

  ["weather", "#weather"],

  ["programme", "#weekend-program"],
  ["teAnimas", "#te-animas"],
  ["travel", "#travel"],
  ["accommodation", "#accommodation"],
  ["petanque", "#petanque"],

  // FOOD groups the food section, the guisos ranking, the guisos order panel
  // and the food comment box under one dropdown.
  {
    key: "food",
    href: "#food",
    children: [
      ["food", "#food"],
      ["guisos", "#guisos"],
      ["guisosOrder", "#guisos-order"],
      ["foodComment", "#food-comment"],
    ],
  },

  // MUSIC groups the live-music, song-request, playlist and "your tastes"
  // subsections, in the order they appear on the page.
  {
    key: "music",
    href: "#music",
    children: [
      ["musicLive", "#music-live"],
      ["songRequest", "#song-request"],
      ["musicPlaylist", "#music-playlist"],
      ["musicTastes", "#music-tastes"],
    ],
  },

  // COAST ("Et après ?") groups the intro, the extra-stay plan, the Barra de
  // Navidad suggestions, the mini RSVP and the beach budget under one dropdown,
  // in the order they appear on the page.
  {
    key: "coast",
    href: "#after",
    children: [
      ["coastIntro", "#after-intro"],
      ["coastPlan", "#after-plan"],
      ["coastBarra", "#after-barra"],
      ["coastRsvp", "#after-rsvp"],
      ["coastBudget", "#after-budget"],
    ],
  },

  ["rsvp", "#rsvp"],
  ["gift", "#gift"],
  ["photos", "#photos"],
  ["guests", "#guests"],
  ["thanks", "#thanks"],
];

// Resolve the effective nav links for the signed-in guest. The FLIGHTS
// ("travel") link is hidden for guests who do not travel by plane, matching
// the section being removed from the DOM.
export function getNavLinks(travelsByPlane) {
  return travelsByPlane
    ? NAV_LINKS
    : NAV_LINKS.filter((entry) => {
        const key = Array.isArray(entry) ? entry[0] : entry.key;
        return key !== "travel";
      });
}

// Flatten the hierarchical nav into `[key, href]` tuples (parents first, then
// their children). Used by the desktop nav scroll-spy and underline so they
// can resolve every anchor, including the subsection anchors.
export function flattenNavLinks(links) {
  const flat = [];
  for (const entry of links) {
    if (Array.isArray(entry)) {
      flat.push(entry);
    } else {
      flat.push([entry.key, entry.href]);
      for (const child of entry.children) flat.push(child);
    }
  }
  return flat;
}

// Build a map of section id → nav key. Subsection anchors map to their PARENT
// key so the scroll-spy highlights the parent (e.g. "music") while the guest
// is inside any music subsection.
export function buildSectionKeyMap(links) {
  const map = {};
  for (const entry of links) {
    if (Array.isArray(entry)) {
      const [key, href] = entry;
      map[href.slice(1)] = key;
    } else {
      map[entry.href.slice(1)] = entry.key;
      for (const [childKey, childHref] of entry.children) {
        map[childHref.slice(1)] = entry.key;
      }
    }
  }
  return map;
}

// Mobile navigation: two split dropdowns (Part I = main invitation sections,
// Part II = travel and everything after). Part I always ends at "teAnimas".
// Part II starts at the first link after it — normally "travel", but when the
// guest does not travel by plane (and the FLIGHTS link is hidden) it starts at
// "petanque" instead.
export const PART_I_END = "teAnimas";
