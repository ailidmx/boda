import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../context/AppContext.jsx";
import { loadGenreRatings, saveGenreRating } from "../genre-ratings.js";

/**
 * Reusable 1–5 star rating widget for a single music genre in the genre survey.
 * Each signed-in guest can rate each genre once; the widget shows the live
 * average and vote count, and highlights the guest's own rating.
 *
 * Props:
 *   genreId    the stable curated genre id (e.g. "mariachi")
 *   genreName  the human-readable genre name (e.g. "Mariachi")
 *   onVote     optional callback fired after a successful save, with
 *              { genreId, rating } so a parent can react to the new rating.
 */
export function GenreVote({ genreId, genreName, onVote }) {
  const { t, profile } = useApp();
  const guestId = profile?.guest?.id;

  const [ratings, setRatings] = useState([]);
  const [myRating, setMyRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const voteLabel = t?.music?.genreVote || {};

  // Load existing ratings for this genre once the guest is known.
  useEffect(() => {
    let cancelled = false;
    if (!genreId) return undefined;
    loadGenreRatings(genreId).then((loaded) => {
      if (cancelled) return;
      setRatings(loaded);
      if (guestId) {
        const mine = loaded.find((r) => r.guestId === guestId);
        setMyRating(mine ? mine.rating : 0);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [genreId, guestId]);

  const { average, count } = useMemo(() => {
    if (!ratings.length) return { average: 0, count: 0 };
    const sum = ratings.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    return { average: sum / ratings.length, count: ratings.length };
  }, [ratings]);

  const handleRate = useCallback(
    async (rating) => {
      if (!guestId) return;
      if (saving) return;
      setSaving(true);
      setError("");
      try {
        await saveGenreRating({ genreId, genreName, guestId, rating });
        setMyRating(rating);
        // Refresh the aggregate from Firestore so the average/count update.
        const loaded = await loadGenreRatings(genreId);
        setRatings(loaded);
        // Let a parent react to the new rating.
        onVote?.({ genreId, rating });
      } catch (err) {
        console.warn("[GenreVote] save failed", err);
        setError(voteLabel.error || "Could not save your rating");
      } finally {
        setSaving(false);
      }
    },
    [genreId, genreName, guestId, saving, voteLabel.error, onVote],
  );

  if (!guestId) return null;

  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="genre-vote">
      <div className="genre-vote__stars" role="radiogroup" aria-label={voteLabel.label || "Rate this genre"}>
        {stars.map((value) => {
          const filled = (hover || myRating) >= value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={myRating === value}
              aria-label={`${value} ${voteLabel.star || "star"}`}
              className={`genre-vote__star${filled ? " is-filled" : ""}`}
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

      <div className="genre-vote__meta">
        {count > 0 ? (
          <span className="genre-vote__average">
            {average.toFixed(1)} <span aria-hidden="true">★</span>
            <span className="genre-vote__count">
              ({count} {count === 1 ? voteLabel.vote : voteLabel.votes})
            </span>
          </span>
        ) : (
          <span className="genre-vote__empty">{voteLabel.empty || "Be the first to rate"}</span>
        )}
        {myRating > 0 && (
          <span className="genre-vote__mine">
            {voteLabel.yourRating || "Your rating"}: {myRating}
          </span>
        )}
      </div>

      {error && <p className="genre-vote__error">{error}</p>}
    </div>
  );
}
