// api/photo-upload.js
//
// Combines what used to be create-photo-folder.js and upload-photo.js into
// one function — Vercel's Hobby plan caps deployments at 12 serverless
// functions, so related endpoints are merged like this wherever it makes
// sense, dispatched by an `action` field in the request body.
//
// action: "create-folder" — finds or creates a person's upload folder
// action: "upload" — uploads a single file into an existing folder

import { google } from "googleapis";
import { Readable } from "stream";
import { getOAuthClient, isValidEmail } from "../lib/googleAuth.js";
import { listAllFilesRecursive } from "../lib/driveList.js";
import { getOrCreatePersonFolder } from "../lib/personFolder.js";
import { sendEmail } from "../lib/sendEmail.js";
import { classify } from "../lib/documentTypes.js";

export const config = {
  api: {
    bodyParser: { sizeLimit: "8mb" },
  },
};

async function handleCreateFolder(req, res, auth) {
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
}

async function handleUpload(req, res, auth) {
  const { folderId, fileName, imageBase64, mimeType } = req.body || {};
  if (!folderId || !fileName || !imageBase64) {
    res.status(400).json({ error: "Missing folderId, fileName, or file data." });
    return;
  }

  const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
  const buffer = Buffer.from(base64Data, "base64");

  const drive = google.drive({ version: "v3", auth });
  const file = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType: mimeType || "image/jpeg", body: Readable.from(buffer) },
    fields: "id, webViewLink",
  });

  res.status(200).json({ success: true, fileId: file.data.id });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const auth = getOAuthClient();
    const action = req.body?.action;

    if (action === "upload") {
      await handleUpload(req, res, auth);
    } else {
      // Default to create-folder for backward compatibility with any
      // callers that don't send an explicit action.
      await handleCreateFolder(req, res, auth);
    }
  } catch (err) {
    console.error("photo-upload error:", err);
    res.status(500).json({ error: err.message || "Something went wrong." });
  }
}
