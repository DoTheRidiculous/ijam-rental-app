import React, { useState } from "react";
import {
  Search, Link2, Copy, Check, ArrowLeft, FileText, FileSignature, Home as HomeIcon,
  Boxes, Gift, Truck, Camera, File, ShieldAlert, Package,
} from "lucide-react";
import { CHARCOAL, SLATE, MIDGREY, LIGHTGREY, PALEGREY, useKnownNames } from "./formKit.jsx";

const TYPE_ICONS = {
  "Rental Application": FileText,
  "Agreement to Lease": FileSignature,
  "Residential Lease": HomeIcon,
  "Move-In Questionnaire": Boxes,
  "Item Storage & Donation Consent": Gift,
  "Move Support Request": Truck,
  "Item Photos": Camera,
  Other: File,
};

export default function DocumentSearchApp() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [packetLink, setPacketLink] = useState(null);
  const [packetLoading, setPacketLoading] = useState(false);
  const [packetCopied, setPacketCopied] = useState(false);
  const knownNames = useKnownNames();

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResults(null);
    setPacketLink(null);
    try {
      const res = await fetch(`/api/document-search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed.");
      setResults(data.results);
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

  const shareableResults = (results || []).filter((r) => !r.sensitive);
  const sensitiveResults = (results || []).filter((r) => r.sensitive);

  const createPacket = async () => {
    setPacketLoading(true);
    setError("");
    try {
      const items = shareableResults.map((r) => ({ id: r.id, title: r.name, link: r.webViewLink }));
      const res = await fetch("/api/document-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: query.trim(), items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create the packet.");
      setPacketLink(data.link);
    } catch (e) {
      setError(e.message || "Something went wrong creating the packet.");
    } finally {
      setPacketLoading(false);
    }
  };

  const copyPacketLink = async () => {
    try {
      await navigator.clipboard.writeText(packetLink);
      setPacketCopied(true);
      setTimeout(() => setPacketCopied(false), 2000);
    } catch (e) { /* clipboard unavailable */ }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: PALEGREY }}>
      <div className="max-w-2xl mx-auto px-5 py-10">
        <a href="/" className="inline-flex items-center gap-1.5 text-[13px] font-semibold mb-6" style={{ color: SLATE }}>
          <ArrowLeft size={15} /> Back
        </a>

        <p className="text-[12px] font-bold tracking-[0.15em] mb-1" style={{ color: MIDGREY }}>IJAM HOUSING</p>
        <h1 className="text-2xl font-bold mb-2" style={{ color: CHARCOAL }}>Search All Documents</h1>
        <p className="text-[14px] mb-8" style={{ color: SLATE }}>
          Search by name to find everything on file for one person — no need to open Drive directly.
        </p>

        <div className="flex gap-2 mb-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Search by name"
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
          <p className="text-[14px]" style={{ color: MIDGREY }}>No matching documents found. Try just their first name.</p>
        )}

        {results && results.length > 0 && (
          <>
            <div className="flex flex-col gap-3 mb-6">
              {results.map((r) => {
                const Icon = TYPE_ICONS[r.type] || File;
                return (
                  <div key={r.id} className="bg-white border rounded-xl p-5" style={{ borderColor: LIGHTGREY }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: PALEGREY }}>
                        <Icon size={18} color={CHARCOAL} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[15px] font-bold" style={{ color: CHARCOAL }}>{r.type}</p>
                          {r.sensitive && (
                            <span className="flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: "#F5F0EE", color: SLATE }}>
                              <ShieldAlert size={11} /> Sensitive
                            </span>
                          )}
                        </div>
                        <p className="text-[12px]" style={{ color: MIDGREY }}>{new Date(r.createdTime).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyLink(r.id, r.webViewLink)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-[13px] font-semibold text-white"
                        style={{ backgroundColor: CHARCOAL }}
                      >
                        {copiedId === r.id ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy Link</>}
                      </button>
                      <a
                        href={r.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-[13px] font-semibold border"
                        style={{ borderColor: LIGHTGREY, color: CHARCOAL }}
                      >
                        <Link2 size={14} /> Open
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>

            {shareableResults.length > 0 && (
              <div className="bg-white border rounded-xl p-5 sm:p-6" style={{ borderColor: LIGHTGREY }}>
                <div className="flex items-center gap-2 mb-2">
                  <Package size={16} color={SLATE} />
                  <span className="text-[13px] font-bold tracking-wide" style={{ color: SLATE }}>SEND TO SOMEONE ELSE</span>
                </div>
                <p className="text-[13px] mb-4" style={{ color: SLATE }}>
                  Creates one link with everything above{sensitiveResults.length > 0 ? ` except ${[...new Set(sensitiveResults.map((r) => r.type))].join(" and ")}, which ${sensitiveResults.length > 1 ? "are" : "is"} left out for privacy` : ""}.
                  Whoever opens it can view it without needing Drive access.
                </p>

                {!packetLink ? (
                  <button
                    onClick={createPacket}
                    disabled={packetLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-md text-[14px] font-bold text-white"
                    style={{ backgroundColor: CHARCOAL, opacity: packetLoading ? 0.6 : 1 }}
                  >
                    {packetLoading ? "Creating link…" : "Create Shareable Link"}
                  </button>
                ) : (
                  <>
                    <div className="text-[13px] font-mono p-3 rounded-md mb-3 break-all" style={{ backgroundColor: PALEGREY, color: CHARCOAL, border: `1px solid ${LIGHTGREY}` }}>
                      {packetLink}
                    </div>
                    <button
                      onClick={copyPacketLink}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-md text-[14px] font-bold text-white"
                      style={{ backgroundColor: CHARCOAL }}
                    >
                      {packetCopied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy Shareable Link</>}
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
