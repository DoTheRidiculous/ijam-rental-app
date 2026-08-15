// api/upload-photo.js
//
// Uploads a single image into an existing Drive folder (created beforehand
// via /api/create-photo-folder). Photos are sent one at a time, already
// compressed client-side, to stay comfortably under Vercel's request size
// limit — a batch of full-resolution phone photos would blow past it in a
// single request.

import { google } from "googleapis";
import { Readable } from "stream";
import { getOAuthClient } from "./_googleAuth.js";

export const config = {
  api: {
    bodyParser: { sizeLimit: "4mb" },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { folderId, fileName, imageBase64 } = req.body || {};
    if (!folderId || !fileName || !imageBase64) {
      res.status(400).json({ error: "Missing folderId, fileName, or imageBase64." });
      return;
    }

    const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    const buffer = Buffer.from(base64Data, "base64");

    const auth = getOAuthClient();
    const drive = google.drive({ version: "v3", auth });

    const file = await drive.files.create({
      requestBody: { name: fileName, parents: [folderId] },
      media: { mimeType: "image/jpeg", body: Readable.from(buffer) },
      fields: "id, webViewLink",
    });

    res.status(200).json({ success: true, fileId: file.data.id });
  } catch (err) {
    console.error("upload-photo error:", err);
    res.status(500).json({ error: err.message || "Something went wrong uploading this photo." });
  }
}
