#!/usr/bin/env node
/**
 * setup-gmail-oauth-manual.mjs
 *
 * Manual version of setup-gmail-oauth.mjs — no local redirect server.
 * It prints the Google consent URL, then asks you to paste the authorization
 * code from the redirect URL's address bar.
 *
 * Usage:
 *   node scripts/setup-gmail-oauth-manual.mjs \
 *     --client-id <CLIENT_ID> \
 *     --client-secret <CLIENT_SECRET> \
 *     --from bodadavidyayde@gmail.com
 *
 * Steps:
 *   1. Open the printed URL, sign in as the sending account, approve.
 *   2. The browser will try to load http://localhost:8080/?code=... — the page
 *      may show "This site can't be reached" (that's fine, no server is running).
 *   3. Copy the `code=...` value from the address bar and paste it here.
 *   4. The script exchanges it for a refresh token and prints the 4
 *      `firebase functions:secrets:set` commands.
 */

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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const clientId = args["client-id"];
  const clientSecret = args["client-secret"];
  const from = args["from"];

  if (!clientId || !clientSecret) {
    console.error(`
Usage:
  node scripts/setup-gmail-oauth-manual.mjs \\
    --client-id <CLIENT_ID> \\
    --client-secret <CLIENT_SECRET> \\
    --from bodadavidyayde@gmail.com`);
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
  console.log(" 3. The browser will try to open http://localhost:8080/?code=...");
  console.log("    (it may show 'This site can't be reached' — that's expected).");
  console.log(" 4. Copy the value of the `code` parameter from the address bar");
  console.log("    and paste it below.\n");

  let code = await readStdin("  Paste the code: ");
  code = code.trim();
  if (code.includes("code=")) {
    code = new URL(code).searchParams.get("code");
  }
  if (!code) {
    console.error("\n  No code provided. Exiting.");
    process.exit(1);
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
