/**
 * Verify the current state after the (partial) UUID migration.
 * Checks whether guest docs and auth users are at old or new IDs.
 */
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const serviceAccount = require(join(__dirname, "../integraciones/google_sheets/service_account.json"));

const invitationDir = join(__dirname, "../web/invitation");
const reqFromInvitation = createRequire(join(invitationDir, "package.json"));
const adminPath = reqFromInvitation.resolve("firebase-admin");
const appPath = reqFromInvitation.resolve("firebase-admin/app");
const firestorePath = reqFromInvitation.resolve("firebase-admin/firestore");
const authPath = reqFromInvitation.resolve("firebase-admin/auth");

const admin = await import(adminPath);
const { initializeApp, cert } = await import(appPath);
const { getFirestore } = await import(firestorePath);
const { getAuth } = await import(authPath);

const app = initializeApp({ credential: cert(serviceAccount), projectId: serviceAccount.project_id });
const db = getFirestore(app);
const auth = getAuth(app);

// The 93 mappings (old -> new) from the sheet.
const mappings = [
  ["carolina_saldana_suarez","carolina"],["diego_hernandez","diego.matraz"],["morgane_rako","morgane"],
  ["aldo_díaz_de_sandi","aldo.petanca"],["iopoch_díaz_de_sandi","iopoch"],["dylan_maringolo","dylan"],
  ["diego_möller","moller"],["pablo_galaud","paablo"],["benjamin_saksik","benjamin"],["raoul_le_bas","raoul"],
  ["cynthia_cobarrubias","cynthia"],["oscar_aïli_vázquez","oscar"],["elvira_guadalupe","elvira.guadalupe"],
  ["eduardo_de_guadalupe","eduardo.esparza"],["noel_omar_guadalupe","noel"],["carmen_de_juárez","carmen"],
  ["yadira_de_juárez","yadira"],["jaime_juárez","jaime"],["irma_juárez","irma"],["adriana_martínez","adriana"],
  ["susana_díaz","susana.diaz"],["ernesto_ruelas","ernesto.ruelas"],["diego_salmerón","diego.salmeron"],
  ["ana_peregrino","ana.peregrino"],["samuel_lópez","samuel"],["rodrigo_fernández_castillo","rodrigo_rodriguez"],
  ["fanny_golden","fanny.jasso"],["abraham_burciaga","abraham"],["mauricio_vargas","mauricio"],
  ["victor_segoviano","victor"],["juan_ignacio_sánchez","juan-ignacio"],["erik_montañez","erik.montanez"],
  ["rené_linares","rene.linares"],["carlos_la_pelona","carlos.jimenez"],["alberto_trejo","alberto.trejo"],
  ["spomenka_petrovic","spomenka.petrovic"],["guilhem_petrovic","guilhem.laubie"],["pierre_berthelon","pierre.berthelon"],
  ["titis_berthelon","titis"],["tristan_de_carne","tristan"],["yari_de_carne","yari"],
  ["frederic_bousquet","fred_38t"],["laurent_monte","lolo_38t"],["isabelle_panzica","isa_38t"],
  ["chansamone_thao_nantha_kouman","chang_38t"],["boris_bousquet","bobo_28t"],["alexis_boilley","alexis"],
  ["florent_lagaye","floof_38t"],["karine_lagaye","karine"],["cyril_bertholin","beb_38t"],
  ["vincent","vinvent_38t"],["celia","celia_38t"],["marion_livoti","marion_38t"],["benoit_guinet","benoit_38t"],
  ["antoine","gm_38t"],["françois_lemery","francois"],["mireille_lemery","mireille"],["diego_henao","diego.henao"],
  ["ana_garcía","ana.garcia"],["jenny_di_fonzo","jenny"],["géraldine_toussaint","geraldine.toussaint"],
  ["gaëtane_lefranc","gaetane"],["josé_alberto_ricardo_valdés_villareal_miranda","jose.valdes"],
  ["sébastien_mut","touta.mut"],["carmene_mut_coudene","carmen.mut"],["arsene_mut_coudene","arsene.mut"],
  ["gregory_nussbaumer","gregory.nussbaumer"],["paul-henry_picard","paul-henry.picard"],
  ["victor_sirisakd","victor.sirisakd"],["sébastien_passelande","sebastien.passelande"],
  ["yvon_leborgne","yvon.leborgne"],["antoine_faure","antoine"],["aurélien_neyrand","aurelien.neyrand"],
  ["damien_gilles","damien.gilles"],["michaël_delarche","michael.delarche"],["robin_haider","robin.haider"],
  ["esteban","estaban.ambriz"],["sandra_gdl","sandra.yanez"],["ilija_stankovic","ilija.stankovic"],
  ["jeanne_sergent","jeanne.sergent"],["guillaume","gui.lucas"],["muriel","muriel.rime"],
  ["julien_bryard","julien.bryard"],["mireille_guillermet","mireille.guillermet"],
  ["moussa_boutemine","moussa.boutemine"],["sofiane_benalia","sofiane.benalia"],["berni_cardoso","berni.cardosa"],
  ["jorge_jr._cardoso","jorge.cardosa.romero"],["juri_cardoso","juri.romero"],["jorge_cardoso","jorge.cardosa"],
  ["guillemette_renard","guillemette.renard"],["marido_de_guillemette_renard","matthieu.goury"],
  ["benjamin_besson","benjamin.besson"],
];

// Load auth users.
const authUsers = [];
let nextPageToken;
do {
  const page = await auth.listUsers(1000, nextPageToken);
  authUsers.push(...page.users);
  nextPageToken = page.pageToken;
} while (nextPageToken);
const authByUid = new Map(authUsers.map((u) => [u.uid, u]));

// Load guest docs.
const guestIds = new Set();
const guestSnap = await db.collection("guests").get();
guestSnap.forEach((d) => guestIds.add(d.id));

let guestAtOld = 0, guestAtNew = 0, guestMissing = 0;
let authAtOld = 0, authAtNew = 0, authMissing = 0;

for (const [oldId, newId] of mappings) {
  const gOld = guestIds.has(oldId);
  const gNew = guestIds.has(newId);
  if (gOld) guestAtOld++;
  if (gNew) guestAtNew++;
  if (!gOld && !gNew) guestMissing++;

  const aOld = authByUid.has(oldId);
  const aNew = authByUid.has(newId);
  if (aOld) authAtOld++;
  if (aNew) authAtNew++;
  if (!aOld && !aNew) authMissing++;
}

console.log("=== GUEST DOCS ===");
console.log(`  At OLD id: ${guestAtOld}`);
console.log(`  At NEW id: ${guestAtNew}`);
console.log(`  Missing (neither): ${guestMissing}`);
console.log("");
console.log("=== AUTH USERS ===");
console.log(`  At OLD uid: ${authAtOld}`);
console.log(`  At NEW uid: ${authAtNew}`);
console.log(`  Missing (neither): ${authMissing}`);

// Show any guest that is at BOTH old and new (would be a problem).
console.log("\n=== GUESTS AT BOTH OLD AND NEW ===");
for (const [oldId, newId] of mappings) {
  if (guestIds.has(oldId) && guestIds.has(newId)) {
    console.log(`  ${oldId} AND ${newId} both exist`);
  }
}

// Show any auth at both old and new.
console.log("\n=== AUTH AT BOTH OLD AND NEW ===");
for (const [oldId, newId] of mappings) {
  if (authByUid.has(oldId) && authByUid.has(newId)) {
    console.log(`  ${oldId} AND ${newId} both exist`);
  }
}

process.exit(0);
