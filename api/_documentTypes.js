// api/_documentTypes.js
//
// Single source of truth for how to recognize which of our 8 form types a
// Drive file/folder belongs to, and how to pull the person's name out of its
// title. Used by list-known-names, search-all-documents, and dashboard-data
// so they can never drift out of sync with each other.

export const TYPE_PREFIXES = [
  { type: "Rental Application", prefix: "Rental Application - ", sensitive: true, hasDate: true },
  { type: "Agreement to Lease", prefix: "Agreement to Lease - ", sensitive: false, hasDate: true },
  { type: "Residential Lease", prefix: "Residential Lease - ", sensitive: false, hasDate: true },
  { type: "Move-In Questionnaire", prefix: "Move-In Questionnaire - ", sensitive: false, hasDate: false },
  { type: "Item Storage & Donation Consent", prefix: "Item Storage & Donation Consent - ", sensitive: false, hasDate: false },
  { type: "Move Support Request", prefix: "Move Support Request - ", sensitive: false, hasDate: false },
  { type: "Item Photos", prefix: "Item Photos - ", sensitive: false, hasDate: false },
  { type: "Property Loan Agreement", prefix: "Property Loan Agreement - ", sensitive: false, hasDate: true },
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
  if (entry.hasDate) {
    // Legal docs are titled "... - <Name> - <YYYY-MM-DD>" — strip the date.
    rest = rest.replace(/\s*-\s*\d{4}-\d{2}-\d{2}$/, "");
  }
  rest = rest.trim();
  return rest || null;
}
