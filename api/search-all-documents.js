// api/search-all-documents.js
//
// Searches across every document/folder type this app creates for a given
// name, so staff can find everything for one person without opening Drive
// directly.

import { google } from "googleapis";
import { getOAuthClient } from "./_googleAuth.js";
import { classify } from "./_documentTypes.js";

function escapeForDriveQuery(str) {
  return str.replace(/[\\']/g, "\\$&");
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const rawQuery = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!rawQuery) {
      res.status(400).json({ error: "Missing search query." });
      return;
    }
    const safeQuery = escapeForDriveQuery(rawQuery);

    const folderIds = [
      ...new Set([process.env.DRIVE_FOLDER_ID, process.env.PHOTOS_FOLDER_ID].filter(Boolean)),
    ];
    if (folderIds.length === 0) throw new Error("Missing DRIVE_FOLDER_ID environment variable.");

    const auth = getOAuthClient();
    const drive = google.drive({ version: "v3", auth });

    const allFiles = [];
    for (const folderId of folderIds) {
      const result = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false and name contains '${safeQuery}'`,
        fields: "files(id, name, mimeType, webViewLink, createdTime)",
        orderBy: "createdTime desc",
        pageSize: 50,
      });
      allFiles.push(...(result.data.files || []));
    }

    const results = allFiles.map((f) => {
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
