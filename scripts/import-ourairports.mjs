#!/usr/bin/env node
/**
 * Import the OurAirports airport dataset and produce a lightweight JSON index
 * optimized for the guest-facing airport autocomplete.
 *
 * The guest flight-info feature (see docs/flight-info-spec.md) needs a fast,
 * offline, accent-insensitive airport search. We consume the free OurAirports
 * CSV (https://ourairports.com/data/airports.csv), filter to the airports that
 * matter for passenger travel, normalize the fields, and write a compact JSON
 * file that the invitation app bundles.
 *
 * Usage:
 *   node scripts/import-ourairports.mjs [--csv path/to/airports.csv] [--out path/to/out.json]
 *
 * Options:
 *   --csv   path to a local airports.csv (default: downloads from OurAirports)
 *   --out   output JSON path (default: web/invitation/src/data/airports.json)
 *
 * The output is a JSON array of airport objects:
 *   {
 *     "iata": "CDG",
 *     "icao": "LFPG",
 *     "name": "Charles de Gaulle International Airport",
 *     "city": "Paris",
 *     "country": "France",
 *     "countryCode": "FR",
 *     "latitude": 49.012779,
 *     "longitude": 2.55
 *   }
 *
 * Only airports with an IATA code AND scheduled passenger service are kept, so
 * tiny private airstrips and heliports are excluded. The dataset is small
 * enough (~5–6k airports) to ship to every browser.
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT = resolve(__dirname, "../web/invitation/src/data/airports.json");
const OURAIRPORTS_URL = "https://ourairports.com/data/airports.csv";

// Parse CLI args: --csv <path> --out <path>
function parseArgs(argv) {
  const args = { csv: null, out: DEFAULT_OUT };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--csv") args.csv = argv[i + 1];
    if (argv[i] === "--out") args.out = argv[i + 1];
  }
  return args;
}

/**
 * Parse a single CSV line into an array of fields, respecting quoted fields
 * (OurAirports uses RFC-4180 style quoting with "" escapes).
 * @param {string} line
 * @returns {string[]}
 */
function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Normalize a raw OurAirports row into the compact airport shape.
 * @param {string[]} row  parsed CSV fields (in OurAirports column order)
 * @returns {Object|null} normalized airport, or null if it should be excluded
 */
function normalizeRow(row) {
  // OurAirports airports.csv column order (0-indexed):
  // 0 id, 1 ident, 2 type, 3 name, 4 latitude_deg, 5 longitude_deg,
  // 6 elevation_ft, 7 continent, 8 iso_country, 9 iso_region, 10 municipality,
  // 11 scheduled_service, 12 icao_code, 13 iata_code, 14 gps_code,
  // 15 local_code, 16 home_link, 17 wikipedia_link, 18 keywords
  const type = String(row[2] || "").trim();
  const name = String(row[3] || "").trim();
  const latitude = Number(row[4]);
  const longitude = Number(row[5]);
  const countryCode = String(row[8] || "").trim();
  const city = String(row[10] || "").trim();
  const scheduledService = String(row[11] || "").trim();
  const icao = String(row[12] || "").trim();
  const iata = String(row[13] || "").trim();

  // Keep only airports with an IATA code and scheduled passenger service.
  if (!iata) return null;
  if (scheduledService !== "yes") return null;

  // Keep only the airport types that make sense for passenger travel.
  if (!["large_airport", "medium_airport", "small_airport"].includes(type)) {
    return null;
  }

  if (!name || !countryCode) return null;

  return {
    iata,
    icao: icao || undefined,
    name,
    city: city || undefined,
    country: countryCode, // country name is resolved at build time if desired
    countryCode,
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
  };
}

/**
 * Load the airports CSV (from a local file or by downloading it).
 * @param {string|null} csvPath
 * @returns {Promise<string>} raw CSV text
 */
async function loadCsv(csvPath) {
  if (csvPath && existsSync(csvPath)) {
    return readFile(csvPath, "utf8");
  }
  console.log(`Downloading OurAirports dataset from ${OURAIRPORTS_URL} …`);
  const res = await fetch(OURAIRPORTS_URL);
  if (!res.ok) {
    throw new Error(`Failed to download OurAirports CSV (${res.status})`);
  }
  return res.text();
}

async function main() {
  const { csv, out } = parseArgs(process.argv.slice(2));
  const csvText = await loadCsv(csv);

  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  // Skip the header row.
  const rows = lines.slice(1).map(parseCsvLine);

  const airports = [];
  for (const row of rows) {
    const normalized = normalizeRow(row);
    if (normalized) airports.push(normalized);
  }

  // Sort by IATA for a stable, deterministic output.
  airports.sort((a, b) => a.iata.localeCompare(b.iata));

  await writeFile(out, JSON.stringify(airports, null, 2) + "\n", "utf8");
  console.log(`Wrote ${airports.length} airports to ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
