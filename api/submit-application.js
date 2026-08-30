import { google } from "googleapis";
import { getOAuthClient, isValidEmail } from "../lib/googleAuth.js";
import { getOrCreatePersonFolder } from "../lib/personFolder.js";
import { sendEmail } from "../lib/sendEmail.js";
import { buildFormattedRequests } from "../lib/docFormatting.js";
import { getOrgNotifyList } from "../lib/orgRecipients.js";

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
    if (!isValidEmail(signerEmail)) {
      res.status(400).json({ error: "A valid signer email is required." });
      return;
    }

    const orgEmail = process.env.ORG_EMAIL;
    const folderId = process.env.DRIVE_FOLDER_ID;
    if (!orgEmail) throw new Error("Missing ORG_EMAIL environment variable.");
    if (!folderId) throw new Error("Missing DRIVE_FOLDER_ID environment variable.");

    const auth = getOAuthClient();
    const drive = google.drive({ version: "v3", auth });
    const docs = google.docs({ version: "v1", auth });

    const personFolderId = await getOrCreatePersonFolder(drive, folderId, personName);

    const file = await drive.files.create({
      requestBody: {
        name: docTitle,
        mimeType: "application/vnd.google-apps.document",
        parents: [personFolderId],
      },
      fields: "id, webViewLink",
    });
    const docId = file.data.id;

    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: buildFormattedRequests(docText),
      },
    });

    // Share with the external signer — Drive's notification works fine here
    // since their account is different from the one the app is connected as.
    if (signerEmail !== orgEmail) {
      await drive.permissions.create({
        fileId: docId,
        requestBody: { type: "user", role: "commenter", emailAddress: signerEmail },
      });

      // Send the actual content directly in a real email — a bare Drive
      // share notification requires clicking through and signing into a
      // matching Google account, which is a bad experience for something
      // like a WiFi password someone needs to read right away.
      try {
        await sendEmail(auth, {
          to: signerEmail,
          subject: docTitle,
          body: `${docText}\n\nView the saved copy here:\n${file.data.webViewLink}`,
        });
      } catch (e) {
        console.error("Signer email failed (document was still saved and shared via Drive):", e);
      }
    } else {
      await drive.permissions.create({
        fileId: docId,
        requestBody: { type: "user", role: "commenter", emailAddress: signerEmail },
      });
    }

    // Notify the org's own inbox with a real email — Drive can't notify an
    // account of a file it already owns, so this uses Gmail directly.
    try {
      await sendEmail(auth, {
        to: getOrgNotifyList(),
        subject: docTitle,
        body: `${shareMessage || "A document was completed and signed."}\n\nView it here:\n${file.data.webViewLink}`,
      });
    } catch (e) {
      console.error("Org notification email failed (document was still saved):", e);
    }

    res.status(200).json({ success: true, link: file.data.webViewLink, docId });
  } catch (err) {
    console.error("submit-application error:", err);
    res.status(500).json({ error: err.message || "Something went wrong creating the document." });
  }
}
