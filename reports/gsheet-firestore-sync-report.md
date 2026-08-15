# Google Sheet to Firestore Sync Report

- Generated at: 2026-08-15T15:56:05.789Z
- Mode: execute
- CI mode: no
- Fail on drift: no
- Source mode: gsheet
- Source ref: spreadsheetId=1tvUs2WPksMWVbV10hdVoZ2NLNwTx6Q2R8Bs0sEbkqMg;sheet=Invitados

## Auth Health

- Auth users total: 211
- Guests total (Firestore): 262
- Auth users mapped to guest by UID: 211
- Auth users without guest: 0
- Auth users without matching sheet row: 0
- Sheet guests requiring auth: 212
- Sheet guests not requiring auth: 51
- Auth records present where firebase.auth is false: 0
- Guests requiring auth but missing it: 0
- Sheet guests requiring auth but missing it (selected scope): 1
- Auth email update candidates (sheet -> auth): 12
- Auth email updates blocked (invalid email): 0
- Auth email updates blocked (email in use): 0
- Auth create candidates (email present): 1
- Auth create blocked (missing sheet email): 0
- Auth create blocked (invalid email): 0
- Auth create blocked (email in use): 0
- Mapping coverage: 100%

### Auth Email Update Candidates

| UID | Invitation Group | Sheet Email | Auth Email | Disabled |
|---|---|---|---|---|
| spomenka.petrovic | Spomeka y Guihem | spomenka.petrovic.laubie@gmail.com | spomenka.petrovic@boda-david-y-ayde.web.app | false |
| pierre.berthelon | Pierre et Titis | pbertholon@gmail.com | pierre.berthelon@boda-david-y-ayde.web.app | false |
| geraldine.toussaint | Géraldine et Jean-Christophe | toussaint.geraldine@yahoo.fr | geraldine.toussaint@boda-david-y-ayde.web.app | false |
| gaetane | Gaëtane et Stéphane | contact@gaetanelefranc.com | gaetane@boda-david-y-ayde.web.app | false |
| gregory.nussbaumer |  | gregory.nussbaumer@gmail.com | gregory.nussbaumer@boda-david-y-ayde.web.app | false |
| victor.sirisakd |  | victor.sirisakd@free.fr | victor.sirisakd@boda-david-y-ayde.web.app | false |
| aurelien.neyrand |  | aurelien.neyrand@gmail.com | aurelien.neyrand@boda-david-y-ayde.web.app | false |
| damien.gilles |  | lemaildedamien@gmail.com | damien.gilles@boda-david-y-ayde.web.app | false |
| ilija.stankovic |  | ilijastankovic@yahoo.co.uk | ilija.stankovic@boda-david-y-ayde.web.app | false |
| jeanne.sergent |  | jeanou.s@icloud.com | jeanne.sergent@boda-david-y-ayde.web.app | false |
| moussa.boutemine |  | moussa.boutemine@gmail.com | moussa.boutemine@boda-david-y-ayde.web.app | false |
| sofiane.benalia |  | benalia.sofiane@free.fr | sofiane.benalia@boda-david-y-ayde.web.app | false |

### Auth Create Candidates

| UID | Invitation Group | Sheet Email | Password In Sheet |
|---|---|---|---|
| william | Marion et William | william@boda-david-y-ayde.web.app | yes |

## Auth Sync Actions

- Planned auth deletes (missing sheet row or firebase.auth=false): 0
- Planned email updates: 12
- Planned auth creates: 1
- Planned blocked creates (missing email): 0
- Planned blocked email updates (invalid): 0
- Planned blocked email updates (in use): 0
- Planned blocked auth creates (invalid email): 0
- Planned blocked auth creates (email in use): 0
- Applied auth deletes: 0
- Applied email updates: 12
- Applied auth creates: 1
- Auth action failures: 0

## Summary

- Invalid rows skipped (missing UID): 0
- Added candidates: 1
- Changed candidates: 24
- Unchanged: 238
- Stale candidates: 0
- Auth metadata rows: 263
- Writes: 25

## Missing In Firestore

- william

## Field Mismatches

### david_aïli

- idCheckUser: sheet=false firestore=true

### aydé_juárez_guadalupe

- idCheckUser: sheet=false firestore=true

### diego_aïli_vázquez

- idCheckUser: sheet=false firestore=true

### oscar

- idCheckUser: sheet=false firestore=true

### spomenka.petrovic

- identity.cloudinaryId: sheet=spo_nl89t6 firestore=spomenka_b03vcf

### guilhem.laubie

- identity.cloudinaryId: sheet=guilhem_sbvz9h firestore=guilhem_dy6ag9

### marion_38t

- invitationGroup: sheet=Marion et William firestore=
- travelsByPlane: sheet=true firestore=false

### dimitar

- identity.cloudinaryId: sheet=dimi_cyzpb7 firestore=

### geraldine.toussaint

- identity.cloudinaryId: sheet=gg_u1wclq firestore=Captura_de_pantalla_2026-08-03_a_la_s_4.16.02_p.m._sme5nv
- invitationGroup: sheet=Géraldine et Jean-Christophe firestore=Géraldine et ...

### pareja_de_géraldine

- identity.firstName: sheet=Jean-Christophe firestore=Pareja
- identity.middleName: sheet= firestore=De
- identity.lastName: sheet=Nervo firestore=Géraldine
- identity.cloudinaryId: sheet=jc_nxmclx firestore=
- invitationGroup: sheet=Géraldine et Jean-Christophe firestore=Géraldine et ...

### gaetane

- identity.cloudinaryId: sheet=glf_n9syy0 firestore=

### stéphane_bon

- identity.cloudinaryId: sheet=sbon_bpkms5 firestore=

### ange_bon

- identity.cloudinaryId: sheet=abon_cqloe8 firestore=ange_wfyq1x

### gregory.nussbaumer

- identity.cloudinaryId: sheet=greg_sz5pma firestore=

### paul-henry.picard

- identity.cloudinaryId: sheet=polo_mellvf firestore=polo_kalmuw

### victor.sirisakd

- identity.cloudinaryId: sheet=vik_mmaw3h firestore=

### aurelien.neyrand

- identity.cloudinaryId: sheet=aneyrand_obhmrr firestore=

### damien.gilles

- identity.cloudinaryId: sheet=dgilles_lrm8pw firestore=

### desislava

- identity.cloudinaryId: sheet=desi_dirzx4 firestore=desi_xr2o4d

### michael.delarche

- identity.cloudinaryId: sheet=delarche_fobe8e firestore=

### robin.haider

- identity.cloudinaryId: sheet=rh_dxidkb firestore=

### ilija.stankovic

- identity.phone: sheet=381641950011 firestore=
- identity.cloudinaryId: sheet=ilija_rcohes firestore=

### jeanne.sergent

- identity.phone: sheet=33601334212 firestore=
- identity.cloudinaryId: sheet=JEanne_v94dyf firestore=

### mireille.guillermet

- identity.lastName: sheet=Guilhermet firestore=Guillermet
- identity.phone: sheet=33624842081 firestore=

## Field-By-Field Record Audit

| ID | Status | Compared Fields | Differences |
|---|---|---:|---:|
| david_aïli | changed | 37 | 1 |
| aydé_juárez_guadalupe | changed | 37 | 1 |
| diego_aïli_vázquez | changed | 37 | 1 |
| oscar | changed | 37 | 1 |
| spomenka.petrovic | changed | 37 | 1 |
| guilhem.laubie | changed | 37 | 1 |
| marion_38t | changed | 37 | 2 |
| william | candidate-add | 37 | 37 |
| dimitar | changed | 37 | 1 |
| geraldine.toussaint | changed | 37 | 2 |
| pareja_de_géraldine | changed | 37 | 5 |
| gaetane | changed | 37 | 1 |
| stéphane_bon | changed | 37 | 1 |
| ange_bon | changed | 37 | 1 |
| gregory.nussbaumer | changed | 37 | 1 |
| paul-henry.picard | changed | 37 | 1 |
| victor.sirisakd | changed | 37 | 1 |
| aurelien.neyrand | changed | 37 | 1 |
| damien.gilles | changed | 37 | 1 |
| desislava | changed | 37 | 1 |
| michael.delarche | changed | 37 | 1 |
| robin.haider | changed | 37 | 1 |
| ilija.stankovic | changed | 37 | 2 |
| jeanne.sergent | changed | 37 | 2 |
| mireille.guillermet | changed | 37 | 2 |

