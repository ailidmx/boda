#!/usr/bin/env node
/**
 * List the images in the Cloudinary `boda/guisos` folder so we can map each
 * guiso card to its assigned cloudinaryId based on the image name.
 *
 * Usage:
 *   node scripts/list-guisos-cloudinary.mjs
 */
import { createRequire } from "module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ── Load Cloudinary credentials from web/invitation/.env ──────────────────
const envPath = join(__dirname, "..", "web", "invitation", ".env");
const envRaw = readFileSync(envPath, "utf8");
const env = {};
for (const line of envRaw.split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const CLOUD_NAME = env.CLOUDINARY_CLOUD_NAME || "k2ajcgxv";
const API_KEY = env.CLOUDINARY_API_KEY;
const API_SECRET = env.CLOUDINARY_API_SECRET;

if (!API_KEY || !API_SECRET) {
  console.error("Missing Cloudinary API key/secret in web/invitation/.env");
  process.exit(1);
}

const invitationDir = join(__dirname, "..", "web", "invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const cloudinaryPath = reqFromInvitation.resolve("cloudinary");
const { v2: cloudinary } = await import(cloudinaryPath);
cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
});

async function listResources(prefix) {
  const results = [];
  let nextCursor = null;
  do {
    const params = { type: "upload", prefix, max_results: 500 };
    if (nextCursor) params.next_cursor = nextCursor;
    const res = await cloudinary.api.resources(params);
    results.push(...(res.resources || []));
    nextCursor = res.next_cursor || null;
  } while (nextCursor);
  return results;
}

// Guisos images live either at the Cloudinary root (e.g. `19_-_Calabazas_guisadas_ijenzm`)
// or under `boda/quisos/` (e.g. `boda/quisos/1._Papas_con_longaniza_cy5av6`).
// This pattern matches the numbered dish names so we can map each card to its image.
const GUISOS_PATTERN =
  /(^|\/)(\d+[._-]|tostilocos|pipian|tinga|frijol|chiles|carne|puerco|res|pollo|cochinita|calabazas|arroz|mole|barbacoa|alambre|nopales|longaniza|chicharr|costilla|lengua|pastor|champiñones|champinones|tomatada|chipotle|verde|rojo)/i;

async function main() {
  // Pull a generous window of recent uploads so we catch every guisos image,
  // whether it is at the root or already organised under boda/quisos/.
  const results = [];
  let nextCursor = null;
  do {
    const params = {
      type: "upload",
      max_results: 500,
      sort_by: "created_at",
      direction: "desc",
    };
    if (nextCursor) params.next_cursor = nextCursor;
    const res = await cloudinary.api.resources(params);
    results.push(...(res.resources || []));
    nextCursor = res.next_cursor || null;
  } while (nextCursor && results.length < 2000);

  const guisos = results.filter((r) => GUISOS_PATTERN.test(r.public_id));

  console.log(`\n=== Guisos images (${guisos.length} found) ===`);
  console.log("created_at\tpublic_id\tformat\twidthxheight");
  for (const r of guisos) {
    console.log(`${r.created_at}\t${r.public_id}\t${r.format}\t${r.width}x${r.height}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
