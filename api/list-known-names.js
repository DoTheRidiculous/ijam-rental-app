// api/list-known-names.js
//
// Returns a deduplicated list of names pulled from every document/folder
// this app has created, so search boxes can offer an autocomplete dropdown
// instead of requiring an exact typed match.

import { google } from "googleapis";
import { getOAuthClient } from "./_googleAuth.js";
import { extractName } from "./_documentTypes.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const folderIds = [
      ...new Set([process.env.DRIVE_FOLDER_ID, process.env.PHOTOS_FOLDER_ID].filter(Boolean)),
    ];
    if (folderIds.length === 0) throw new Error("Missing DRIVE_FOLDER_ID environment variable.");

    const auth = getOAuthClient();
    const drive = google.drive({ version: "v3", auth });

    const names = new Set();
    for (const folderId of folderIds) {
      const result = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: "files(name)",
        pageSize: 1000,
      });
      (result.data.files || []).forEach((f) => {
        const name = extractName(f.name);
        if (name) names.add(name);
      });
    }

    res.status(200).json({ names: Array.from(names).sort((a, b) => a.localeCompare(b)) });
  } catch (err) {
    console.error("list-known-names error:", err);
    res.status(500).json({ error: err.message || "Something went wrong listing names." });
  }
}
