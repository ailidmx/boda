import React from "react";
import { useApp } from "../context/AppContext.jsx";

export function Photos() {
  const { t } = useApp();
  const photos = t.photos || {};

  return (
    <section className="photos-section section" id="photos">
      <div className="photos-heading reveal">
        <h2>{photos.title}</h2>
        <p className="lead">{photos.lead}</p>
      </div>

      <div className="photos-before reveal">
        <h3>{photos.beforeTitle}</h3>
        <p>{photos.beforeBody}</p>
      </div>

      <div className="photos-during reveal">
        <h3>{photos.duringTitle}</h3>
        <p>{photos.duringBody}</p>
      </div>

      <div className="photos-upload reveal">
        <a className="button button-dark" href="#rsvp">
          {photos.upload}
        </a>
      </div>

      <p className="photos-note reveal">{photos.note}</p>
    </section>
  );
}
