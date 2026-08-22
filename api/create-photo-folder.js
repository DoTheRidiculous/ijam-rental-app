// api/create-photo-folder.js
//
// Finds an existing photo folder for this person (by name) and reuses it,
// or creates a new one if this is their first time. This means she can come
// back and upload more photos anytime using the same link, and everything
// lands in one folder instead of scattering across duplicates.

import { google } from "googleapis";
import { getOAuthClient, isValidEmail } from "./_googleAuth.js";
import { listAllFilesRecursive } from "./_driveList.js";
import { getOrCreatePersonFolder } from "./_personFolder.js";
import { sendEmail } from "./_sendEmail.js";
import { classify } from "./_documentTypes.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { respondentName, signerEmail, docType } = req.body || {};
    const name = (respondentName || "").trim();
    const label = docType || "Item Photos";
    if (!name) {
      res.status(400).json({ error: "Missing respondent name." });
      return;
    }

    const orgEmail = process.env.ORG_EMAIL;
    const parentFolderId = process.env.PHOTOS_FOLDER_ID || process.env.DRIVE_FOLDER_ID;
    if (!orgEmail) throw new Error("Missing ORG_EMAIL environment variable.");
    if (!parentFolderId) throw new Error("Missing DRIVE_FOLDER_ID environment variable.");

    const auth = getOAuthClient();
    const drive = google.drive({ version: "v3", auth });

    const folderTitle = `${label} - ${name}`;

    // Reuse an existing folder for this person if one already exists,
    // even if it's been moved into a subfolder for organization.
    const allFiles = await listAllFilesRecursive(drive, [parentFolderId]);
    const match = allFiles.find(
      (f) =>
        f.mimeType === "application/vnd.google-apps.folder" &&
        f.name.trim().toLowerCase() === folderTitle.trim().toLowerCase()
    );

    let folderId, link;

    if (match) {
      folderId = match.id;
      link = match.webViewLink;
    } else {
      const personFolderId = await getOrCreatePersonFolder(drive, parentFolderId, name);
      const folder = await drive.files.create({
        requestBody: {
          name: folderTitle,
          mimeType: "application/vnd.google-apps.folder",
          parents: [personFolderId],
        },
        fields: "id, webViewLink",
      });
      folderId = folder.data.id;
      link = folder.data.webViewLink;

      // Only make it viewable by anyone with the link for non-sensitive
      // uploads (like Item Photos). Sensitive types (like Proof of Income)
      // stay private — only shared with specific people below.
      const isSensitive = classify(`${label} - x`).sensitive;
      if (!isSensitive) {
        await drive.permissions.create({
          fileId: folderId,
          requestBody: { type: "anyone", role: "reader" },
        });
      }

      const recipients = isValidEmail(signerEmail) ? [signerEmail] : [];
      for (const email of recipients) {
        try {
          if (email !== orgEmail) {
            await drive.permissions.create({
              fileId: folderId,
              sendNotificationEmail: true,
              emailMessage: `Files are being uploaded to this shared folder (${label}).`,
              requestBody: { type: "user", role: "reader", emailAddress: email },
            });
          } else {
            await drive.permissions.create({
              fileId: folderId,
              requestBody: { type: "user", role: "reader", emailAddress: email },
            });
          }
        } catch (e) {
          // Non-fatal — the folder is already public-viewable regardless.
        }
      }

      try {
        await sendEmail(auth, {
          to: orgEmail,
          subject: folderTitle,
          body: `Files are being uploaded to this shared folder (${label}).\n\nView it here:\n${link}`,
        });
      } catch (e) {
        console.error("Org notification email failed (folder was still created):", e);
      }
    }

    res.status(200).json({ success: true, folderId, link });
  } catch (err) {
    console.error("create-photo-folder error:", err);
    res.status(500).json({ error: err.message || "Something went wrong creating the photo folder." });
  }
}
