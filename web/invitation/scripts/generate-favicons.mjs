/**
 * Generate favicons from a "D&A" monogram using the `favicons` package.
 *
 * Usage:
 *   node scripts/generate-favicons.mjs
 *
 * The script builds a simple, elegant "D&A" monogram SVG (deep-green
 * background, cream "D&A" with a marigold ampersand) and outputs all
 * favicon variants to the public/ directory.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import favicons from "favicons";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DEST = join(ROOT, "public");

// ── Build the "D&A" monogram source SVG ────────────────────────────────
// A 512×512 square: deep-green background, a thin cream ring, and the
// letters "D&A" centered with a marigold ampersand.
// Build the XML-escaped ampersand entity at runtime so the source file
// never contains a literal "&" (which some tooling would decode).
const AMP_ENTITY = String.fromCharCode(38) + "amp;";

const MONOGRAM_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#293b35"/>
  <circle cx="256" cy="256" r="196" fill="none" stroke="#f4eee4" stroke-width="10" opacity="0.9"/>
  <circle cx="256" cy="256" r="176" fill="none" stroke="#c68b2b" stroke-width="3" opacity="0.55"/>
  <text
    x="150"
    y="256"
    text-anchor="middle"
    dominant-baseline="central"
    font-family="sans-serif"
    font-size="190"
    font-weight="700"
    fill="#f4eee4"
  >D</text>
  <text
    x="256"
    y="256"
    text-anchor="middle"
    dominant-baseline="central"
    font-family="sans-serif"
    font-size="150"
    font-weight="700"
    font-style="italic"
    fill="#c68b2b"
  >${AMP_ENTITY}</text>
  <text
    x="362"
    y="256"
    text-anchor="middle"
    dominant-baseline="central"
    font-family="sans-serif"
    font-size="190"
    font-weight="700"
    fill="#f4eee4"
  >A</text>
</svg>
`;


const configuration = {
  path: "/",
  appName: "David & Aydé — Boda",
  appShortName: "D&A Boda",
  appDescription:
    "David y Aydé se casan el 20 de febrero de 2027 en Roca Azul, Jocotepec, Jalisco.",
  developerName: null,
  developerURL: null,
  dir: "auto",
  lang: "es-MX",
  background: "#293b35",
  theme_color: "#293b35",
  appleStatusBarStyle: "black-translucent",
  display: "standalone",
  orientation: "portrait",
  scope: "/",
  start_url: "/",
  version: "1.0",
  logging: false,
  pixel_art: false,
  loadManifestWithCredentials: false,
  manifestRelativePaths: false,
  icons: {
    android: true,
    appleIcon: true,
    appleStartup: false,
    favicons: true,
    windows: true,
    yandex: false,
  },
};

try {
  // Rasterize the SVG monogram to a 512×512 PNG so the favicons package
  // can reliably read it (it rejects raw SVG buffers).
  const source = await sharp(Buffer.from(MONOGRAM_SVG.trim(), "utf8"))
    .resize(512, 512)
    .png()
    .toBuffer();
  const response = await favicons(source, configuration);

  // Write HTML tags reference
  const htmlTags = response.html.join("\n  ");
  console.log("Generated favicon HTML tags:\n");
  console.log(`  ${htmlTags}\n`);

  // Write all generated files to public/
  mkdirSync(DEST, { recursive: true });

  for (const file of response.images) {
    const destPath = join(DEST, file.name);
    writeFileSync(destPath, file.contents);
    console.log(`  ✓ ${file.name}`);
  }

  for (const file of response.files) {
    const destPath = join(DEST, file.name);
    writeFileSync(destPath, file.contents);
    console.log(`  ✓ ${file.name}`);
  }

  console.log("\n✅ Favicons generated successfully in public/");
} catch (error) {
  console.error("❌ Favicon generation failed:", error.message);
  process.exit(1);
}
