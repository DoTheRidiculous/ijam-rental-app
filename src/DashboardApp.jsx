import React, { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Check, X, Loader2, AlertTriangle, ShieldAlert, Search } from "lucide-react";
import { CHARCOAL, SLATE, MIDGREY, LIGHTGREY, PALEGREY } from "./formKit.jsx";

const SHORT_LABELS = {
  "Rental Application": "Rental App",
  "Proof of Income": "Income Docs",
  "Agreement to Lease": "Agreement",
  "Residential Lease": "Lease",
  "Move-In Questionnaire": "Questionnaire",
  "Item Storage & Donation Consent": "Storage",
  "Move Support Request": "Move Support",
  "Item Photos": "Photos",
  "Property Loan Agreement": "Loan Agmt",
};

export default function DashboardApp() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/dashboard-data")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message || "Something went wrong loading the dashboard."))
      .finally(() => setLoading(false));
  }, []);

  const filteredApplicants = useMemo(() => {
    if (!data) return [];
    if (!query.trim()) return data.applicants;
    const q = query.trim().toLowerCase();
    return data.applicants.filter((a) => a.name.toLowerCase().includes(q));
  }, [data, query]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: PALEGREY }}>
      <div className="max-w-6xl mx-auto px-5 py-10">
        <a href="/" className="inline-flex items-center gap-1.5 text-[13px] font-semibold mb-6" style={{ color: SLATE }}>
          <ArrowLeft size={15} /> Back
        </a>

        <p className="text-[12px] font-bold tracking-[0.15em] mb-1" style={{ color: MIDGREY }}>IJAM HOUSING</p>
        <h1 className="text-2xl font-bold mb-2" style={{ color: CHARCOAL }}>Progress Dashboard</h1>
        <p className="text-[14px] mb-6" style={{ color: SLATE }}>
          Which forms each person has completed, pulled live from Drive. Click any checkmark to open that document.
        </p>

        {loading && (
          <div className="flex items-center gap-2 text-[14px]" style={{ color: SLATE }}>
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        )}

        {error && (
          <div className="p-4 rounded-md flex gap-3 mb-6" style={{ backgroundColor: "#F5F0EE" }}>
            <AlertTriangle size={18} style={{ color: SLATE, flexShrink: 0 }} />
            <p className="text-[13px]" style={{ color: CHARCOAL }}>{error}</p>
          </div>
        )}

        {data && (
          <>
            <div className="relative mb-5" style={{ maxWidth: 320 }}>
              <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: MIDGREY }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter by name"
                className="w-full rounded-md border pl-9 pr-3 py-2.5 text-[14px] outline-none"
                style={{ borderColor: LIGHTGREY, color: CHARCOAL, backgroundColor: "#fff" }}
              />
            </div>

            {filteredApplicants.length === 0 ? (
              <p className="text-[14px]" style={{ color: MIDGREY }}>No one matches that filter yet.</p>
            ) : (
              <div className="bg-white border rounded-xl overflow-x-auto" style={{ borderColor: LIGHTGREY }}>
                <table className="w-full text-left border-collapse" style={{ minWidth: 780 }}>
                  <thead>
                    <tr>
                      <th
                        className="sticky left-0 bg-white text-[12px] font-bold px-4 py-3 whitespace-nowrap"
                        style={{ color: SLATE, borderBottom: `1px solid ${LIGHTGREY}` }}
                      >
                        Name
                      </th>
                      {data.types.map((t) => (
                        <th
                          key={t}
                          title={t}
                          className="text-[11px] font-bold px-3 py-3 text-center whitespace-nowrap"
                          style={{ color: SLATE, borderBottom: `1px solid ${LIGHTGREY}` }}
                        >
                          {SHORT_LABELS[t] || t}
                          {(t === "Rental Application" || t === "Proof of Income") && (
                            <span title="Sensitive — link opens directly in Drive, not shared publicly">
                              <ShieldAlert size={11} style={{ display: "inline", marginLeft: 3, color: MIDGREY }} />
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplicants.map((a, i) => (
                      <tr key={a.name} style={{ backgroundColor: i % 2 === 1 ? PALEGREY : "#fff" }}>
                        <td
                          className="sticky left-0 text-[14px] font-semibold px-4 py-3 whitespace-nowrap"
                          style={{ color: CHARCOAL, backgroundColor: i % 2 === 1 ? PALEGREY : "#fff", borderBottom: `1px solid ${LIGHTGREY}` }}
                        >
                          {a.name}
                        </td>
                        {data.types.map((t) => {
                          const status = a.statuses[t];
                          return (
                            <td key={t} className="text-center px-3 py-3" style={{ borderBottom: `1px solid ${LIGHTGREY}` }}>
                              {status ? (
                                <a
                                  href={status.link}
                                  target="_blank"
                                  rel="noreferrer"
                                  title={`Completed ${new Date(status.date).toLocaleDateString()}${status.count > 1 ? ` (${status.count} versions)` : ""}`}
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-full"
                                  style={{ backgroundColor: CHARCOAL }}
                                >
                                  <Check size={14} color="#fff" />
                                </a>
                              ) : (
                                <span
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-full border"
                                  style={{ borderColor: LIGHTGREY, color: LIGHTGREY }}
                                >
                                  <X size={14} />
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="text-[12px] mt-5" style={{ color: MIDGREY }}>
              Not every form applies to every person — e.g. the Property Loan Agreement only applies to whoever's lending an item. An empty box just means no document was found, not necessarily that something's missing.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
