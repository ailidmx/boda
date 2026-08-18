#!/usr/bin/env node
/**
 * deploy-invitation-emails.mjs
 *
 * Deploys the invitation-emails Google Apps Script to the live project via
 * `clasp push`.
 *
 * The script reads the guest's email language from the sheet `lang` column
 * only — it no longer talks to Firestore, so there is no service-account key
 * to inject. This deploy step is a plain `clasp push`.
 *
 * Usage:
 *   node scripts/deploy-invitation-emails.mjs
 *
 * Requires:
 *   - `clasp` available on PATH (or `npx @google/clasp`).
 *   - `~/.clasprc.json` present (from `clasp login`).
 */

import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SHEETS_DIR = join(ROOT, "integraciones", "google_sheets");

function fail(msg) {
  console.error(`[deploy-invitation-emails] ERROR: ${msg}`);
  process.exit(1);
}

try {
  execSync("clasp push --force", {
    cwd: SHEETS_DIR,
    stdio: "inherit",
  });
  console.log("[deploy-invitation-emails] clasp push succeeded.");
} catch (e) {
  fail(`clasp push failed: ${e.message}`);
}
