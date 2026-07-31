import React, { useEffect, useState } from "react";
import { EVENT } from "../content.js";
import { useApp } from "../context/AppContext.jsx";

function getTimeUntilWedding() {
  const anchor = new Date(EVENT.weddingDate).getTime();
  const now = Date.now();
  const remainingMs = Math.max(0, anchor - now);

  const totalMinutes = Math.floor(remainingMs / 60000);
  const years = Math.floor(totalMinutes / (365 * 24 * 60));
  const months = Math.floor((totalMinutes % (365 * 24 * 60)) / (30 * 24 * 60));
  const days = Math.floor((totalMinutes % (30 * 24 * 60)) / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  return { years, months, days, hours, minutes };
}

const UNITS = ["years", "months", "days", "hours", "minutes"];

export function Countdown() {
  const { t, profile } = useApp();
  const [time, setTime] = useState(getTimeUntilWedding);

  useEffect(() => {
    const interval = window.setInterval(() => setTime(getTimeUntilWedding()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  const guest = profile?.guest;

  return (
    <div className="countdown-bar" aria-live="polite">
      {guest && (
        <span className="countdown-guest">
          {guest.firstName} {guest.lastName}
        </span>
      )}
      <span className="countdown-prefix">{t.countdown.prefix}</span>
      <div className="countdown-values">
        {UNITS.map((unit) => (
          <span className="countdown-unit" key={unit}>
            <strong data-countdown={unit}>
              {String(time[unit]).padStart(2, "0")}
            </strong>
            <small>{t.countdown[unit]}</small>
          </span>
        ))}
      </div>
    </div>
  );
}
