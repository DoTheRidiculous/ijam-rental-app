// lib/orgRecipients.js
//
// ORG_EMAIL stays the one, single "primary" org address — it's used for
// Drive-sharing comparisons (checking whether a signer is the same account
// the app is connected as) and must remain a single address for that to
// work correctly. ORG_EMAIL_CC is optional and purely additive: if set, it
// gets included in the "To:" line of actual notification emails, but never
// affects Drive-sharing logic.

export function getOrgNotifyList() {
  return [process.env.ORG_EMAIL, process.env.ORG_EMAIL_CC].filter(Boolean).join(", ");
}
