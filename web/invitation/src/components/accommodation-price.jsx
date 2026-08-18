import React from "react";

// ── Accommodation price helpers ─────────────────────────────────────────
// Pure presentation helpers for rendering accommodation prices in MXN and EUR.
// Extracted from Accommodation.jsx so the price rendering logic is reusable and
// testable in isolation. These components render DOM only — no data access.

export const MXN_PER_EUR = 20;

export function formatPrice(amount, language) {
  const locale = language === "fr" ? "fr-FR" : language === "en" ? "en-US" : "es-MX";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(amount);
}

/* Two-line price block: line 1 shows MXN, line 2 shows EUR. When the stay is
   covered by the couple, each line shows the original price struck through
   next to the discounted price to pay (red); otherwise it shows the plain
   price. */
export function PriceLines({ original, toPay, language, showSale }) {
  return (
    <>
      <span className="accommodation-plan-line">
        {showSale && (
          <span className="accommodation-plan-original">
            {formatPrice(original, language)} MXN
          </span>
        )}
        <strong>{formatPrice(toPay, language)} MXN</strong>
      </span>
      <span className="accommodation-plan-line">
        {showSale && (
          <span className="accommodation-plan-original">
            ≈ {formatPrice(original / MXN_PER_EUR, language)} €
          </span>
        )}
        <small>≈ {formatPrice(toPay / MXN_PER_EUR, language)} €</small>
      </span>
    </>
  );
}

export function AccommodationPrice({ original, toPay, language, covered = false, coveredLabel, showSale }) {
  const isSale = showSale ?? (covered && toPay < original);
  return (
    <dd className={`accommodation-price${isSale ? " is-sale" : ""}`}>
      <span className="accommodation-price-values">
        <PriceLines
          original={original}
          toPay={toPay}
          language={language}
          showSale={isSale}
        />
      </span>
      {covered && <em>{coveredLabel}</em>}
    </dd>
  );
}

/* Price block used inside the plan card rows. When the stay is covered by the
   couple it shows the original price struck through next to the discounted
   price to pay (red); otherwise it shows the plain price. */
export function PlanPrice({ original, toPay, language, covered = false }) {
  const showSale = covered && toPay < original;
  return (
    <div className={`accommodation-plan-price${showSale ? " is-sale" : ""}`}>
      <PriceLines
        original={original}
        toPay={toPay}
        language={language}
        showSale={showSale}
      />
    </div>
  );
}
