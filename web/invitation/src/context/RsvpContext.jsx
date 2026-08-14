import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { saveRsvpAnswers } from "../rsvp-responses.js";
import { useApp } from "./AppContext.jsx";
import {
  getGroupMembers,
  resolveLiveGuest,
  subscribeGuestsCache,
} from "../guest-profiles.js";
import { getActiveGuests } from "../guests.js";

/**
 * Shared RSVP state.
 *
 * The invitation has several RSVP flows — "Ça te tente" (TeAnimas), the
 * pétanque mini-RSVP, and "Et après ?" (Coast) — plus a final RSVP form that
 * repeats the same questions. All of them must read and write the SAME data so
 * that editing one updates the others, and so that saving to Firestore writes
 * to the same `rsvp.answers` slots on each guest document.
 *
 * This context is the single source of truth for:
 *   - `answers`   questionId → { guestId → level }  (all flows, one map)
 *   - `progress`  per-flow completion state: "pending" (still at step 1,
 *                 invited to select) or "resume" (all steps passed, invited to
 *                 check/correct). The final RSVP cannot be submitted until
 *                 every flow is "resume".
 *
 * Each flow component reads `answers`/`setAnswer` for its questions, calls
 * `markResume(flow)` when its FlipStepCard reaches the recap step, and calls
 * `saveFlow(flow, questions, guests, editorGuestId)` to persist.
 */

export const RSVP_FLOWS = {
  teAnimas: "teAnimas",
  petanque: "petanque",
  coast: "coast",
};

const INITIAL_PROGRESS = {
  [RSVP_FLOWS.teAnimas]: "pending",
  [RSVP_FLOWS.petanque]: "pending",
  [RSVP_FLOWS.coast]: "pending",
};

const RsvpContext = createContext(null);

export function RsvpProvider({ children }) {
  const { profile } = useApp();
  // answers: questionId → { guestId → level }
  const [answers, setAnswers] = useState({});
  // progress: flow → "pending" | "resume"
  const [progress, setProgress] = useState(INITIAL_PROGRESS);
  // editedFlows: flow → true once the user has edited an answer in that flow.
  // Used to distinguish a flow that was completed but reloaded (still "done")
  // from a flow the user has actively edited (should show "En attente" until
  // they re-confirm by reaching the recap / saving).
  const [editedFlows, setEditedFlows] = useState({});

  // Tracks whether the user has started editing answers. Once they have, we
  // stop re-hydrating from the live cache so an in-progress edit is never
  // overwritten by a background cache update.
  const hasUserEdited = useRef(false);

  // Build the answers map from the live `guests` cache for the signed-in
  // guest's group. Each group member's saved `rsvp.answers` (questionId →
  // level) is read from their live record.
  const hydrateAnswers = useCallback(() => {
    const guest = profile?.guest;
    if (!guest) return;
    const members = getGroupMembers(guest, getActiveGuests());
    const initial = {};
    members.forEach((member) => {
      const live = resolveLiveGuest(member);
      const memberAnswers = live?.rsvp?.answers;
      if (!memberAnswers) return;
      Object.entries(memberAnswers).forEach(([questionId, level]) => {
        if (level === undefined || level === null) return;
        initial[questionId] = {
          ...(initial[questionId] || {}),
          [member.id]: level,
        };
      });
    });
    setAnswers(initial);
  }, [profile?.guest]);

  // Hydrate once the signed-in guest's profile is available. The `guests`
  // collection is kept in sync by `loadGuestProfiles()` (an onSnapshot
  // listener), so each group member's saved `rsvp.answers` is in the cache.
  // Without this, the RSVP scale questions would start empty on every reload
  // even though the answers were persisted to Firestore.
  useEffect(() => {
    if (!profile?.guest) return;
    hasUserEdited.current = false;
    hydrateAnswers();
  }, [hydrateAnswers]);

  // The onSnapshot listener in loadGuestProfiles() is asynchronous: it may not
  // have populated the live cache by the time the profile is set above, so the
  // first hydration can miss the saved answers. Subscribe to cache updates and
  // re-hydrate once the live records are actually available (and only while the
  // user has not started editing).
  useEffect(() => {
    if (!profile?.guest) return undefined;
    return subscribeGuestsCache(() => {
      if (hasUserEdited.current) return;
      hydrateAnswers();
    });
  }, [profile?.guest, hydrateAnswers]);

  const setAnswer = useCallback((questionId, guestId, level, flow) => {
    hasUserEdited.current = true;
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || {}),
        [guestId]: level,
      },
    }));
    // Editing an answer invalidates the flow's "done" state: reset it to
    // "pending" so the RSVP progress checklist shows "En attente" until the
    // guest re-confirms (reaches the recap / saves). The flow is optional so
    // callers that don't know their flow can omit it.
    if (flow) {
      setProgress((prev) =>
        prev[flow] === "pending" ? prev : { ...prev, [flow]: "pending" },
      );
      // Remember that the user actively edited this flow. This lets the RSVP
      // progress checklist distinguish a flow that was completed but reloaded
      // (still "done") from one the user has edited (shows "En attente" until
      // they re-confirm).
      setEditedFlows((prev) => (prev[flow] ? prev : { ...prev, [flow]: true }));
    }
  }, []);



  const markResume = useCallback((flow) => {
    setProgress((prev) => (prev[flow] === "resume" ? prev : { ...prev, [flow]: "resume" }));
  }, []);

  const resetFlow = useCallback((flow) => {
    setProgress((prev) => (prev[flow] === "pending" ? prev : { ...prev, [flow]: "pending" }));
  }, []);

  /**
   * Persist a flow's answers for every guest in the group to Firestore.
   * Returns a promise that resolves to "saved" or rejects with the error.
   */
  const saveFlow = useCallback(
    async ({ flow, questions, guests, editorGuestId }) => {
      if (!editorGuestId) throw new Error("No editor guest id");
      await Promise.all(
        guests.map((guest) => {
          const guestAnswers = {};
          questions.forEach((q) => {
            const level = answers[q.id]?.[guest.id];
            if (level !== undefined) guestAnswers[q.id] = level;
          });
          return saveRsvpAnswers(guest, guestAnswers, editorGuestId);
        }),
      );
      markResume(flow);
      return "saved";
    },
    [answers, markResume],
  );

  const value = useMemo(
    () => ({
      answers,
      setAnswer,
      progress,
      editedFlows,
      markResume,
      resetFlow,
      saveFlow,
    }),
    [answers, setAnswer, progress, editedFlows, markResume, resetFlow, saveFlow],
  );


  return <RsvpContext.Provider value={value}>{children}</RsvpContext.Provider>;
}

export function useRsvp() {
  const ctx = useContext(RsvpContext);
  if (!ctx) throw new Error("useRsvp must be used within an RsvpProvider");
  return ctx;
}
