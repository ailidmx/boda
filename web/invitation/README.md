# Invitation web ES / FR / EN

One-page public wedding invitation inspired by the visual simplicity of the Squarespace Soria reference.

## Stack

- Vite as build tooling.
- Vanilla JavaScript and CSS.
- No production runtime dependencies.
- Authored ES, FR and EN content in `src/content.js`.

## Local use

```bash
npm install
npm run dev
```

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
- Vite copies only imported approved assets into the production build.

## Before publication

- Replace the graphic hero placeholder with the selected couple photograph.
- Review and approve all three language versions.
- Confirm public schedule details.
- Connect RSVP to a private form.
- Add a private travel-information form without exposing guest records.
- Test the final domain, sharing preview and analytics/privacy settings.
