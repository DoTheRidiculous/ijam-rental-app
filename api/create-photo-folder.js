// api/create-photo-folder.js
//
// Creates a new folder in Drive to hold a set of item photos, sets it to
// "anyone with the link can view" (no Google login required to view it),
// and optionally shares it directly with the respondent + org email too.
// Returns the folder's id (for uploading photos into) and its shareable link.

import { google } from "googleapis";
import { getOAuthClient, isValidEmail } from "./_googleAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { folderTitle, signerEmail } = req.body || {};
    if (!folderTitle) {
      res.status(400).json({ error: "Missing folder title." });
      return;
    }

    const orgEmail = process.env.ORG_EMAIL;
    const parentFolderId = process.env.PHOTOS_FOLDER_ID || process.env.DRIVE_FOLDER_ID;
    if (!orgEmail) throw new Error("Missing ORG_EMAIL environment variable.");
    if (!parentFolderId) throw new Error("Missing DRIVE_FOLDER_ID environment variable.");

    const auth = getOAuthClient();
    const drive = google.drive({ version: "v3", auth });

    const folder = await drive.files.create({
      requestBody: {
        name: folderTitle,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentFolderId],
      },
      fields: "id, webViewLink",
    });
    const folderId = folder.data.id;

    // Make it viewable by anyone with the link — no Google account needed.
    await drive.permissions.create({
      fileId: folderId,
      requestBody: { type: "anyone", role: "reader" },
    });

    // Also share directly with the org and, if provided, the respondent —
    // this triggers a normal Drive notification email as a courtesy record.
    const recipients = [orgEmail, ...(isValidEmail(signerEmail) ? [signerEmail] : [])];
    for (const email of recipients) {
      try {
        await drive.permissions.create({
          fileId: folderId,
          sendNotificationEmail: true,
          emailMessage: "Photos are being uploaded to this shared folder.",
          requestBody: { type: "user", role: "reader", emailAddress: email },
        });
      } catch (e) {
        // Non-fatal — the folder is already public-viewable regardless.
      }
    }

    res.status(200).json({ success: true, folderId, link: folder.data.webViewLink });
  } catch (err) {
    console.error("create-photo-folder error:", err);
    res.status(500).json({ error: err.message || "Something went wrong creating the photo folder." });
  }
}
