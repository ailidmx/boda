import React, { useEffect, useState } from "react";
import { EVENT } from "../content.js";
import { useApp } from "../context/AppContext.jsx";
import { InitialsSwap } from "./ui.jsx";


function getCountdown() {
  const anchor = new Date(EVENT.weddingDate).getTime();
  const now = Date.now();
  const elapsedMs = Math.abs(anchor - now);
  const isPast = now >= anchor;

  const totalMinutes = Math.floor(elapsedMs / 60000);
  const years = Math.floor(totalMinutes / (365 * 24 * 60));
  const months = Math.floor((totalMinutes % (365 * 24 * 60)) / (30 * 24 * 60));
  const days = Math.floor((totalMinutes % (30 * 24 * 60)) / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  return { isPast, years, months, days, hours, minutes };
}

const UNITS = ["years", "months", "days", "hours", "minutes"];

export function Countdown({ contained = false }) {
  const { t } = useApp();
  const [time, setTime] = useState(getCountdown);

  useEffect(() => {
    const interval = window.setInterval(() => setTime(getCountdown()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  const prefix = time.isPast ? t.countdown.arrived : t.countdown.prefix;

  return (
    <div
      className={`countdown-bar${contained ? " countdown-bar--contained" : ""}`}
      aria-live="polite"
    >
      <span className="countdown-label">
        <InitialsSwap variant="identity-swap--countdown" />
        <span className="countdown-prefix">{prefix}</span>
      </span>
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
