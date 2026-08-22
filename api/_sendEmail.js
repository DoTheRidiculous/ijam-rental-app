// api/_sendEmail.js
//
// Sends a real email via the Gmail API, using the same Google account the
// app is already connected to. This is needed specifically for notifying
// ORG_EMAIL when ORG_EMAIL is the same account the app is connected as —
// Drive's "share a file with someone" notification silently does nothing
// when the recipient already owns the file, which is exactly the case when
// the org's own inbox is also the connected Drive account.

import { google } from "googleapis";

function encodeSubject(subject) {
  // Allows non-ASCII characters (e.g. em dashes) in the subject line safely.
  return `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;
}

export async function sendEmail(auth, { to, subject, body }) {
  const gmail = google.gmail({ version: "v1", auth });

  const messageLines = [
    `To: ${to}`,
    `Subject: ${encodeSubject(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    body,
  ];
  const rawMessage = messageLines.join("\r\n");
  const encoded = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encoded },
  });
}
