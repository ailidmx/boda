# Telegram notifications (Firebase Cloud Functions)

Sends a Telegram message to the couple's private group whenever a guest
interacts with the invitation: signs in, submits the RSVP, petanque, coast, or
save-the-date forms, rates an experience card, or updates their identity/answers.


## How it works

The invitation is a static site on Firebase Hosting with Firestore as the
backend. There is no server, so notifications are triggered by **Firebase Cloud
Functions** that watch Firestore collections. When a guest writes a document to
one of the watched collections, a function formats a human-readable message and
posts it to the configured Telegram chat via the Bot API.

The client also writes a lightweight document to the `login_events` collection
on each successful sign-in (see `web/invitation/src/context/AppContext.jsx`),
which triggers the login notification.

## Collections watched

| Collection                 | Trigger            | Message                          |
|----------------------------|--------------------|----------------------------------|
| `login_events`             | document created   | 🔓 New sign-in                   |
| `rsvp_submissions`         | document created   | 📋 New RSVP response             |
| `petanque_participation`   | document created   | 🎳 Petanque participation        |
| `coast_interest`           | document created   | 🌊 Coast interest                |
| `attendance_responses`     | document created   | 🗓️ Save-the-date attendance      |
| `card_votes`               | document created   | ⭐ New card rating               |
| `guests`                   | document updated   | 👤 Identity/answers updated      |

## Setup

### 1. Create the bot and get the chat ID

1. In Telegram, message **@BotFather** and use `/newbot` to create a bot. Copy
   the **bot token** (e.g. `123456:ABC-DEF...`).
2. Add the bot to the chat where you want notifications:
   - **Private group** (recommended): add the bot as a **member** of the group.
     The bot can post to a group it belongs to without being an admin.
   - **Channel**: add the bot as an **administrator** (required for the bot to
     post). If you don't, `sendMessage` returns `chat not found`.
3. Get the **chat ID**:
   - For a group or channel, the ID is the negative number in the link
     (e.g. `https://web.telegram.org/k/#-5507585125` → `-5507585125`).
   - To confirm the bot can reach the chat, send a test message:
     ```bash
     curl -s -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
       -d chat_id=<CHAT_ID> -d text="test"
     ```
     It must return `"ok":true`.


### 2. Install dependencies

```bash
npm run functions:install
```

### 3. Set the secrets (server-side, never in the client)

The functions read the token and chat ID from **Google Cloud Secret Manager**
via `defineSecret`. Set them once with:

```bash
firebase functions:secrets:set TELEGRAM_TOKEN
firebase functions:secrets:set TELEGRAM_CHAT_ID
```

Each command prompts for the value (paste the token / chat ID). The secrets are
stored encrypted in Secret Manager and injected into the functions at runtime.
They never appear in the client bundle or in source control.

> For local emulation, create a `functions/.env` file with
> `TELEGRAM_TOKEN=...` and `TELEGRAM_CHAT_ID=...` (the emulator reads it).


### 4. Deploy

```bash
npm run functions:deploy
```

Also deploy the updated Firestore rules (they add the `login_events`
collection):

```bash
firebase deploy --only firestore:rules
```

### 5. Test

Sign in to the invitation (or submit any form) and check the Telegram channel
for the notification. View function logs with:

```bash
npm run functions:logs
```

## Local development (emulator)

The functions can be run against the Firestore emulator:

```bash
cd functions && npm run serve
```

The emulator reads secrets from `firebase functions:config:get`, so set them
first (see step 3). Note that the emulator does not call the real Telegram API
unless the config is present.

## Notes

- Notifications are **best-effort**: if the Telegram API call fails (e.g. the
  bot is removed from the channel), the function logs a warning and returns
  without failing the guest's Firestore write.
- The `guests` update trigger only fires for meaningful changes (identity
  check, name/photo/phone, RSVP answers) and skips the frequent
  metadata-only touches the app performs.
- All user-provided text is escaped for Telegram MarkdownV2 so a guest's name
  or note can never break the message formatting.
