// api/document-search.js
//
// Combines what used to be search-all-documents.js (GET) and
// create-document-packet.js (POST) into one function — Vercel's Hobby plan
// caps deployments at 12 serverless functions, so related endpoints are
// merged like this wherever it makes sense, dispatched by HTTP method.
//
// GET  ?q=name  — searches across every document/folder type for a name
// POST { name, items } — bundles non-sensitive items into one shareable
//                          packet doc; sensitive types are always excluded

import { google } from "googleapis";
import { getOAuthClient } from "../lib/googleAuth.js";
import { classify } from "../lib/documentTypes.js";
import { listAllFilesRecursive } from "../lib/driveList.js";

async function handleSearch(req, res, drive) {
  const rawQuery = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : "";
  if (!rawQuery) {
    res.status(400).json({ error: "Missing search query." });
    return;
  }

  const folderIds = [
    ...new Set([process.env.DRIVE_FOLDER_ID, process.env.PHOTOS_FOLDER_ID].filter(Boolean)),
  ];
  if (folderIds.length === 0) throw new Error("Missing DRIVE_FOLDER_ID environment variable.");

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
}

async function handleCreatePacket(req, res, drive, auth) {
  const { name, items } = req.body || {};
  if (!name || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "Missing name or items to include." });
    return;
  }

  const folderId = process.env.DRIVE_FOLDER_ID;
  if (!folderId) throw new Error("Missing DRIVE_FOLDER_ID environment variable.");

  // Server-side safety net — never include anything the shared classifier
  // considers sensitive, regardless of what the frontend already filtered.
  const safeItems = items.filter((it) => it && it.id && it.title && !classify(it.title).sensitive);
  if (safeItems.length === 0) {
    res.status(400).json({ error: "Nothing eligible to include (sensitive documents are excluded for privacy)." });
    return;
  }

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
}

export default async function handler(req, res) {
  try {
    const auth = getOAuthClient();
    const drive = google.drive({ version: "v3", auth });

    if (req.method === "GET") {
      await handleSearch(req, res, drive);
    } else if (req.method === "POST") {
      await handleCreatePacket(req, res, drive, auth);
    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (err) {
    console.error("document-search error:", err);
    res.status(500).json({ error: err.message || "Something went wrong." });
  }
}
