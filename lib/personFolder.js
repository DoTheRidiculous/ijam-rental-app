// api/_personFolder.js
//
// Every document type routes through this so the first document created for
// someone automatically gets them a folder, and every document after that —
// regardless of which form it came from — lands in that same folder.

import { listAllFilesRecursive } from "./driveList.js";

export async function getOrCreatePersonFolder(drive, parentFolderId, personName) {
  const name = (personName || "").trim();
  if (!name) return parentFolderId; // no name to key off of — fall back to the shared root

  const allFiles = await listAllFilesRecursive(drive, [parentFolderId]);
  const match = allFiles.find(
    (f) =>
      f.mimeType === "application/vnd.google-apps.folder" &&
      f.name.trim().toLowerCase() === name.toLowerCase()
  );
  if (match) return match.id;

  const folder = await drive.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: [parentFolderId] },
    fields: "id",
  });
  return folder.data.id;
}
