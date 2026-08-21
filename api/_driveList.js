// api/_driveList.js
//
// Lists every file across one or more root folders, recursing into any
// subfolders (e.g. if staff manually organize documents into per-person
// folders in Drive). Returns both the files and the folders themselves,
// since some of our "documents" (like Item Photos) are folders.
//
// Guards against runaway recursion with a depth limit and a visited-set to
// avoid infinite loops if a folder is somehow nested in itself.

export async function listAllFilesRecursive(drive, rootFolderIds, maxDepth = 8) {
  const seen = new Set();
  const results = [];

  async function walk(folderId, depth) {
    if (depth > maxDepth || seen.has(folderId)) return;
    seen.add(folderId);

    let pageToken;
    do {
      const result = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: "nextPageToken, files(id, name, mimeType, webViewLink, createdTime)",
        pageSize: 1000,
        pageToken,
      });
      const files = result.data.files || [];
      for (const f of files) {
        results.push(f);
        if (f.mimeType === "application/vnd.google-apps.folder") {
          await walk(f.id, depth + 1);
        }
      }
      pageToken = result.data.nextPageToken || undefined;
    } while (pageToken);
  }

  for (const rootId of rootFolderIds) {
    await walk(rootId, 0);
  }

  // De-duplicate by id in case a folder is reachable from two root paths.
  const byId = new Map();
  for (const f of results) byId.set(f.id, f);
  return Array.from(byId.values());
}
