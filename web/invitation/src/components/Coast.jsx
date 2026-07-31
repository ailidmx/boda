import React from "react";
import { useApp } from "../context/AppContext.jsx";

function optionsMarkup(options) {
  return (options || []).map((option) => (
    <option value={option.value} key={option.value}>
      {option.label}
    </option>
  ));
}

export function Coast() {
  const { t } = useApp();
  const coast = t.coast || {};
  const form = coast.form || {};

  return (
    <section className="coast-section section" id="after">
      <div className="coast-copy reveal">
        <p className="eyebrow">{coast.eyebrow}</p>
        <h2>{coast.title}</h2>
        <p className="lead">{coast.body}</p>
        <div className="coast-ideas">
          {coast.plans.map((plan, index) => (
            <article key={index}>
              <strong>{plan.title}</strong>
              <span>{plan.body}</span>
            </article>
          ))}
        </div>
        <p className="coast-note">{coast.note}</p>
      </div>
      <div className="coast-form-wrap reveal">
        <p className="eyebrow">{form.eyebrow}</p>
        <h3>{form.title}</h3>
        <p>{form.body}</p>
        <form
          className="coast-form"
          data-form-kind="coast"
          aria-describedby="coast-preview-note"
        >
          <div className="form-field">
            <label htmlFor="coast-name">{form.fields.name}</label>
            <input
              id="coast-name"
              name="name"
              type="text"
              autoComplete="name"
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="coast-interest">{form.fields.interest}</label>
            <select id="coast-interest" name="interest">
              {optionsMarkup(form.options.interest)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="coast-party-size">{form.fields.partySize}</label>
            <input
              id="coast-party-size"
              name="partySize"
              type="number"
              min="1"
              max="20"
              defaultValue="1"
            />
          </div>
          <div className="form-field">
            <label htmlFor="coast-plan">{form.fields.plan}</label>
            <select id="coast-plan" name="plan">
              {optionsMarkup(form.options.plan)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="coast-destination">{form.fields.destination}</label>
            <select id="coast-destination" name="destination">
              {optionsMarkup(form.options.destination)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="coast-style">{form.fields.style}</label>
            <select id="coast-style" name="style">
              {optionsMarkup(form.options.style)}
            </select>
          </div>
          <div className="form-field form-field-wide">
            <label htmlFor="coast-note">{form.fields.note}</label>
            <textarea id="coast-note" name="note" rows="3" />
          </div>
          <button className="button button-dark" type="submit">
            {form.button}
          </button>
          <small id="coast-preview-note" data-form-status>
            {form.previewNote}
          </small>
        </form>
      </div>
    </section>
  );
}
