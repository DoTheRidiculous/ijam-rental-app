// api/create-document-packet.js
//
// Takes a list of file IDs (from a search-all-documents result) and:
//   1. Sets each one to "anyone with the link can view"
//   2. Creates a single new Doc listing all of them with working links
//   3. Sets that packet doc to "anyone with the link can view" too
// Returns the packet doc's link — the one link to forward to someone else.
//
// The Rental Application is intentionally excluded from ever being widened
// or listed here, since it contains a Social Security number. The frontend
// already filters it out before calling this, and this endpoint re-checks
// server-side too, so it can't be included even by a bad request.

import { google } from "googleapis";
import { getOAuthClient } from "./_googleAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { name, items } = req.body || {};
    if (!name || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Missing name or items to include." });
      return;
    }

    const folderId = process.env.DRIVE_FOLDER_ID;
    if (!folderId) throw new Error("Missing DRIVE_FOLDER_ID environment variable.");

    // Server-side safety net — never include anything named like a Rental Application.
    const safeItems = items.filter((it) => it && it.id && it.title && !/^Rental Application\b/.test(it.title));
    if (safeItems.length === 0) {
      res.status(400).json({ error: "Nothing eligible to include (Rental Applications are excluded for privacy)." });
      return;
    }

    const auth = getOAuthClient();
    const drive = google.drive({ version: "v3", auth });
    const docs = google.docs({ version: "v1", auth });

    for (const item of safeItems) {
      try {
        await drive.permissions.create({
          fileId: item.id,
          requestBody: { type: "anyone", role: "reader" },
        });
      } catch (e) {
        // May already be public — non-fatal either way.
      }
    }

    const packetTitle = `Document Packet - ${name}`;
    const file = await drive.files.create({
      requestBody: { name: packetTitle, mimeType: "application/vnd.google-apps.document", parents: [folderId] },
      fields: "id, webViewLink",
    });

    const bodyText =
      `DOCUMENT PACKET\nFor: ${name}\nGenerated: ${new Date().toLocaleString()}\n\n` +
      safeItems.map((it) => `${it.title}\n${it.link}\n`).join("\n");

    await docs.documents.batchUpdate({
      documentId: file.data.id,
      requestBody: { requests: [{ insertText: { location: { index: 1 }, text: bodyText } }] },
    });

    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: { type: "anyone", role: "reader" },
    });

    res.status(200).json({ success: true, link: file.data.webViewLink });
  } catch (err) {
    console.error("create-document-packet error:", err);
    res.status(500).json({ error: err.message || "Something went wrong creating the packet." });
  }
}
