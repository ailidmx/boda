#!/usr/bin/env node
/**
 * Airbnb availability scraper.
 *
 * A simple web scraper that checks Airbnb availability for a given area,
 * date range and number of guests. It fetches the Airbnb search page and
 * parses the JSON that Airbnb embeds in the page (`data-deferred-state-0`),
 * then prints a compact summary of the listings found.
 *
 * Usage:
 *   node scripts/airbnb-scraper.mjs [options]
 *
 * Options:
 *   --area <name>      Search area (default: "Jocotepec, Jalisco")
 *   --checkin <date>   Check-in date  YYYY-MM-DD (default: 2027-02-19)
 *   --checkout <date>  Check-out date YYYY-MM-DD (default: 2027-02-21)
 *   --guests <n>       Number of guests (default: 2)
 *   --limit <n>        Max listings to print (default: 10)
 *   --json             Print raw JSON instead of a summary table
 *
 * Each listing includes its primary photo URL (when available) so the results
 * can be used to build image cards.
 *
 * Examples:
 *   node scripts/airbnb-scraper.mjs --area "Barra de Navidad" \
 *     --checkin 2027-02-23 --checkout 2027-02-28 --guests 4
 *
 * Note: Airbnb may block automated requests. If the page cannot be parsed,
 * the script reports the HTTP status and exits gracefully.
 */

import { parseArgs } from "node:util";

const DEFAULTS = {
  area: "Jocotepec, Jalisco",
  checkin: "2027-02-19",
  checkout: "2027-02-21",
  guests: 2,
  limit: 10,
};

function readArgs() {
  const { values } = parseArgs({
    options: {
      area: { type: "string" },
      checkin: { type: "string" },
      checkout: { type: "string" },
      guests: { type: "string" },
      limit: { type: "string" },
      json: { type: "boolean", default: false },
    },
  });
  return {
    area: values.area || DEFAULTS.area,
    checkin: values.checkin || DEFAULTS.checkin,
    checkout: values.checkout || DEFAULTS.checkout,
    guests: Number(values.guests) || DEFAULTS.guests,
    limit: Number(values.limit) || DEFAULTS.limit,
    json: values.json,
  };
}

function buildSearchUrl({ area, checkin, checkout, guests }) {
  const params = new URLSearchParams({
    check_in: checkin,
    check_out: checkout,
    adults: String(guests),
    room_types: ["Entire home/apt", "Private room"].join(","),
    search_mode: "regular_search",
    locale: "fr",
    currency: "MXN",
  });
  return `https://www.airbnb.fr/s/${encodeURIComponent(area)}/homes?${params.toString()}`;
}

function extractDeferredState(html) {
  // Airbnb embeds the search results as JSON inside a script tag with id
  // "data-deferred-state-0". We grab the tag content and JSON.parse it.
  const marker = 'id="data-deferred-state-0"';
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const tagStart = html.indexOf(">", start) + 1;
  const tagEnd = html.indexOf("</script>", tagStart);
  if (tagEnd === -1) return null;
  const raw = html.slice(tagStart, tagEnd).trim();
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function collectListings(state) {
  const out = [];
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    // A listing node carries a stable id and a "listing" object.
    if (node.id && node.listing && typeof node.listing === "object") {
      out.push(node);
    }
    for (const key of Object.keys(node)) {
      if (key === "listing" || key === "pricingQuote") continue;
      walk(node[key]);
    }
  };
  walk(state);
  return out;
}


// Pull the primary photo URL from a listing node. Airbnb stores it in a few
// places depending on the page version: node.image.picture, the listing's
// contextualPictures, or the listing's primaryHost avatar. We try them in
// order and return the first usable URL.
function extractImage(node) {
  const listing = node.listing || {};
  const candidates = [];
  if (node.image && typeof node.image.picture === "string") {
    candidates.push(node.image.picture);
  }
  if (Array.isArray(listing.contextualPictures)) {
    for (const pic of listing.contextualPictures) {
      if (pic && typeof pic.picture === "string") candidates.push(pic.picture);
    }
  }
  if (listing.primaryHost && typeof listing.primaryHost.picture === "string") {
    candidates.push(listing.primaryHost.picture);
  }
  return candidates.find((url) => url && url.startsWith("http")) || null;
}

function formatListing(node) {
  const listing = node.listing || {};
  const pricing = node.pricingQuote || {};
  const structured = listing.structuredContent || {};
  const primary = structured.primaryLine || {};
  const secondary = structured.secondaryLine || {};
  const price = pricing.structuredDisplayPrice || {};
  const priceParts = (price.explanationData || []).map((p) => p.formatted).filter(Boolean);

  return {
    id: node.id,
    title: primary.title || listing.title || "—",
    location: secondary.title || listing.localizedCityName || "—",
    guests: listing.personCapacity,
    bedrooms: listing.bedrooms,
    beds: listing.beds,
    rating: listing.avgRatingLocalized || listing.avgRating,
    image: extractImage(node),
    pricePerNight: priceParts[0] || "—",
    total: priceParts[priceParts.length - 1] || "—",
    url: `https://www.airbnb.fr/rooms/${node.id}`,
  };
}

async function main() {
  const opts = readArgs();
  const url = buildSearchUrl(opts);

  console.error(`[airbnb-scraper] Fetching ${url}`);

  let res;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
    });
  } catch (err) {
    console.error(`[airbnb-scraper] Network error: ${err.message}`);
    process.exit(1);
  }

  if (!res.ok) {
    console.error(
      `[airbnb-scraper] Airbnb returned HTTP ${res.status} (${res.statusText}). ` +
        "The site may be blocking automated requests. Try again later or run from a browser.",
    );
    process.exit(1);
  }

  const html = await res.text();
  const state = extractDeferredState(html);
  if (!state) {
    console.error(
      "[airbnb-scraper] Could not find embedded search data. " +
        "Airbnb may have changed its page structure or blocked the request.",
    );
    process.exit(1);
  }

  const listings = collectListings(state).slice(0, opts.limit);

  if (opts.json) {
    console.log(JSON.stringify(listings.map(formatListing), null, 2));
    return;
  }

  console.log(`\nAirbnb · ${opts.area}`);
  console.log(`Dates: ${opts.checkin} → ${opts.checkout} · ${opts.guests} guest(s)`);
  console.log(`Listings found: ${listings.length}\n`);

  if (listings.length === 0) {
    console.log("No listings parsed. The page structure may have changed.");
    return;
  }

  for (const l of listings) {
    console.log(`• ${l.title}`);
    console.log(`  ${l.location} · ${l.guests ?? "?"} guests · ${l.bedrooms ?? "?"} bd · ${l.beds ?? "?"} beds`);
    if (l.rating) console.log(`  Rating: ${l.rating}`);
    if (l.image) console.log(`  Image: ${l.image}`);
    console.log(`  ${l.pricePerNight} / night · total ${l.total}`);
    console.log(`  ${l.url}`);
    console.log("");
  }
}

main().catch((err) => {
  console.error(`[airbnb-scraper] Unexpected error: ${err.message}`);
  process.exit(1);
});
