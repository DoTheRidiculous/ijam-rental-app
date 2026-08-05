// api/submit-application.js
//
// Vercel serverless function. Receives the filled-in application from the
// browser, creates a Google Doc with that content in a shared Drive folder
// (using a service account — no per-applicant Google login required), then
// shares that doc with the applicant and the org email. Google's own share
// notification is what sends the "you've been shared a document" email to
// both people — no separate email service needed.
//
// Required environment variables (set these in the Vercel dashboard, never
// commit them to the repo):
//   GOOGLE_SERVICE_ACCOUNT_KEY_BASE64  - the service account JSON key file,
//                                        base64-encoded into one line
//   DRIVE_FOLDER_ID                    - the Drive folder (shared with the
//                                        service account) where submissions
//                                        should be created
//   ORG_EMAIL                          - your org's notification email
//                                        (e.g. Ijamhousing@gmail.com)

import { google } from "googleapis";

function getServiceAccountCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_KEY environment variable.");
  return JSON.parse(raw);
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { docTitle, docText, signerEmail } = req.body || {};

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

    const credentials = getServiceAccountCredentials();
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive = google.drive({ version: "v3", auth });
    const docs = google.docs({ version: "v1", auth });

    const file = await drive.files.create({
      requestBody: {
        name: docTitle,
        mimeType: "application/vnd.google-apps.document",
        parents: [folderId],
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

    const recipients = [...new Set([signerEmail, orgEmail])];
    for (const email of recipients) {
      await drive.permissions.create({
        fileId: docId,
        sendNotificationEmail: true,
        emailMessage: "Attached is the completed and signed Rental Application.",
        requestBody: { type: "user", role: "commenter", emailAddress: email },
      });
    }

    res.status(200).json({ success: true, link: file.data.webViewLink, docId });
  } catch (err) {
    console.error("submit-application error:", err);
    res.status(500).json({ error: err.message || "Something went wrong creating the document." });
  }
}
