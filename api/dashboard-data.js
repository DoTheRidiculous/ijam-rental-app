// api/dashboard-data.js
//
// Lists every file across the Drive folders once, classifies each by type
// and applicant name, and returns a completion matrix: for each person,
// which of the 9 form types they have on file, when the most recent one was
// submitted, a link to it, and their computed "next step" based on the real
// document sequence. This powers the staff progress dashboard/timeline.

import { google } from "googleapis";
import { getOAuthClient } from "../lib/googleAuth.js";
import { TYPE_PREFIXES, classify, extractName } from "../lib/documentTypes.js";
import { listAllFilesRecursive } from "../lib/driveList.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const folderIds = [
      ...new Set([process.env.DRIVE_FOLDER_ID, process.env.PHOTOS_FOLDER_ID].filter(Boolean)),
    ];
    if (folderIds.length === 0) throw new Error("Missing DRIVE_FOLDER_ID environment variable.");

    const auth = getOAuthClient();
    const drive = google.drive({ version: "v3", auth });

    const allFiles = await listAllFilesRecursive(drive, folderIds);

    const applicants = {}; // name -> { [type]: { completed, date, link, count } }

    for (const f of allFiles) {
      const entry = classify(f.name);
      if (!entry.prefix) continue; // unrecognized file — skip
      const name = extractName(f.name);
      if (!name) continue;

      if (!applicants[name]) applicants[name] = {};
      const existing = applicants[name][entry.type];

      if (!existing) {
        applicants[name][entry.type] = {
          completed: true,
          date: f.createdTime,
          link: f.webViewLink,
          count: 1,
        };
      } else {
        existing.count += 1;
        if (new Date(f.createdTime) > new Date(existing.date)) {
          existing.date = f.createdTime;
          existing.link = f.webViewLink;
        }
      }
    }

    const types = TYPE_PREFIXES.map((t) => t.type);
    const sequentialTypes = TYPE_PREFIXES.filter((t) => t.sequential).map((t) => t.type);

    const result = Object.entries(applicants)
      .map(([name, statuses]) => {
        const nextStep = sequentialTypes.find((t) => !statuses[t]) || null;
        return { name, statuses, nextStep };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({ types, sequentialTypes, applicants: result });
  } catch (err) {
    console.error("dashboard-data error:", err);
    res.status(500).json({ error: err.message || "Something went wrong loading the dashboard." });
  }
}
