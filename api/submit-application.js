import { google } from "googleapis";
import { getOAuthClient, isValidEmail } from "./_googleAuth.js";
import { getOrCreatePersonFolder } from "./_personFolder.js";
import { sendEmail } from "./_sendEmail.js";

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
        requests: [{ insertText: { location: { index: 1 }, text: docText } }],
      },
    });

    // Share with the external signer — Drive's notification works fine here
    // since their account is different from the one the app is connected as.
    if (signerEmail !== orgEmail) {
      await drive.permissions.create({
        fileId: docId,
        sendNotificationEmail: true,
        emailMessage: shareMessage || "Attached is your completed and signed document.",
        requestBody: { type: "user", role: "commenter", emailAddress: signerEmail },
      });
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
        to: orgEmail,
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
