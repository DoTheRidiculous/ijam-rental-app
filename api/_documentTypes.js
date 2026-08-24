// api/_documentTypes.js
//
// Single source of truth for how to recognize which of our 9 form types a
// Drive file/folder belongs to, and how to pull the person's name out of its
// title. Used by list-known-names, search-all-documents, dashboard-data, and
// the Dashboard's timeline view, so they can never drift out of sync with
// each other.
//
// Order matters here — this is the real-world sequence documents get
// collected in. `sequential: true` means it's part of the fixed order the
// Dashboard uses to compute "what's needed next" for someone. Property Loan
// Agreement is `sequential: false` since it only applies situationally
// (whoever's lending an item), not to every applicant in order.

export const TYPE_PREFIXES = [
  { type: "Rental Application", prefix: "Rental Application - ", sensitive: true, hasDate: true, sequential: true },
  { type: "Proof of Income", prefix: "Proof of Income - ", sensitive: true, hasDate: false, sequential: true },
  { type: "Agreement to Lease", prefix: "Agreement to Lease - ", sensitive: false, hasDate: true, sequential: true },
  { type: "Residential Lease", prefix: "Residential Lease - ", sensitive: false, hasDate: true, sequential: true },
  { type: "Move-In Questionnaire", prefix: "Move-In Questionnaire - ", sensitive: false, hasDate: false, sequential: true },
  { type: "Item Storage & Donation Consent", prefix: "Item Storage & Donation Consent - ", sensitive: false, hasDate: false, sequential: true },
  { type: "Move Support Request", prefix: "Move Support Request - ", sensitive: false, hasDate: false, sequential: true },
  { type: "Item Photos", prefix: "Item Photos - ", sensitive: false, hasDate: false, sequential: true },
  { type: "Property Loan Agreement", prefix: "Property Loan Agreement - ", sensitive: false, hasDate: true, sequential: false },
];

export function classify(fileName) {
  for (const entry of TYPE_PREFIXES) {
    if (fileName.startsWith(entry.prefix)) return entry;
  }
  return { type: "Other", prefix: "", sensitive: false, hasDate: false };
}

export function extractName(fileName) {
  const entry = classify(fileName);
  if (!entry.prefix) return null;
  let rest = fileName.slice(entry.prefix.length);
  // Strip a trailing " - YYYY-MM-DD" if present, regardless of type. Some
  // types don't normally include a date, but older/legacy submissions
  // might — stripping it is harmless when there's nothing to strip, and
  // prevents one person from fragmenting into multiple dashboard rows.
  rest = rest.replace(/\s*-\s*\d{4}-\d{2}-\d{2}$/, "");
  rest = rest.trim();
  return rest || null;
}
