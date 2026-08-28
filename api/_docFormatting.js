// api/_docFormatting.js
//
// Turns the plain text these forms already generate into properly formatted
// Google Docs — a centered bold title, a small grey "Submitted:" line, and
// bold section headers — so signed documents read like a real, professional
// lease instead of a flat text dump. Header detection is heuristic (numbered
// sections, or short all-caps lines) so every form's existing output
// benefits without needing to be individually rewritten.

function isHeaderLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.includes(":")) return false; // field lines like "Name: John"
  const withoutNumber = trimmed.replace(/^\d+\.\s+/, ""); // strip a leading "1. " if present
  if (withoutNumber.length === 0 || withoutNumber.length > 60) return false;
  const lettersOnly = withoutNumber.replace(/[^A-Za-z]/g, "");
  if (lettersOnly.length < 2) return false;
  return lettersOnly === lettersOnly.toUpperCase(); // whole remaining text is caps
}

export function buildFormattedRequests(docText) {
  const lines = docText.split("\n");
  const requests = [];
  let index = 1; // Docs body content starts at index 1

  function insert(text, textStyle, paragraphStyle) {
    if (!text) return;
    requests.push({ insertText: { location: { index }, text } });
    const start = index;
    const end = index + text.length;
    if (textStyle) {
      requests.push({
        updateTextStyle: {
          range: { startIndex: start, endIndex: end },
          textStyle,
          fields: Object.keys(textStyle).join(","),
        },
      });
    }
    if (paragraphStyle) {
      requests.push({
        updateParagraphStyle: {
          range: { startIndex: start, endIndex: end },
          paragraphStyle,
          fields: Object.keys(paragraphStyle).join(","),
        },
      });
    }
    index = end;
  }

  // Title — first line, bold, larger, centered.
  insert(
    `${lines[0] || ""}\n`,
    { bold: true, fontSize: { magnitude: 16, unit: "PT" } },
    { alignment: "CENTER" }
  );

  // "Submitted:" line — second line, small and grey, still centered.
  const submittedLine = lines[1] || "";
  if (submittedLine.trim()) {
    insert(
      `${submittedLine}\n\n`,
      {
        italic: true,
        fontSize: { magnitude: 9, unit: "PT" },
        foregroundColor: { color: { rgbColor: { red: 0.4, green: 0.4, blue: 0.4 } } },
      },
      { alignment: "CENTER" }
    );
  } else {
    insert("\n", { fontSize: { magnitude: 11, unit: "PT" } }, {});
  }

  // Everything else — bold headers, normal body text, left-aligned.
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i];
    if (isHeaderLine(line)) {
      insert(`${line.trim()}\n`, { bold: true, fontSize: { magnitude: 12, unit: "PT" } }, { alignment: "START" });
    } else {
      insert(`${line}\n`, { bold: false, fontSize: { magnitude: 11, unit: "PT" } }, { alignment: "START" });
    }
  }

  return requests;
}
