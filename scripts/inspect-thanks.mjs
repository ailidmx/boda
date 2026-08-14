// Inspect the THANKS collection: report per-record language coverage and
// flag potential syntax issues (empty strings, whitespace, HTML problems).
// Run: node scripts/inspect-thanks.mjs
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));
const invitationDir = join(__dirname, "../web/invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const appPath = reqFromInvitation.resolve("firebase-admin/app");
const firestorePath = reqFromInvitation.resolve("firebase-admin/firestore");

const { initializeApp, cert } = await import(appPath);
const { getFirestore } = await import(firestorePath);

const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore(app, "boda-us-central1");

const LANGUAGES = ["es", "fr", "en"];

// Placeholder values that are not real translations.
const PLACEHOLDER_PATTERN = /^[-—–.…]+$/u;

// Common French accent typos (missing accents) to flag. Each entry is a
// [regex, correct] pair. Regexes use word boundaries to avoid false positives
// (e.g. "a " must be the standalone verb "a" = has, not "la/ma/ta/sa").
const FRENCH_ACCENT_TYPOS = [
  [/\betre\b/u, "être"],
  [/\ba\b/u, "à"],
  [/\bou\b/u, "où"],
  [/\bcote\b/u, "côte"],
  [/\bforet\b/u, "forêt"],
  [/\btete\b/u, "tête"],
  [/\bfete\b/u, "fête"],
  [/\bhopital\b/u, "hôpital"],
  [/\bhotel\b/u, "hôtel"],
  [/\binteret\b/u, "intérêt"],
  [/\bprobleme\b/u, "problème"],
  [/\bsysteme\b/u, "système"],
  [/\btheatre\b/u, "théâtre"],
  [/\btres\b/u, "très"],
  [/\bgrace\b/u, "grâce"],
  [/\bdeja\b/u, "déjà"],
  [/\bpres\b/u, "près"],
  [/\bapres\b/u, "après"],
  [/\bdes que\b/u, "dès que"],
  [/\btresor\b/u, "trésor"],
];


function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}


function flagIssues(record) {
  const issues = [];
  const fields = {};
  for (const lang of LANGUAGES) {
    const raw = record[lang];
    const value = clean(raw);
    fields[lang] = value;
    if (raw === undefined || raw === null) {
      issues.push(`${lang}: MISSING`);
    } else if (typeof raw !== "string") {
      issues.push(`${lang}: NOT A STRING (${typeof raw})`);
    } else if (raw !== raw.trim()) {
      issues.push(`${lang}: leading/trailing whitespace`);
    } else if (raw === "") {
      issues.push(`${lang}: empty string`);
    } else if (PLACEHOLDER_PATTERN.test(raw)) {
      issues.push(`${lang}: placeholder value (${JSON.stringify(raw)}) — needs a real translation`);
    }
  }
  // HTML balance check (rough): count open/close tags
  for (const lang of LANGUAGES) {
    const value = fields[lang];
    if (!value) continue;
    for (const tag of ["div", "p", "strong", "em", "span", "b", "i", "ul", "li", "h3", "h4"]) {
      const open = (value.match(new RegExp(`<${tag}(\\s|>)`, "g")) || []).length;
      const close = (value.match(new RegExp(`</${tag}>`, "g")) || []).length;
      if (open !== close) {
        issues.push(`${lang}: unbalanced <${tag}> (${open} open / ${close} close)`);
      }
    }
  }
  // French accent typos (only meaningful for the fr field)
  const frValue = fields.fr;
  if (frValue) {
    for (const [typoRegex, correct] of FRENCH_ACCENT_TYPOS) {
      if (typoRegex.test(frValue.toLowerCase())) {
        issues.push(`fr: possible accent typo → "${correct}"`);
      }
    }
  }

  return { fields, issues };
}


// ── Auto-corrections ─────────────────────────────────────────────────────
// Keyed by document id. Each entry lists the field corrections to apply.
// These are the concrete fixes detected by the inspection above.
//
// Many records were seeded with placeholder "." values in one or two
// languages. Below we fill in real translations derived from the language
// that IS present (es or fr), and fix French accent typos.
const CORRECTIONS = {
  // thierry_aïli — es/en were placeholder "-" values; fill with real
  // translations matching the fr text.
  KPBvkYvi9cANIJBu7lJL: {
    es: "Por tener la paciencia de probar esta página",
    en: "For having the patience to test this page",
  },
  // aydé_juárez_guadalupe — French accent typo "etre" → "être".
  QJ7CFVKJUqRzkINfKjLZ: {
    fr: "Pour être la femme de ma vie",
  },
  // david_aïli — fr/en were placeholder "." values; fill with real
  // translations matching the es text.
  K01PFT26uZDwR6TJ1H08: {
    fr: "Pour me donner tout sans rien demander, tu es arrivé dans ma vie comme un air frais. JE T'AIME",
    en: "For giving me everything without asking anything in return, you came into my life like fresh air. I LOVE YOU",
  },

  // ── es present, fr/en were placeholder "." ─────────────────────────────
  // "Por los tostilocos"
  EeViLZsKojWD0NP7TrcL: {
    fr: "Pour les tostilocos",
    en: "For the tostilocos",
  },
  doRAuHUECafMoj7SwdJU: {
    fr: "Pour les tostilocos",
    en: "For the tostilocos",
  },
  fj0cUvBZ852z2DiCkwIv: {
    fr: "Pour les tostilocos",
    en: "For the tostilocos",
  },
  gzyfWCrHwmVVkkkInATQ: {
    fr: "Pour les tostilocos",
    en: "For the tostilocos",
  },
  s7awyLSgmL7Jt7nAIA7i: {
    fr: "Pour les tostilocos",
    en: "For the tostilocos",
  },
  w1PxgyhbEKQdTU3WWe61: {
    fr: "Pour les tostilocos",
    en: "For the tostilocos",
  },
  zKfqThxIIznksqV7b0kc: {
    fr: "Pour les tostilocos",
    en: "For the tostilocos",
  },
  // "Por los tosticolos" (typo of tostilocos)
  VLI0EgMsogieUkXOiVVX: {
    fr: "Pour les tostilocos",
    en: "For the tostilocos",
  },
  // "Por los esquites"
  QOS1vMiMgSI5E69UNz0a: {
    fr: "Pour les esquites",
    en: "For the esquites",
  },
  // "Por los equites" (typo of esquites)
  viEEK68npYfwBLBZpHVT: {
    fr: "Pour les esquites",
    en: "For the esquites",
  },
  // "Por las jericallas"
  QT2Hr39aqKffmOxeF0P6: {
    fr: "Pour les jericallas",
    en: "For the jericallas",
  },
  mkG8kWBY2QuuqIOIzH7q: {
    fr: "Pour les jericallas",
    en: "For the jericallas",
  },
  // "Por la hora extra de mariachi"
  U7zowXuqm9Bmm5W41oC9: {
    fr: "Pour l'heure supplémentaire de mariachi",
    en: "For the extra hour of mariachi",
  },
  // "Por las flores"
  gM0ay87Oiec8rGPxp5w7: {
    fr: "Pour les fleurs",
    en: "For the flowers",
  },
  // "Por las gelatinas"
  nxXotex7OwYg3Ruqfqjt: {
    fr: "Pour les gelées",
    en: "For the jellies",
  },

  // ── fr present, es/en were placeholder "." ─────────────────────────────
  // "Pour ton enthousiasme à participer à cette grande fête" (also fixes the
  // accent typos "a"/"á"/"fete" → "à"/"à"/"fête").
  QznOj3fgiWv9zJSssXSW: {
    es: "Por tu entusiasmo para participar en esta gran fiesta",
    fr: "Pour ton enthousiasme à participer à cette grande fête",
    en: "For your enthusiasm to take part in this great party",
  },
  m38MZMXHrH8jyfu8TgTF: {
    es: "Por tu entusiasmo para participar en esta gran fiesta",
    fr: "Pour ton enthousiasme à participer à cette grande fête",
    en: "For your enthusiasm to take part in this great party",
  },
  // "Pour organiser le tournoi de pétanque"
  Zmrl4vBSmfaogCsEORmR: {
    es: "Por organizar el torneo de petanca",
    en: "For organizing the pétanque tournament",
  },

  // ── French accent typo fixes ───────────────────────────────────────────
  // "Pour etre notre Wedding planner" → "Pour être notre Wedding planner"
  "manuel_amezcua__wedding_planner": {
    fr: "Pour être notre Wedding planner",
  },
};



const APPLY = process.argv.includes("--apply");

const snap = await db.collection("thanks").get();
console.log(`=== THANKS COLLECTION: ${snap.size} docs ===\n`);

let missingCount = 0;
let issueCount = 0;
let appliedCount = 0;

for (const doc of snap.docs) {
  const record = { id: doc.id, ...doc.data() };
  const { fields, issues } = flagIssues(record);
  const filled = LANGUAGES.filter((l) => fields[l]).length;

  console.log(`\n[${record.id}] guest=${record.guest || "—"} (${filled}/3 languages)`);
  for (const lang of LANGUAGES) {
    const v = fields[lang];
    console.log(`  ${lang}: ${v ? JSON.stringify(v) : "(empty)"}`);
  }
  if (issues.length) {
    issueCount += issues.length;
    console.log(`  ⚠ ISSUES:`);
    for (const issue of issues) console.log(`    - ${issue}`);
  }
  if (filled < 3) missingCount++;

  // Apply corrections for this doc if requested.
  const correction = CORRECTIONS[record.id];
  if (APPLY && correction) {
    const updates = {};
    for (const [lang, value] of Object.entries(correction)) {
      if (fields[lang] !== value) {
        updates[lang] = value;
      }
    }
    if (Object.keys(updates).length > 0) {
      await db.collection("thanks").doc(record.id).update(updates);
      appliedCount += Object.keys(updates).length;
      console.log(`  ✅ APPLIED: ${Object.keys(updates).join(", ")}`);
    } else {
      console.log(`  ℹ️  Already correct — no changes.`);
    }
  }
}

console.log(`\n=== SUMMARY ===`);
console.log(`Total docs: ${snap.size}`);
console.log(`Docs with missing translations: ${missingCount}`);
console.log(`Total issues flagged: ${issueCount}`);
if (APPLY) {
  console.log(`Corrections applied: ${appliedCount} field(s)`);
} else {
  console.log(`(Run with --apply to write the corrections to Firestore.)`);
}

process.exit(0);

