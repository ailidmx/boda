# Invitation media workflow

This directory stores submitted source material. Files here are never imported directly by the public invitation and therefore are not copied into the production build.

## Structure

- `originals/`: unchanged files supplied by David and Ayde.
- `external/`: source images from the venue and reusable licensed libraries.
- `external-credits.md`: sources, authors and licenses for external images.
- `catalog.csv`: asset identity, dimensions, privacy classification and approval state.
- `../src/assets/approved/`: web-ready derivatives approved for public use.
- `../src/media.js`: the only place where approved assets are connected to page slots.

## Workflow for each new photograph

1. Copy the original into `media/originals/` with a neutral sequential name.
2. Record it in `catalog.csv`, including visible personal data.
3. Decide its intended slot and crop.
4. Create a metadata-free web derivative in `src/assets/approved/`.
5. Approve the derivative for public use.
6. Import it from `src/media.js`.
7. Run `npm run build` and confirm that only approved derivatives appear in `dist/assets/`.

## Privacy rule

Images containing phone numbers, addresses, reservation codes or other personal information remain `source_only` unless public publication is explicitly approved. Never connect an original directly to the invitation.

The source set `INV-002` through `INV-018` was approved by the couple for use
in the invitation on 2026-07-28. Public WebP derivatives are resized,
auto-oriented and stripped of EXIF/GPS metadata. The source files remain
private and outside the Vite build.
