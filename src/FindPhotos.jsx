import React, { useState } from "react";
import { Search, Link2, Copy, Check, ArrowLeft, Camera } from "lucide-react";
import { CHARCOAL, SLATE, MIDGREY, LIGHTGREY, PALEGREY, useKnownNames } from "./formKit.jsx";

export default function FindPhotos() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const knownNames = useKnownNames();

  const search = async () => {
    if (!query.trim()) {
      setError("Type a name to search for.");
      setResults(null);
      return;
    }
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const res = await fetch(`/api/search-all-documents?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed.");
      const folders = (data.results || []).filter((r) => r.type === "Item Photos" && r.isFolder);
      setResults(folders);
    } catch (e) {
      setError(e.message || "Something went wrong searching.");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async (id, link) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) { /* clipboard unavailable */ }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: PALEGREY }}>
      <div className="max-w-2xl mx-auto px-5 py-10">
        <a href="/" className="inline-flex items-center gap-1.5 text-[13px] font-semibold mb-6" style={{ color: SLATE }}>
          <ArrowLeft size={15} /> Back
        </a>

        <p className="text-[12px] font-bold tracking-[0.15em] mb-1" style={{ color: MIDGREY }}>IJAM HOUSING</p>
        <h1 className="text-2xl font-bold mb-2" style={{ color: CHARCOAL }}>Find an Applicant's Photos</h1>
        <p className="text-[14px] mb-8" style={{ color: SLATE }}>
          Search by name to find their item-photos folder link, ready to copy and share with the team.
        </p>

        <div className="flex gap-2 mb-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Applicant name"
            list="known-applicant-names"
            className="flex-1 rounded-md border px-3 py-2.5 text-[15px] outline-none"
            style={{ borderColor: LIGHTGREY, color: CHARCOAL, backgroundColor: "#fff" }}
          />
          <datalist id="known-applicant-names">
            {knownNames.map((n) => <option key={n} value={n} />)}
          </datalist>
          <button
            onClick={search}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md text-[14px] font-semibold text-white"
            style={{ backgroundColor: CHARCOAL, opacity: loading ? 0.6 : 1 }}
          >
            <Search size={16} /> {loading ? "Searching…" : "Search"}
          </button>
        </div>

        {error && <p className="text-[13px] mb-4" style={{ color: SLATE }}>{error}</p>}

        {results && results.length === 0 && !error && (
          <p className="text-[14px]" style={{ color: MIDGREY }}>No matching photo folders found. Try just their first name.</p>
        )}

        <div className="flex flex-col gap-3">
          {results && results.map((f) => (
            <div key={f.id} className="bg-white border rounded-xl p-5" style={{ borderColor: LIGHTGREY }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: PALEGREY }}>
                  <Camera size={18} color={CHARCOAL} />
                </div>
                <div>
                  <p className="text-[15px] font-bold" style={{ color: CHARCOAL }}>{f.name}</p>
                  <p className="text-[12px]" style={{ color: MIDGREY }}>First uploaded {new Date(f.createdTime).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => copyLink(f.id, f.webViewLink)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-[13px] font-semibold text-white"
                  style={{ backgroundColor: CHARCOAL }}
                >
                  {copiedId === f.id ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy Link</>}
                </button>
                <a
                  href={f.webViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-[13px] font-semibold border"
                  style={{ borderColor: LIGHTGREY, color: CHARCOAL }}
                >
                  <Link2 size={14} /> Open
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
