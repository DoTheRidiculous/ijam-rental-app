// api/upload-photo.js
//
// Uploads a single file into an existing Drive folder (created beforehand
// via /api/create-photo-folder). Files are sent one at a time, already
// compressed/prepared client-side, to stay comfortably under Vercel's
// request size limit. Originally built for photos (hence the name), but
// also handles PDFs and other document types via the mimeType field.

import { google } from "googleapis";
import { Readable } from "stream";
import { getOAuthClient } from "./_googleAuth.js";

export const config = {
  api: {
    bodyParser: { sizeLimit: "8mb" },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { folderId, fileName, imageBase64, mimeType } = req.body || {};
    if (!folderId || !fileName || !imageBase64) {
      res.status(400).json({ error: "Missing folderId, fileName, or file data." });
      return;
    }

    const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    const buffer = Buffer.from(base64Data, "base64");

    const auth = getOAuthClient();
    const drive = google.drive({ version: "v3", auth });

    const file = await drive.files.create({
      requestBody: { name: fileName, parents: [folderId] },
      media: { mimeType: mimeType || "image/jpeg", body: Readable.from(buffer) },
      fields: "id, webViewLink",
    });

    res.status(200).json({ success: true, fileId: file.data.id });
  } catch (err) {
    console.error("upload-photo error:", err);
    res.status(500).json({ error: err.message || "Something went wrong uploading this file." });
  }
}
