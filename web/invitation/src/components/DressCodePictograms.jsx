import React from "react";

/* ── Dress-code pictogram gallery ───────────────────────────────────────
   A playful set of SVG pictograms that illustrate the dress code at a
   glance: the colours to avoid (crossed out) and the colours to embrace
   (green, colourful, Mexican patterns). */

const T_SHIRT = "M22 6 L8 20 L18 28 L18 58 L46 58 L46 28 L56 20 L42 6 L34 14 L32 12 L30 14 Z";
const DRESS = "M24 8 L20 20 L28 24 L28 58 L36 58 L36 24 L44 20 L40 8 L32 16 Z";

/* The red "no" symbol: a circle with a diagonal slash. */
function NoSymbol({ x = 32, y = 32, r = 15 }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="none" stroke="#d64545" strokeWidth="3.5" />
      <line
        x1={x - r * 0.7}
        y1={y + r * 0.7}
        x2={x + r * 0.7}
        y2={y - r * 0.7}
        stroke="#d64545"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </g>
  );
}

function TShirt({ fill, stroke = "#3a3a3a", strokeWidth = 1.5, children }) {
  return (
    <svg viewBox="0 0 64 64" className="dp-icon" aria-hidden="true">
      <path d={T_SHIRT} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
      {children}
    </svg>
  );
}

function Dress({ fill, stroke = "#3a3a3a", strokeWidth = 1.5, children }) {
  return (
    <svg viewBox="0 0 64 64" className="dp-icon" aria-hidden="true">
      <path d={DRESS} fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" />
      {children}
    </svg>
  );
}

/* Mexican traditional pattern: a small repeating geometric motif. */
function MexicanPattern() {
  return (
    <g fill="none" stroke="#c0392b" strokeWidth="1.6" strokeLinecap="round">
      <path d="M26 34 l3 -3 l3 3 l-3 3 Z" />
      <path d="M35 34 l3 -3 l3 3 l-3 3 Z" />
      <path d="M26 43 l3 -3 l3 3 l-3 3 Z" />
      <path d="M35 43 l3 -3 l3 3 l-3 3 Z" />
      <path d="M30.5 38 l1.5 -1.5 l1.5 1.5 l-1.5 1.5 Z" fill="#e67e22" stroke="none" />
    </g>
  );
}

/* Funky multi-colour: a few colourful stripes across the chest. */
function FunkyStripes() {
  return (
    <g>
      <rect x="20" y="34" width="24" height="4" rx="1.5" fill="#e74c3c" />
      <rect x="20" y="40" width="24" height="4" rx="1.5" fill="#f1c40f" />
      <rect x="20" y="46" width="24" height="4" rx="1.5" fill="#2ecc71" />
    </g>
  );
}

const pictograms = [
  { key: "no-white", label: "noWhite", render: () => <TShirt fill="#f7f7f7"><NoSymbol /></TShirt> },
  { key: "no-black", label: "noBlack", render: () => <TShirt fill="#2b2b2b"><NoSymbol /></TShirt> },
  { key: "no-grey", label: "noGrey", render: () => <TShirt fill="#9a9a9a"><NoSymbol /></TShirt> },
  { key: "color-green", label: "colorGreen", render: () => <TShirt fill="#2e8b57" /> },
  { key: "color-teal", label: "colorTeal", render: () => <TShirt fill="#1f8a9e" /> },
  { key: "color-marigold", label: "colorMarigold", render: () => <TShirt fill="#d9a441" /> },
  { key: "dress-no-white", label: "dressNoWhite", render: () => <Dress fill="#f7f7f7"><NoSymbol /></Dress> },
  { key: "dress-no-black", label: "dressNoBlack", render: () => <Dress fill="#2b2b2b"><NoSymbol /></Dress> },
  { key: "dress-no-grey", label: "dressNoGrey", render: () => <Dress fill="#9a9a9a"><NoSymbol /></Dress> },
  { key: "dress-color", label: "dressColor", render: () => <Dress fill="#c0392b" /> },
  { key: "funky", label: "funky", render: () => <TShirt fill="#fdf6e3"><FunkyStripes /></TShirt> },
  { key: "mexican", label: "mexican", render: () => <TShirt fill="#fdf6e3"><MexicanPattern /></TShirt> },
];

export function DressCodePictograms({ labels }) {
  return (
    <div className="dp-gallery" role="list" aria-label={labels?.ariaLabel || "Dress code pictograms"}>
      {pictograms.map((p) => (
        <figure className="dp-card" role="listitem" key={p.key}>
          {p.render()}
          <figcaption className="dp-label">{labels?.[p.label] || p.key}</figcaption>
        </figure>
      ))}
    </div>
  );
}
