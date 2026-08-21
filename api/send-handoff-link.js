// api/send-handoff-link.js
//
// Emails the Property Loan Agreement hand-off link to staff automatically.
// Uses the same trick as the rest of the app: creates a small Drive doc and
// shares it with a notification message containing the actual link, since
// Drive's share notification is what delivers the email — no separate email
// service needed.

import { google } from "googleapis";
import { getOAuthClient } from "./_googleAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { link, ownerName } = req.body || {};
    if (!link) {
      res.status(400).json({ error: "Missing link to send." });
      return;
    }

    const orgEmail = process.env.ORG_EMAIL;
    const folderId = process.env.DRIVE_FOLDER_ID;
    if (!orgEmail) throw new Error("Missing ORG_EMAIL environment variable.");
    if (!folderId) throw new Error("Missing DRIVE_FOLDER_ID environment variable.");

    const auth = getOAuthClient();
    const drive = google.drive({ version: "v3", auth });
    const docs = google.docs({ version: "v1", auth });

    const title = `Property Loan Agreement Handoff - ${ownerName || "Owner"} - ${new Date().toISOString().slice(0, 10)}`;
    const file = await drive.files.create({
      requestBody: { name: title, mimeType: "application/vnd.google-apps.document", parents: [folderId] },
      fields: "id",
    });

    const bodyText =
      `PROPERTY LOAN AGREEMENT — READY FOR STAFF SIGNATURE\n\n` +
      `${ownerName || "The owner"} has completed and signed their part of the Property Loan Agreement.\n\n` +
      `Open this link to review their section and complete the Borrower (staff) signature:\n${link}\n`;

    await docs.documents.batchUpdate({
      documentId: file.data.id,
      requestBody: { requests: [{ insertText: { location: { index: 1 }, text: bodyText } }] },
    });

    await drive.permissions.create({
      fileId: file.data.id,
      sendNotificationEmail: true,
      emailMessage: `${ownerName || "The owner"} signed their part of the Property Loan Agreement. Finish it here: ${link}`,
      requestBody: { type: "user", role: "commenter", emailAddress: orgEmail },
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("send-handoff-link error:", err);
    res.status(500).json({ error: err.message || "Something went wrong sending this to staff." });
  }
}
