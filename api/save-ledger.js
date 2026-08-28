// api/save-ledger.js
//
// Saves a tenant's payment ledger — overwrites the JSON content of their
// "Payment Ledger - {Name}" Doc, creating it (inside their person folder)
// if it doesn't exist yet.

import { google } from "googleapis";
import { getOAuthClient } from "./_googleAuth.js";
import { listAllFilesRecursive } from "./_driveList.js";
import { getOrCreatePersonFolder } from "./_personFolder.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { name, ledger } = req.body || {};
    if (!name || !ledger) {
      res.status(400).json({ error: "Missing name or ledger data." });
      return;
    }

    const folderId = process.env.DRIVE_FOLDER_ID;
    if (!folderId) throw new Error("Missing DRIVE_FOLDER_ID environment variable.");

    const auth = getOAuthClient();
    const drive = google.drive({ version: "v3", auth });
    const docs = google.docs({ version: "v1", auth });

    const docTitle = `Payment Ledger - ${name}`;
    const jsonText = JSON.stringify(ledger, null, 2);

    const allFiles = await listAllFilesRecursive(drive, [folderId]);
    const match = allFiles.find(
      (f) =>
        f.mimeType === "application/vnd.google-apps.document" &&
        f.name.trim().toLowerCase() === docTitle.trim().toLowerCase()
    );

    let docId;
    if (match) {
      docId = match.id;
      const doc = await docs.documents.get({ documentId: docId });
      const content = doc.data.body.content || [];
      const endIndex = content.length > 0 ? content[content.length - 1].endIndex : 1;

      const requests = [];
      if (endIndex > 2) {
        requests.push({ deleteContentRange: { range: { startIndex: 1, endIndex: endIndex - 1 } } });
      }
      requests.push({ insertText: { location: { index: 1 }, text: jsonText } });

      await docs.documents.batchUpdate({ documentId: docId, requestBody: { requests } });
    } else {
      const personFolderId = await getOrCreatePersonFolder(drive, folderId, name);
      const file = await drive.files.create({
        requestBody: { name: docTitle, mimeType: "application/vnd.google-apps.document", parents: [personFolderId] },
        fields: "id",
      });
      docId = file.data.id;
      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: { requests: [{ insertText: { location: { index: 1 }, text: jsonText } }] },
      });
    }

    res.status(200).json({ success: true, docId });
  } catch (err) {
    console.error("save-ledger error:", err);
    res.status(500).json({ error: err.message || "Something went wrong saving the ledger." });
  }
}
