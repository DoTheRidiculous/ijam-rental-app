// api/ledger.js
//
// Combines what used to be get-ledger.js and save-ledger.js into one
// function (GET to fetch, POST to save) — Vercel's Hobby plan caps
// deployments at 12 serverless functions, so related endpoints are merged
// like this wherever it makes sense, dispatched by HTTP method.
//
// Stores a tenant's payment ledger as a small JSON record inside a
// "Payment Ledger - {Name}" Doc in their person folder, since there's no
// real database.

import { google } from "googleapis";
import { getOAuthClient } from "../lib/googleAuth.js";
import { listAllFilesRecursive } from "../lib/driveList.js";
import { getOrCreatePersonFolder } from "../lib/personFolder.js";

const EMPTY_LEDGER = { monthlyRent: "", tenantEmail: "", monthlyBills: [], payments: [] };

async function findLedgerDoc(drive, folderId, docTitle) {
  const allFiles = await listAllFilesRecursive(drive, [folderId]);
  return allFiles.find(
    (f) =>
      f.mimeType === "application/vnd.google-apps.document" &&
      f.name.trim().toLowerCase() === docTitle.trim().toLowerCase()
  );
}

async function handleGet(req, res, auth, folderId) {
  const name = typeof req.query.name === "string" ? req.query.name.trim() : "";
  if (!name) {
    res.status(400).json({ error: "Missing name." });
    return;
  }

  const drive = google.drive({ version: "v3", auth });
  const docs = google.docs({ version: "v1", auth });
  const docTitle = `Payment Ledger - ${name}`;
  const match = await findLedgerDoc(drive, folderId, docTitle);

  if (!match) {
    res.status(200).json({ exists: false, ledger: EMPTY_LEDGER });
    return;
  }

  const doc = await docs.documents.get({ documentId: match.id });
  const bodyText = (doc.data.body.content || [])
    .map((el) => (el.paragraph?.elements || []).map((e) => e.textRun?.content || "").join(""))
    .join("");

  let ledger;
  try {
    ledger = { ...EMPTY_LEDGER, ...JSON.parse(bodyText) };
  } catch (e) {
    ledger = EMPTY_LEDGER;
  }

  res.status(200).json({ exists: true, docId: match.id, ledger });
}

async function handlePost(req, res, auth, folderId) {
  const { name, ledger } = req.body || {};
  if (!name || !ledger) {
    res.status(400).json({ error: "Missing name or ledger data." });
    return;
  }

  const drive = google.drive({ version: "v3", auth });
  const docs = google.docs({ version: "v1", auth });
  const docTitle = `Payment Ledger - ${name}`;
  const jsonText = JSON.stringify(ledger, null, 2);
  const match = await findLedgerDoc(drive, folderId, docTitle);

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
}

export default async function handler(req, res) {
  try {
    const folderId = process.env.DRIVE_FOLDER_ID;
    if (!folderId) throw new Error("Missing DRIVE_FOLDER_ID environment variable.");
    const auth = getOAuthClient();

    if (req.method === "GET") {
      await handleGet(req, res, auth, folderId);
    } else if (req.method === "POST") {
      await handlePost(req, res, auth, folderId);
    } else {
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (err) {
    console.error("ledger error:", err);
    res.status(500).json({ error: err.message || "Something went wrong with the ledger." });
  }
}
