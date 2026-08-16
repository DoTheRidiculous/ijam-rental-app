// api/list-photo-folders.js
//
// Lets staff search for an applicant's Item Photos folder by name, so the
// shareable link can be found and re-sent without digging through Drive or
// old emails. Searches only inside the photos parent folder.

import { google } from "googleapis";
import { getOAuthClient } from "./_googleAuth.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const parentFolderId = process.env.PHOTOS_FOLDER_ID || process.env.DRIVE_FOLDER_ID;
    if (!parentFolderId) throw new Error("Missing DRIVE_FOLDER_ID environment variable.");

    const rawQuery = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const safeQuery = rawQuery.replace(/[\\']/g, "\\$&");

    const auth = getOAuthClient();
    const drive = google.drive({ version: "v3", auth });

    let queryString = `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false and name contains 'Item Photos'`;
    if (safeQuery) {
      queryString += ` and name contains '${safeQuery}'`;
    }

    const result = await drive.files.list({
      q: queryString,
      fields: "files(id, name, webViewLink, createdTime)",
      orderBy: "createdTime desc",
      pageSize: 25,
    });

    res.status(200).json({ folders: result.data.files || [] });
  } catch (err) {
    console.error("list-photo-folders error:", err);
    res.status(500).json({ error: err.message || "Something went wrong searching for photo folders." });
  }
}
