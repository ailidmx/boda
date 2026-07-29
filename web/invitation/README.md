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
- Approved web derivatives live in `src/assets/approved/`.
- `src/media.js` connects approved images to page slots.
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
