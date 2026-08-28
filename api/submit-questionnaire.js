// api/submit-questionnaire.js
//
// Separate from submit-application.js on purpose: the Move-In Questionnaire
// is not a signed/legal document, so unlike the Rental Application, Agreement
// to Lease, and Residential Lease, it's safe to find and overwrite an
// existing submission for the same person instead of always creating a new
// one. Those three signed forms must never get this treatment — each signed
// submission should remain a fixed, dated record.

import { google } from "googleapis";
import { getOAuthClient, isValidEmail } from "../lib/googleAuth.js";
import { listAllFilesRecursive } from "../lib/driveList.js";
import { getOrCreatePersonFolder } from "../lib/personFolder.js";
import { sendEmail } from "../lib/sendEmail.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { docTitle, docText, signerEmail, shareMessage, personName } = req.body || {};
    if (!docTitle || !docText) {
      res.status(400).json({ error: "Missing document title or content." });
      return;
    }

    const orgEmail = process.env.ORG_EMAIL;
    const folderId = process.env.DRIVE_FOLDER_ID;
    if (!orgEmail) throw new Error("Missing ORG_EMAIL environment variable.");
    if (!folderId) throw new Error("Missing DRIVE_FOLDER_ID environment variable.");

    const auth = getOAuthClient();
    const drive = google.drive({ version: "v3", auth });
    const docs = google.docs({ version: "v1", auth });

    const allFiles = await listAllFilesRecursive(drive, [folderId]);
    const match = allFiles.find(
      (f) =>
        f.mimeType === "application/vnd.google-apps.document" &&
        f.name.trim().toLowerCase() === docTitle.trim().toLowerCase()
    );

    let docId, link;
    let updated = false;

    if (match) {
      docId = match.id;
      link = match.webViewLink;
      updated = true;

      // Clear the existing content, then write the fresh version in its place.
      const doc = await docs.documents.get({ documentId: docId });
      const content = doc.data.body && doc.data.body.content;
      const endIndex = content && content.length ? content[content.length - 1].endIndex : 1;

      if (endIndex > 2) {
        await docs.documents.batchUpdate({
          documentId: docId,
          requestBody: {
            requests: [{ deleteContentRange: { range: { startIndex: 1, endIndex: endIndex - 1 } } }],
          },
        });
      }
      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: { requests: [{ insertText: { location: { index: 1 }, text: docText } }] },
      });
    } else {
      const personFolderId = await getOrCreatePersonFolder(drive, folderId, personName);
      const file = await drive.files.create({
        requestBody: { name: docTitle, mimeType: "application/vnd.google-apps.document", parents: [personFolderId] },
        fields: "id, webViewLink",
      });
      docId = file.data.id;
      link = file.data.webViewLink;

      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: { requests: [{ insertText: { location: { index: 1 }, text: docText } }] },
      });

      const recipients = isValidEmail(signerEmail) ? [signerEmail] : [];
      for (const email of recipients) {
        try {
          if (email !== orgEmail) {
            await drive.permissions.create({
              fileId: docId,
              sendNotificationEmail: true,
              emailMessage: shareMessage || "Attached is your completed document.",
              requestBody: { type: "user", role: "commenter", emailAddress: email },
            });
          } else {
            await drive.permissions.create({
              fileId: docId,
              requestBody: { type: "user", role: "commenter", emailAddress: email },
            });
          }
        } catch (e) {
          // Non-fatal
        }
      }

      // Notify the org's own inbox with a real email — Drive can't notify an
      // account of a file it already owns, so this uses Gmail directly.
      try {
        await sendEmail(auth, {
          to: orgEmail,
          subject: docTitle,
          body: `${shareMessage || "A new document was submitted."}\n\nView it here:\n${link}`,
        });
      } catch (e) {
        console.error("Org notification email failed (document was still saved):", e);
      }
    }

    res.status(200).json({ success: true, link, docId, updated });
  } catch (err) {
    console.error("submit-questionnaire error:", err);
    res.status(500).json({ error: err.message || "Something went wrong saving the questionnaire." });
  }
}
