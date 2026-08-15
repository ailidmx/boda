# Invitation emails — Google Apps Script

Sends a personalised invitation email to each guest, in their preferred
language (es / fr / en), from the couple's Gmail account, with the couple in
CC. Triggered from a button directly in Google Sheets.

## What it does

- Reads the **INVITADOS** tab of the wedding Google Sheet.
- For each guest with an email and not already marked as sent, builds a
  personalised invitation email in their language (`lang` column: es/fr/en).
- Builds the invitation link from the guest's **profile code** (e.g.
  `azalea_compartida_porpagar`), Base64URL-encoded — the only code format the
  invitation app accepts.
- Sends it **from** the script owner's Gmail account, **CC** to the couple.
- Marks the `sent` column as `TRUE` after sending (so re-runs skip them).

## Configuration (edit at the top of `invitation_emails.gs`)

| Constant | Default | Purpose |
|---|---|---|
| `DRY_RUN` | `false` | `true` = preview without sending |
| `LIMIT` | `0` | Max emails per run (`0` = no limit) |
| `SENDER_NAME` | `David & Aydé` | Display name in the From header |
| `CC_RECIPIENTS` | `["david.aili.mx@gmail.com", "aydemiss@gmail.com"]` | Couple's CC |
| `INVITATION_BASE_URL` | `https://boda-david-y-ayde.web.app/` | Invitation site |
| `SHEET_NAME` | `Invitados` | Worksheet name |
| `COL_PROFILE_CODE` | `perfil` | Profile-code column (see below) |

### Profile code column

The invitation link MUST use the guest's **profile code**, not their UID. The
script reads it from the `perfil` column. If that column is missing, it derives
the code from the cabin columns (`Cabaña`, `isPrivate`, `isCabinPaidByNovios`).

> **Recommendation:** add a `perfil` column to the INVITADOS tab and fill it
> with each guest's profile code (e.g. `azalea_compartida_porpagar`,
> `sin_cabaña`). This is the most reliable source. The valid codes are:
> `hortencia_privada_pagada`, `cabaña_33_privada_porpagar`,
> `azalea_compartida_porpagar`, `sin_cabaña`, `cabaña_5_privada_porpagar`,
> `cabaña_34_privada_pagada`, `cabaña_4_compartida_pagada`,
> `lavanda_compartida_porpagar`, `casona_compartida_pagada`,
> `margarita_compartida_porpagar`, `cabaña_6_privada_porpagar`,
> `dalia_compartida_porpagar`, `cabaña_31_privada_porpagar`,
> `cabaña_32_privada_porpagar`.

## Install

1. Open the Google Sheet → **Extensions → Apps Script**.
2. Delete any default code and paste the contents of `invitation_emails.gs`.
3. Save (Ctrl/Cmd + S) and name the project (e.g. "Invitaciones por correo").
4. Run `sendInvitationEmails()` once from the editor to authorise Gmail +
   Sheets access. The script runs as the account that owns the spreadsheet —
   to send **from** `bodadavidyayde@gmail.com`, that account must own (or be
   the active account of) the spreadsheet.

## Attach to a button

1. In the sheet: **Insert → Drawing** → draw a button (e.g. "Enviar
   invitaciones").
2. Place it on the sheet, then click the **⋮** (three dots) on the drawing →
   **Assign script**.
3. Type `sendInvitationEmails` and click **OK**.
4. Click the button to send. A dialog reports how many were sent.

There is also `sendSelectedRow()` for a per-row button (sends only the
currently selected guest row).

## Safety

- Guests already marked `sent = TRUE` are skipped (no duplicates).
- Guests without an email are skipped and reported.
- Set `DRY_RUN = true` first to preview the exact emails without sending.
- Set `LIMIT` to cap how many emails go out per run.

## Notes

- The Base64URL encoding matches the invitation app's `encodeInvitationCode()`
  exactly (verified for ASCII and `ñ`-containing codes).
- Gmail has a daily sending quota (~500/day for free accounts). For a large
  guest list, run in batches using `LIMIT`.
