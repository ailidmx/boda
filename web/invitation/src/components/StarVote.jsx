import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { loadCardVotes, saveCardVote } from "../card-votes.js";

/**
 * Reusable 1–5 star rating widget for experience cards (food flavours and
 * music acts). Each signed-in guest can rate each card once; the widget shows
 * the live average and vote count, and highlights the guest's own rating.
 *
 * Props:
 *   cardType  "food" | "music"
 *   cardKey   the flavour key (e.g. "carnitas") or act name
 *   onVote    optional callback fired after a successful save, with
 *             { cardKey, rating } so a parent can react to the new rating.
 */
export function StarVote({ cardType, cardKey, onVote }) {

  const { t, profile } = useApp();
  const guestId = profile?.guest?.id;

  const [votes, setVotes] = useState([]);
  const [myRating, setMyRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const voteLabel = t?.food?.vote || {};


  // Load existing votes for this card once the guest is known.
  useEffect(() => {
    let cancelled = false;
    if (!cardType || !cardKey) return undefined;
    loadCardVotes(cardType, cardKey).then((loaded) => {
      if (cancelled) return;
      setVotes(loaded);
      if (guestId) {
        const mine = loaded.find((v) => v.guestId === guestId);
        setMyRating(mine ? mine.rating : 0);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cardType, cardKey, guestId]);

  const { average, count } = useMemo(() => {
    if (!votes.length) return { average: 0, count: 0 };
    const sum = votes.reduce((acc, v) => acc + (Number(v.rating) || 0), 0);
    return { average: sum / votes.length, count: votes.length };
  }, [votes]);

  const handleRate = useCallback(
    async (rating) => {
      if (!guestId) return;
      if (saving) return;
      setSaving(true);
      setError("");
      try {
        await saveCardVote({ cardType, cardKey, guestId, rating });
        setMyRating(rating);
        // Refresh the aggregate from Firestore so the average/count update.
        const loaded = await loadCardVotes(cardType, cardKey);
        setVotes(loaded);
        // Let a parent (e.g. the guisos reorder panel) react to the new rating.
        onVote?.({ cardKey, rating });
      } catch (err) {
        console.warn("[StarVote] save failed", err);
        setError(voteLabel.error || "Could not save your rating");
      } finally {
        setSaving(false);
      }
    },
    [cardType, cardKey, guestId, saving, voteLabel.error, onVote],
  );


  if (!guestId) return null;

  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="star-vote">
      <div className="star-vote__stars" role="radiogroup" aria-label={voteLabel.label || "Rate this"}>
        {stars.map((value) => {
          const filled = (hover || myRating) >= value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={myRating === value}
              aria-label={`${value} ${voteLabel.star || "star"}`}
              className={`star-vote__star${filled ? " is-filled" : ""}`}
              disabled={saving}
              onMouseEnter={() => setHover(value)}
              onMouseLeave={() => setHover(0)}
              onClick={() => handleRate(value)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 2l2.9 6.26 6.6.72-4.9 4.5 1.32 6.52L12 16.9 6.08 20l1.32-6.52-4.9-4.5 6.6-.72z" />
              </svg>
            </button>
          );
        })}
      </div>

      <div className="star-vote__meta">
        {count > 0 ? (
          <span className="star-vote__average">
            {average.toFixed(1)} <span aria-hidden="true">★</span>
            <span className="star-vote__count">
              ({count} {count === 1 ? voteLabel.vote : voteLabel.votes})
            </span>
          </span>
        ) : (
          <span className="star-vote__empty">{voteLabel.empty || "Be the first to rate"}</span>
        )}
        {myRating > 0 && (
          <span className="star-vote__mine">
            {voteLabel.yourRating || "Your rating"}: {myRating}
          </span>
        )}
      </div>

      {error && <p className="star-vote__error">{error}</p>}
    </div>
  );
}
