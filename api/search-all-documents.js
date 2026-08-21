// api/search-all-documents.js
//
// Searches across every document/folder type this app creates for a given
// name, so staff can find everything for one person without opening Drive
// directly.

import { google } from "googleapis";
import { getOAuthClient } from "./_googleAuth.js";
import { classify } from "./_documentTypes.js";
import { listAllFilesRecursive } from "./_driveList.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const rawQuery = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
    if (!rawQuery) {
      res.status(400).json({ error: "Missing search query." });
      return;
    }

    const folderIds = [
      ...new Set([process.env.DRIVE_FOLDER_ID, process.env.PHOTOS_FOLDER_ID].filter(Boolean)),
    ];
    if (folderIds.length === 0) throw new Error("Missing DRIVE_FOLDER_ID environment variable.");

    const auth = getOAuthClient();
    const drive = google.drive({ version: "v3", auth });

    const allFiles = await listAllFilesRecursive(drive, folderIds);
    const matched = allFiles
      .filter((f) => f.name.toLowerCase().includes(rawQuery))
      .sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime))
      .slice(0, 50);

    const results = matched.map((f) => {
      const { type, sensitive } = classify(f.name);
      return {
        id: f.id,
        name: f.name,
        type,
        sensitive,
        isFolder: f.mimeType === "application/vnd.google-apps.folder",
        webViewLink: f.webViewLink,
        createdTime: f.createdTime,
      };
    });

    res.status(200).json({ results });
  } catch (err) {
    console.error("search-all-documents error:", err);
    res.status(500).json({ error: err.message || "Something went wrong searching." });
  }
}
