#!/usr/bin/env node
/**
 * setup-gmail-oauth.mjs
 *
 * One-time helper to obtain the Gmail OAuth2 credentials the `sendInvitation`
 * Cloud Function needs, and to print the exact `firebase functions:secrets:set`
 * commands to store them in Secret Manager.
 *
 * ── What you must do FIRST (in the Google Cloud Console) ────────────────────
 * 1. Go to https://console.cloud.google.com/apis/credentials
 *    (make sure the project is `boda-500805`).
 * 2. Click "+ CREATE CREDENTIALS" → "OAuth client ID".
 * 3. Application type: "Web application".
 * 4. Name it e.g. "boda-send-invitations".
 * 5. Under "Authorized redirect URIs" add:
 *        http://localhost:8080
 * 6. Click CREATE. Copy the Client ID and Client Secret.
 * 7. Enable the Gmail API if not already:
 *        https://console.cloud.google.com/apis/library/gmail.googleapis.com
 *
 * ── Then run this script ────────────────────────────────────────────────────
 *   node scripts/setup-gmail-oauth.mjs \
 *     --client-id <CLIENT_ID> \
 *     --client-secret <CLIENT_SECRET> \
 *     --from bodadavidyayde@gmail.com
 *
 * It will print a URL. Open it in a browser, sign in as the account that
 * should SEND the invitations (bodadavidyayde@gmail.com), approve the
 * "Send email on your behalf" screen, and you'll be redirected to
 * http://localhost:8080/?code=...  Paste that full URL (or just the code)
 * back into the script when prompted.
 *
 * The script then exchanges the code for a refresh token and prints the four
 * `firebase functions:secrets:set` commands to run.
 */

import { createServer } from "node:http";
import { randomBytes } from "node:crypto";

const SCOPES = ["https://www.googleapis.com/auth/gmail.send"];
const REDIRECT_URI = "http://localhost:8080";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1];
      if (val && !val.startsWith("--")) {
        args[key] = val;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

function readStdin(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    let data = "";
    process.stdin.on("data", (chunk) => {
      data += chunk;
      if (data.includes("\n")) {
        process.stdin.pause();
        resolve(data.trim());
      }
    });
  });
}

async function exchangeCode(code, clientId, clientSecret) {
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Token exchange failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return json;
}

function waitForRedirect() {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, REDIRECT_URI);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      if (error) {
        res.end(`<h3>Error: ${error}</h3><p>You can close this tab.</p>`);
        server.close();
        reject(new Error(`OAuth error: ${error}`));
        return;
      }
      if (code) {
        res.end("<h3>¡Listo! Puedes cerrar esta pestaña.</h3>");
        server.close();
        resolve(code);
      } else {
        res.end("<h3>No code found. Close this tab and try again.</h3>");
      }
    });
    server.listen(8080, () => {
      console.log("\n  Waiting for the browser redirect on http://localhost:8080 ...\n");
    });
    server.on("error", (err) => reject(err));
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const clientId = args["client-id"];
  const clientSecret = args["client-secret"];
  const from = args["from"];

  if (!clientId || !clientSecret) {
    console.error(`
Usage:
  node scripts/setup-gmail-oauth.mjs \\
    --client-id <CLIENT_ID> \\
    --client-secret <CLIENT_SECRET> \\
    --from bodadavidyayde@gmail.com

First create an OAuth client in the Google Cloud Console (see the header of
this file for the exact steps).`);
    process.exit(1);
  }

  const state = randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  const authUrl = `${AUTH_URL}?${params.toString()}`;

  console.log("\n──────────────────────────────────────────────────────────────");
  console.log(" 1. Open this URL in your browser and sign in as the account");
  console.log("    that should SEND the invitations (bodadavidyayde@gmail.com):");
  console.log("──────────────────────────────────────────────────────────────\n");
  console.log(authUrl);
  console.log("\n 2. Approve the 'Send email on your behalf' screen.");
  console.log(" 3. You'll be redirected to http://localhost:8080/?code=...");
  console.log("    The script will capture the code automatically.\n");

  let code;
  try {
    code = await waitForRedirect();
  } catch (err) {
    // Fallback: ask the user to paste the code manually.
    console.error(`\n  Could not auto-capture the redirect: ${err.message}`);
    code = await readStdin("\n  Paste the full redirect URL (or just the code=... value): ");
    if (code.includes("code=")) {
      code = new URL(code).searchParams.get("code");
    }
  }

  console.log("\n  Exchanging the code for a refresh token ...");
  const token = await exchangeCode(code, clientId, clientSecret);

  if (!token.refresh_token) {
    console.error("\n  No refresh_token returned. This usually means the account");
    console.error("  was already authorized before. Revoke access and retry, or");
    console.error("  check that 'access_type=offline' + 'prompt=consent' were used.");
    process.exit(1);
  }

  console.log("\n──────────────────────────────────────────────────────────────");
  console.log("  SUCCESS! Run these commands to store the secrets:");
  console.log("──────────────────────────────────────────────────────────────\n");
  console.log(`firebase functions:secrets:set GMAIL_CLIENT_ID`);
  console.log(`  # paste: ${clientId}`);
  console.log(`firebase functions:secrets:set GMAIL_CLIENT_SECRET`);
  console.log(`  # paste: ${clientSecret}`);
  console.log(`firebase functions:secrets:set GMAIL_REFRESH_TOKEN`);
  console.log(`  # paste: ${token.refresh_token}`);
  console.log(`firebase functions:secrets:set GMAIL_FROM`);
  console.log(`  # paste: ${from || "bodadavidyayde@gmail.com"}`);
  console.log("\n  Then deploy the function:");
  console.log("  cd functions && npx firebase deploy --only functions:sendInvitation\n");
}

main().catch((err) => {
  console.error("\nError:", err.message);
  process.exit(1);
});
