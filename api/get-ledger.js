// api/get-ledger.js
//
// Fetches a tenant's payment ledger — stored as a small JSON record inside a
// "Payment Ledger - {Name}" Doc in their person folder, since there's no
// real database. Returns an empty starting ledger if none exists yet.

import { google } from "googleapis";
import { getOAuthClient } from "./_googleAuth.js";
import { listAllFilesRecursive } from "./_driveList.js";

const EMPTY_LEDGER = { monthlyRent: "", tenantEmail: "", monthlyBills: [], payments: [] };

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const name = typeof req.query.name === "string" ? req.query.name.trim() : "";
    if (!name) {
      res.status(400).json({ error: "Missing name." });
      return;
    }

    const folderId = process.env.DRIVE_FOLDER_ID;
    if (!folderId) throw new Error("Missing DRIVE_FOLDER_ID environment variable.");

    const auth = getOAuthClient();
    const drive = google.drive({ version: "v3", auth });
    const docs = google.docs({ version: "v1", auth });

    const docTitle = `Payment Ledger - ${name}`;
    const allFiles = await listAllFilesRecursive(drive, [folderId]);
    const match = allFiles.find(
      (f) =>
        f.mimeType === "application/vnd.google-apps.document" &&
        f.name.trim().toLowerCase() === docTitle.trim().toLowerCase()
    );

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
  } catch (err) {
    console.error("get-ledger error:", err);
    res.status(500).json({ error: err.message || "Something went wrong loading the ledger." });
  }
}
