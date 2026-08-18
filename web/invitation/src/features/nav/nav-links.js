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
  ["food", "#food"],
  ["guisos", "#guisos"],
  ["music", "#music"],
  ["coast", "#after"],
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
    : NAV_LINKS.filter(([key]) => key !== "travel");
}

// Mobile navigation: two split dropdowns (Part I = main invitation sections,
// Part II = travel and everything after). Part I always ends at "teAnimas".
// Part II starts at the first link after it — normally "travel", but when the
// guest does not travel by plane (and the FLIGHTS link is hidden) it starts at
// "petanque" instead.
export const PART_I_END = "teAnimas";
