// api/send-handoff-link.js
//
// Emails the Property Loan Agreement hand-off link to staff automatically,
// using a real Gmail-sent email. (Previously this used a Drive-share
// notification as a workaround, but that silently fails when ORG_EMAIL is
// the same account the app is connected as — which it is here — so this
// sends a direct email instead.)

import { getOAuthClient } from "./_googleAuth.js";
import { sendEmail } from "./_sendEmail.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { link, ownerName } = req.body || {};
    if (!link) {
      res.status(400).json({ error: "Missing link to send." });
      return;
    }

    const orgEmail = process.env.ORG_EMAIL;
    if (!orgEmail) throw new Error("Missing ORG_EMAIL environment variable.");

    const auth = getOAuthClient();

    await sendEmail(auth, {
      to: orgEmail,
      subject: `Property Loan Agreement — ready for staff signature (${ownerName || "Owner"})`,
      body:
        `${ownerName || "The owner"} has completed and signed their part of the Property Loan Agreement.\n\n` +
        `Open this link to review their section and complete the Borrower (staff) signature:\n${link}\n`,
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("send-handoff-link error:", err);
    res.status(500).json({ error: err.message || "Something went wrong sending this to staff." });
  }
}
