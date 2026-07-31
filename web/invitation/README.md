# Invitation web ES / FR / EN

One-page public wedding invitation inspired by the visual simplicity of the Squarespace Soria reference.

## Stack

- Vite as build tooling.
- Vanilla JavaScript and CSS.
- Firebase Web SDK for Authentication and Firestore.
- Authored ES, FR and EN content in `src/content.js`.

## Local use

```bash
cd /Users/aydejuarez/boda/web/invitation
npm install
npm run dev
```

Then open `http://localhost:5173/?lang=fr` (or use `es` / `en`).

Production check:

```bash
npm run build
npm run preview
```

## Language behavior

The first visit uses this priority:

1. `?lang=es`, `?lang=fr` or `?lang=en`.
2. A previous manual choice saved in local storage.
3. The browser language list.
4. Spanish fallback.

The visible language control always allows guests to override detection.

## Countdown

The sticky countdown targets `2027-02-20T00:00:00-06:00`, local time in Jalisco. Update `EVENT.date` in `src/content.js` once the official ceremony time is confirmed.

## Photographs and visual assets

- Submitted originals live in `media/originals/` and are not deployed.
- Privacy and approval status live in `media/catalog.csv`.
- Approved web derivatives live in `src/assets/approved/` and are the source
  for the Cloudinary upload script.
- **All public photos and videos are hosted on Cloudinary** (cloud name
  `k2ajcgxv`) under the `boda/` folder, tagged by section (HERO, NOVIOS,
  ROCA_AZUL, COMIDA, CABANAS, VESTUARIO, LAGO_DE_CHAPALA, ...).
- Cabin photos carry an extra **per-cabin tag** (`CABANA_AZALEA`,
  `CABANA_DALIA`, `CABANA_MARGARITA`, `CABANA_MADERA`) so the right photos can
  be fetched dynamically for each cabin.
- `src/cloudinary.js` builds optimized delivery URLs (resize, auto-format,
  auto-quality) at render time.
- `src/media.js` connects approved images to page slots via Cloudinary URLs.
- `src/rocaAzulGallery.js` re-hosts the Roca Azul venue gallery and the
  Lake Chapala / Jocotepec highlights on Cloudinary.
- `scripts/upload-to-cloudinary.mjs` uploads the approved derivatives plus the
  remote venue/Chapala images. It reads credentials from `web/invitation/.env`
  (see `.env.example`); the real `.env` is git-ignored.
- `scripts/generate-media-manifest.mjs` is a **build-time step** that queries
  Cloudinary by per-cabin tag and reads the cabin database
  (`invitados/cabanas/*.json`) to write `src/generated-media.js`. It runs
  automatically before every `npm run build` (or manually via `npm run
  manifest`). To add a cabin photo, tag it in Cloudinary and re-run the build.
- `src/generated-media.js` is a generated file (do not edit by hand) exposing
  `CABIN_PHOTOS`, `CABIN_VIDEOS`, and `CABIN_DB` (cabin metadata straight from
  the database).
- The hero rotates through four photographs every 6.5 seconds and includes
  manual selection and pause controls.


- The header monogram alternates between `D. & A.` (“DNA”) and `A. & D.`
  (“Aydé”), while respecting reduced-motion preferences.
- The accommodation section explains the approximate 80-person capacity,
  estimated price, included breakfasts, allocation process, and padrino gift
  in all three languages.
- Public WhatsApp links connect interested guests directly with David or Aydé.
- The unified RSVP collects attendance, accommodation preference and
  optional inbound/outbound flight details for long-distance guests.
- The RSVP identifies individuals and groups, counts adults and guests under
  18, and offers only the complete two-night lodging package or no lodging.
- Food and live-music sections present the draft programme and collect dessert,
  menu, song, and open-stage suggestions.
- Canonical listening links expose the general wedding and karaoke playlists
  without publishing temporary Spotify collaboration tokens.
- The facilities section groups the reported Roca Azul services with a clear
  availability disclaimer.
- A post-wedding Costalegre survey explores Barra de Navidad, Manzanillo, and
  flexible shared or independent stay formats.
- Vite copies only imported approved assets into the production build.

## Published backend

- Production (`master`): `https://boda-david-y-ayde.web.app`
- Development (`develop`): `https://boda-500805.web.app`
- Firebase Authentication validates the shared guest access key.
- Cloud Firestore stores RSVP, suggestion, and coast-interest submissions.
- Firestore rules allow guest creation only and deny all guest reads.

## Automated deployments

GitHub Actions builds the Vite invitation and deploys only the Hosting target
assigned to the pushed branch:

- `master` → `invitation-named` → production.
- `develop` → `invitation-primary` → development.

The workflow can also be run manually with an explicit environment choice. It
uses the repository secret `FIREBASE_SERVICE_ACCOUNT_BODA_500805`.

## Remaining editorial checks

- Validate the current mountain hero and seven-photo story gallery.
- Review and approve all three language versions.
- Confirm public schedule details.
- Test the future custom domain and social sharing preview.
- Decide whether analytics should remain disabled or be added with consent.
