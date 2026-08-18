import React from "react";

import { MXN_PER_EUR, formatPrice } from "./data.js";

// Barra de Navidad budget estimate — a "budget to plan" block that turns the
// per-night per-person rate (1,200–2,500 MXN) into a group total for the 4
// beach nights, based on how many group members rated the beach plan as
// interested (level ≥ 3).
export function CoastBudget({
  budget,
  language,
  barraMinTotal,
  barraMaxTotal,
  interestedCount,
}) {

  if (!budget?.title) return null;

  // When nobody in the group is interested in the beach plan, the estimate is
  // all zeros — hide the whole "Budget estimé" block rather than showing a
  // meaningless 0 MXN total.
  if (interestedCount === 0) return null;

  return (
    <div className="coast-budget reveal">
      <div className="section-heading">
        <p className="eyebrow">{budget.eyebrow}</p>
        <h3>{budget.title}</h3>
        <p className="coast-budget-intro">{budget.intro}</p>
      </div>

      <div className="coast-budget-figures">
        <div className="coast-budget-figure">
          <span className="coast-budget-figure__label">
            {formatPrice(1200, language)}–{formatPrice(2500, language)} MXN
          </span>
          <small>{budget.perNightPerPerson}</small>
        </div>
        <div className="coast-budget-figure">
          <span className="coast-budget-figure__label">4</span>
          <small>{budget.nights}</small>
        </div>
        <div className="coast-budget-figure">
          <span className="coast-budget-figure__label">{interestedCount}</span>
          <small>{budget.interested}</small>
        </div>

      </div>

      <div className="coast-budget-totals">
        <div className="coast-budget-total coast-budget-total--min">
          <span>{budget.minLabel}</span>
          <strong>{formatPrice(barraMinTotal, language)} MXN</strong>
          <small>≈ {formatPrice(barraMinTotal / MXN_PER_EUR, language)} €</small>
        </div>
        <div className="coast-budget-total coast-budget-total--max">
          <span>{budget.maxLabel}</span>
          <strong>{formatPrice(barraMaxTotal, language)} MXN</strong>
          <small>≈ {formatPrice(barraMaxTotal / MXN_PER_EUR, language)} €</small>
        </div>
      </div>

      <div className="coast-budget-big">
        <span>{budget.bigTotal}</span>
        <strong>
          {formatPrice(barraMinTotal, language)}–{formatPrice(barraMaxTotal, language)} MXN
        </strong>
        <small>
          ≈ {formatPrice(barraMinTotal / MXN_PER_EUR, language)}–
          {formatPrice(barraMaxTotal / MXN_PER_EUR, language)} €
        </small>
      </div>

      <p className="coast-budget-disclaimer">{budget.disclaimer}</p>
    </div>
  );
}

export default CoastBudget;
