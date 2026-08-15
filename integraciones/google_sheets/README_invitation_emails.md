# Invitation emails — Google Apps Script

Sends a personalised invitation email to each guest, in their preferred
language (es / fr / en), from the couple's Gmail account, with the couple in
CC.

## Two ways to send

### 1. AUTO — on `_enviado` checkbox (recommended)

An **installable onEdit trigger** fires whenever the `_enviado` checkbox on a
guest row is set to **TRUE**, and sends that guest's invitation immediately.
No button, no manual run — just tick the box.

### 2. MANUAL — button or editor

- `sendInvitationEmails()` — bulk send to all guests not yet marked as sent.
- `sendSelectedRow()` — send only the currently selected guest row.

## What it does

- Reads the **INVITADOS** tab of the wedding Google Sheet.
- For each guest with an email and not already marked as sent, builds a
  personalised invitation email in their language.
- The email **body** is read from the guest's row, from the column matching
  their language:
  - `_msgInvitFR` (French)
  - `_msgInvitES` (Spanish)
  - `_msgInvitEN` (English)
  The language is taken from the `lang` column (es / fr / en). The body may
  contain the placeholders `{name}` and `{link}`, which are replaced with the
  guest's name and their personalised invitation link.
- Builds the invitation link from the guest's **profile code** (e.g.
  `azalea_compartida_porpagar`), Base64URL-encoded — the only code format the
  invitation app accepts.
- Sends it **from** the script owner's Gmail account, **CC** to the couple.
- Marks the `_enviado` column as `TRUE` after sending (so re-runs skip them).

## Configuration (edit at the top of `invitation_emails.gs`)

| Constant | Default | Purpose |
|---|---|---|
| `DRY_RUN` | `false` | `true` = preview without sending |
| `LIMIT` | `0` | Max emails per run (`0` = no limit) |
| `SENDER_NAME` | `David & Aydé` | Display name in the From header |
| `CC_RECIPIENTS` | `["david.aili.mx@gmail.com", "aydemiss@gmail.com"]` | Couple's CC |
| `INVITATION_BASE_URL` | `https://boda-david-y-ayde.web.app/` | Invitation site |
| `SHEET_NAME` | `Invitados` | Worksheet name |
| `COL_EMAIL` | `firebase.Identifier` | Email column (falls back to `firebase_email` / `_email` / `email`) |
| `COL_LANG` | `lang` | Language column (es / fr / en) |
| `COL_SENT` | `_enviado` | Sent checkbox column (also accepts `sent`) |
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

## Install (one time)

1. Open the Google Sheet → **Extensions → Apps Script**.
2. Delete any default code and paste the contents of `invitation_emails.gs`.
3. Save (Ctrl/Cmd + S) and name the project (e.g. "Invitaciones por correo").
4. Run `setupTrigger()` once from the editor. This:
   - installs the onEdit trigger that auto-sends on `_enviado = TRUE`, and
   - authorises Gmail + Sheets access.
   The script runs as the account that owns the spreadsheet — to send **from**
   `bodadavidyayde@gmail.com`, that account must own (or be the active account
   of) the spreadsheet.

## Use

- **Auto:** tick the `_enviado` checkbox on a guest row → the invitation is
  sent immediately. Unticking and re-ticking re-sends (the script only reacts
  to a change from unchecked → checked).
- **Manual (bulk):** run `sendInvitationEmails()` from the editor, or attach it
  to a button (Insert → Drawing → draw a button → ⋮ → Assign script →
  `sendInvitationEmails`).
- **Manual (single):** run `sendSelectedRow()` with a guest row selected.

## Safety

- Guests already marked `_enviado = TRUE` are skipped (no duplicates).
- Guests without an email are skipped and reported.
- Set `DRY_RUN = true` first to preview the exact emails without sending.
- Set `LIMIT` to cap how many emails go out per run.

## Notes

- The Base64URL encoding matches the invitation app's `encodeInvitationCode()`
  exactly (verified for ASCII and `ñ`-containing codes).
- Gmail has a daily sending quota (~500/day for free accounts). For a large
  guest list, run in batches using `LIMIT`.
- The onEdit trigger is **installable** (not a simple `onEdit`) because it uses
  `GmailApp`, which requires authorisation. `setupTrigger()` creates it for you.
