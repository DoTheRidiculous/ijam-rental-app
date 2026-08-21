// api/list-photo-folders.js
//
// Lets staff search for an applicant's Item Photos folder by name, so the
// shareable link can be found and re-sent without digging through Drive or
// old emails. Searches only inside the photos parent folder.

import { google } from "googleapis";
import { getOAuthClient } from "./_googleAuth.js";
import { listAllFilesRecursive } from "./_driveList.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const parentFolderId = process.env.PHOTOS_FOLDER_ID || process.env.DRIVE_FOLDER_ID;
    if (!parentFolderId) throw new Error("Missing DRIVE_FOLDER_ID environment variable.");

    const rawQuery = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";

    const auth = getOAuthClient();
    const drive = google.drive({ version: "v3", auth });

    const allFiles = await listAllFilesRecursive(drive, [parentFolderId]);
    const folders = allFiles
      .filter((f) => f.mimeType === "application/vnd.google-apps.folder" && f.name.includes("Item Photos"))
      .filter((f) => !rawQuery || f.name.toLowerCase().includes(rawQuery))
      .sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime))
      .slice(0, 25)
      .map((f) => ({ id: f.id, name: f.name, webViewLink: f.webViewLink, createdTime: f.createdTime }));

    res.status(200).json({ folders });
  } catch (err) {
    console.error("list-photo-folders error:", err);
    res.status(500).json({ error: err.message || "Something went wrong searching for photo folders." });
  }
}
