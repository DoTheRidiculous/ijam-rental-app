// api/send-template-email.js
//
// Sends a staff-composed email (built from a template) directly from the
// app, using the same Gmail connection already set up for org
// notifications.

import { getOAuthClient, isValidEmail } from "./_googleAuth.js";
import { sendEmail } from "./_sendEmail.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { to, subject, body } = req.body || {};
    if (!isValidEmail(to)) {
      res.status(400).json({ error: "A valid recipient email is required." });
      return;
    }
    if (!subject || !body) {
      res.status(400).json({ error: "Missing subject or body." });
      return;
    }

    const auth = getOAuthClient();
    await sendEmail(auth, { to, subject, body });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("send-template-email error:", err);
    res.status(500).json({ error: err.message || "Something went wrong sending this email." });
  }
}
