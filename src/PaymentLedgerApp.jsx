import React, { useState, useMemo } from "react";
import { ArrowLeft, Receipt, Search, Plus, Zap, Wifi, Loader2, AlertTriangle, ChevronLeft, ChevronRight, Mail, Check } from "lucide-react";
import { CHARCOAL, SLATE, MIDGREY, LIGHTGREY, PALEGREY, INK, useKnownNames, todayStr } from "./formKit.jsx";

const TYPE_COLORS = {
  Rent: { bg: "#EAF3DE", text: "#27500A" },
  Electric: { bg: "#FAECE7", text: "#712B13" },
  WiFi: { bg: "#E6F1FB", text: "#0C447C" },
  Other: { bg: PALEGREY, text: SLATE },
};

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7); // YYYY-MM
}

function monthLabel(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

function shiftMonth(monthKey, delta) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function PaymentLedgerApp() {
  const [query, setQuery] = useState("");
  const [activeName, setActiveName] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [viewMonth, setViewMonth] = useState(currentMonthKey());
  const [sendReceipt, setSendReceipt] = useState(true);
  const [receiptStatus, setReceiptStatus] = useState("");
  const knownNames = useKnownNames();

  const [newPayment, setNewPayment] = useState({ date: todayStr(), amount: "", appliesTo: "Rent", method: "Zelle", note: "" });

  const loadLedger = async (name) => {
    setLoading(true);
    setError("");
    setLedger(null);
    setViewMonth(currentMonthKey());
    try {
      const res = await fetch(`/api/ledger?name=${encodeURIComponent(name)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load ledger.");
      setLedger(data.ledger);
      setActiveName(name);
      setSendReceipt(!!data.ledger.tenantEmail);
    } catch (e) {
      setError(e.message || "Something went wrong loading the ledger.");
    } finally {
      setLoading(false);
    }
  };

  const saveLedger = async (updatedLedger) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: activeName, ledger: updatedLedger }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save ledger.");
      setLedger(updatedLedger);
    } catch (e) {
      setError(e.message || "Something went wrong saving the ledger.");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key, value) => setLedger((l) => ({ ...l, [key]: value }));
  const saveField = () => saveLedger(ledger);

  const getBillForMonth = (monthKey) => (ledger.monthlyBills || []).find((b) => b.month === monthKey) || { month: monthKey, electric: "", wifi: "" };

  const updateBillForMonth = (field, value) => {
    setLedger((l) => {
      const bills = [...(l.monthlyBills || [])];
      const idx = bills.findIndex((b) => b.month === viewMonth);
      if (idx >= 0) bills[idx] = { ...bills[idx], [field]: value };
      else bills.push({ month: viewMonth, electric: "", wifi: "", [field]: value });
      return { ...l, monthlyBills: bills };
    });
  };

  const logPayment = async () => {
    if (!newPayment.amount || isNaN(parseFloat(newPayment.amount))) {
      setError("Enter a valid amount before logging a payment.");
      return;
    }
    setError("");
    setReceiptStatus("");
    const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, ...newPayment, amount: parseFloat(newPayment.amount) };
    const updated = { ...ledger, payments: [entry, ...(ledger.payments || [])] };
    await saveLedger(updated);

    if (sendReceipt && ledger.tenantEmail) {
      setReceiptStatus("sending");
      try {
        const res = await fetch("/api/send-template-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: ledger.tenantEmail,
            subject: `Payment received — $${entry.amount.toFixed(2)} (${entry.appliesTo})`,
            body: `Hi ${activeName},\n\nThis confirms we received your payment:\n\nDate: ${entry.date}\nAmount: $${entry.amount.toFixed(2)}\nApplies to: ${entry.appliesTo}\nMethod: ${entry.method}${entry.note ? `\nNote: ${entry.note}` : ""}\n\nKeep this for your records.\n\nThanks,\nIJAM Housing`,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not send receipt.");
        setReceiptStatus("sent");
      } catch (e) {
        setReceiptStatus("error");
      }
    }

    setNewPayment({ date: todayStr(), amount: "", appliesTo: "Rent", method: "Zelle", note: "" });
  };

  const paidInMonth = (monthKey) => {
    const totals = { Rent: 0, Electric: 0, WiFi: 0 };
    (ledger?.payments || []).forEach((p) => {
      if (p.date && p.date.startsWith(monthKey) && totals[p.appliesTo] !== undefined) {
        totals[p.appliesTo] += Number(p.amount) || 0;
      }
    });
    return totals;
  };

  const paidThisView = useMemo(() => paidInMonth(viewMonth), [ledger, viewMonth]);
  const viewBill = ledger ? getBillForMonth(viewMonth) : { electric: "", wifi: "" };

  const monthlyRent = parseFloat(ledger?.monthlyRent) || 0;
  const electricBill = parseFloat(viewBill.electric) || 0;
  const wifiBill = parseFloat(viewBill.wifi) || 0;
  const rentBalance = monthlyRent - paidThisView.Rent;
  const utilitiesOwed = electricBill + wifiBill;
  const utilitiesPaid = paidThisView.Electric + paidThisView.WiFi;
  const utilitiesBalance = utilitiesOwed - utilitiesPaid;
  const totalDue = rentBalance + utilitiesBalance;

  const historyMonths = useMemo(() => {
    if (!ledger) return [];
    const months = new Set();
    (ledger.monthlyBills || []).forEach((b) => months.add(b.month));
    (ledger.payments || []).forEach((p) => p.date && months.add(p.date.slice(0, 7)));
    months.add(currentMonthKey());
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [ledger]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: PALEGREY }}>
      <div className="max-w-3xl mx-auto px-5 py-10">
        <a href="/" className="inline-flex items-center gap-1.5 text-[13px] font-semibold mb-5" style={{ color: SLATE }}>
          <ArrowLeft size={15} /> Back
        </a>

        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#fff", border: `0.5px solid ${LIGHTGREY}` }}>
            <Receipt size={17} color={CHARCOAL} />
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] mb-0" style={{ color: MIDGREY }}>IJAM HOUSING</p>
            <h1 className="text-[22px] font-bold" style={{ color: CHARCOAL }}>Payment Ledger</h1>
          </div>
        </div>
        <p className="text-[14px] mb-6 mt-2.5" style={{ color: SLATE }}>
          Rent and utilities are tracked as separate balances, since utility accounts aren't in the tenant's name.
        </p>

        <div className="flex gap-2 mb-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && query.trim() && loadLedger(query.trim())}
            placeholder="Search by name"
            list="known-names-ledger"
            className="flex-1 rounded-md border px-3 py-2.5 text-[14px] outline-none"
            style={{ borderColor: LIGHTGREY, color: INK, backgroundColor: "#fff" }}
          />
          <datalist id="known-names-ledger">
            {knownNames.map((n) => <option key={n} value={n} />)}
          </datalist>
          <button
            onClick={() => query.trim() && loadLedger(query.trim())}
            className="flex items-center gap-2 px-4 py-2.5 rounded-md text-[14px] font-semibold text-white"
            style={{ backgroundColor: CHARCOAL }}
          >
            <Search size={16} /> Search
          </button>
        </div>

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

        {ledger && (
          <>
            <div className="bg-white border rounded-xl p-4 mb-5" style={{ borderColor: LIGHTGREY }}>
              <label className="text-[12px] font-semibold block mb-1" style={{ color: SLATE }}>Tenant Email (for receipts)</label>
              <input
                value={ledger.tenantEmail}
                onChange={(e) => updateField("tenantEmail", e.target.value)}
                onBlur={saveField}
                type="email"
                placeholder="tenant@email.com"
                className="w-full rounded-md border px-3 py-2 text-[13px] outline-none"
                style={{ borderColor: LIGHTGREY, color: INK }}
              />
            </div>

            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setViewMonth((m) => shiftMonth(m, -1))} className="w-8 h-8 flex items-center justify-center rounded-md border" style={{ borderColor: LIGHTGREY, backgroundColor: "#fff" }}>
                <ChevronLeft size={16} color={SLATE} />
              </button>
              <span className="text-[15px] font-bold" style={{ color: CHARCOAL }}>{monthLabel(viewMonth)}</span>
              <button onClick={() => setViewMonth((m) => shiftMonth(m, 1))} className="w-8 h-8 flex items-center justify-center rounded-md border" style={{ borderColor: LIGHTGREY, backgroundColor: "#fff" }}>
                <ChevronRight size={16} color={SLATE} />
              </button>
            </div>

            <div className="rounded-xl p-4 mb-5 flex justify-between items-center" style={{ backgroundColor: PALEGREY }}>
              <span className="text-[13px] font-semibold" style={{ color: SLATE }}>Total due — {activeName}</span>
              <span className="text-[22px] font-bold" style={{ color: CHARCOAL }}>${totalDue.toFixed(2)}</span>
            </div>

            <p className="text-[11px] font-semibold tracking-[0.1em] mb-2" style={{ color: MIDGREY }}>RENT</p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white border rounded-xl p-4" style={{ borderColor: LIGHTGREY }}>
                <p className="text-[12px] mb-1" style={{ color: SLATE }}>Monthly rent</p>
                <input
                  value={ledger.monthlyRent}
                  onChange={(e) => updateField("monthlyRent", e.target.value)}
                  onBlur={saveField}
                  placeholder="$"
                  className="w-full text-[20px] font-bold outline-none"
                  style={{ color: CHARCOAL, border: "none", backgroundColor: "transparent" }}
                />
              </div>
              <div className="bg-white border rounded-xl p-4" style={{ borderColor: LIGHTGREY }}>
                <p className="text-[12px] mb-1" style={{ color: SLATE }}>Paid this month</p>
                <p className="text-[20px] font-bold" style={{ color: CHARCOAL }}>${paidThisView.Rent.toFixed(2)}</p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: rentBalance > 0 ? "#FAECE7" : "#EAF3DE" }}>
                <p className="text-[12px] mb-1" style={{ color: rentBalance > 0 ? "#712B13" : "#27500A" }}>Rent balance</p>
                <p className="text-[20px] font-bold" style={{ color: rentBalance > 0 ? "#712B13" : "#27500A" }}>${rentBalance.toFixed(2)}</p>
              </div>
            </div>

            <p className="text-[11px] font-semibold tracking-[0.1em] mb-2" style={{ color: MIDGREY }}>UTILITIES</p>
            <div className="bg-white border rounded-xl p-4 mb-6" style={{ borderColor: LIGHTGREY }}>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="flex items-center gap-1.5 text-[12px] font-semibold mb-1.5" style={{ color: SLATE }}>
                    <Zap size={13} color={MIDGREY} /> Electric bill — {monthLabel(viewMonth)}
                  </label>
                  <input
                    value={viewBill.electric}
                    onChange={(e) => updateBillForMonth("electric", e.target.value)}
                    onBlur={saveField}
                    placeholder="$"
                    className="w-full rounded-md border px-3 py-2 text-[13px] outline-none"
                    style={{ borderColor: LIGHTGREY, color: INK }}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-[12px] font-semibold mb-1.5" style={{ color: SLATE }}>
                    <Wifi size={13} color={MIDGREY} /> WiFi bill — {monthLabel(viewMonth)}
                  </label>
                  <input
                    value={viewBill.wifi}
                    onChange={(e) => updateBillForMonth("wifi", e.target.value)}
                    onBlur={saveField}
                    placeholder="$"
                    className="w-full rounded-md border px-3 py-2 text-[13px] outline-none"
                    style={{ borderColor: LIGHTGREY, color: INK }}
                  />
                </div>
              </div>
              <div className="flex gap-5 pt-3" style={{ borderTop: `1px solid ${LIGHTGREY}` }}>
                <span className="text-[13px]" style={{ color: SLATE }}>Owed: <b style={{ color: INK }}>${utilitiesOwed.toFixed(2)}</b></span>
                <span className="text-[13px]" style={{ color: SLATE }}>Paid: <b style={{ color: INK }}>${utilitiesPaid.toFixed(2)}</b></span>
                <span className="text-[13px]" style={{ color: utilitiesBalance > 0 ? "#993C1D" : "#3B6D11" }}>Balance: <b>${utilitiesBalance.toFixed(2)}</b></span>
              </div>
            </div>

            <div className="bg-white border rounded-xl p-5 mb-6" style={{ borderColor: LIGHTGREY }}>
              <p className="text-[11px] font-semibold tracking-[0.1em] mb-3" style={{ color: MIDGREY }}>LOG A PAYMENT</p>
              <div className="grid grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="text-[12px] font-semibold block mb-1" style={{ color: SLATE }}>Date</label>
                  <input type="date" value={newPayment.date} onChange={(e) => setNewPayment((p) => ({ ...p, date: e.target.value }))} className="w-full rounded-md border px-2 py-2 text-[13px] outline-none" style={{ borderColor: LIGHTGREY, color: INK }} />
                </div>
                <div>
                  <label className="text-[12px] font-semibold block mb-1" style={{ color: SLATE }}>Amount</label>
                  <input value={newPayment.amount} onChange={(e) => setNewPayment((p) => ({ ...p, amount: e.target.value }))} placeholder="$" className="w-full rounded-md border px-2 py-2 text-[13px] outline-none" style={{ borderColor: LIGHTGREY, color: INK }} />
                </div>
                <div>
                  <label className="text-[12px] font-semibold block mb-1" style={{ color: SLATE }}>Applies to</label>
                  <select value={newPayment.appliesTo} onChange={(e) => setNewPayment((p) => ({ ...p, appliesTo: e.target.value }))} className="w-full rounded-md border px-2 py-2 text-[13px] outline-none" style={{ borderColor: LIGHTGREY, color: INK }}>
                    <option>Rent</option><option>Electric</option><option>WiFi</option><option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[12px] font-semibold block mb-1" style={{ color: SLATE }}>Method</label>
                  <select value={newPayment.method} onChange={(e) => setNewPayment((p) => ({ ...p, method: e.target.value }))} className="w-full rounded-md border px-2 py-2 text-[13px] outline-none" style={{ borderColor: LIGHTGREY, color: INK }}>
                    <option>Zelle</option><option>Venmo</option><option>Cash</option><option>Check</option><option>Other</option>
                  </select>
                </div>
              </div>
              <input value={newPayment.note} onChange={(e) => setNewPayment((p) => ({ ...p, note: e.target.value }))} placeholder="Note (optional)" className="w-full rounded-md border px-3 py-2 text-[13px] outline-none mb-3" style={{ borderColor: LIGHTGREY, color: INK }} />

              <label className="flex items-center gap-2 mb-3">
                <input type="checkbox" checked={sendReceipt} onChange={(e) => setSendReceipt(e.target.checked)} disabled={!ledger.tenantEmail} />
                <span className="text-[13px]" style={{ color: ledger.tenantEmail ? INK : MIDGREY }}>
                  <Mail size={13} className="inline mr-1" style={{ verticalAlign: -2 }} />
                  Email receipt to {ledger.tenantEmail || "tenant (add email above)"}
                </span>
              </label>

              <button
                onClick={logPayment}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-md text-[13px] font-semibold text-white"
                style={{ backgroundColor: CHARCOAL, opacity: saving ? 0.6 : 1 }}
              >
                <Plus size={15} /> {saving ? "Saving…" : "Log Payment"}
              </button>
              {receiptStatus === "sending" && <p className="text-[12px] mt-2" style={{ color: MIDGREY }}>Sending receipt…</p>}
              {receiptStatus === "sent" && <p className="text-[12px] mt-2 flex items-center gap-1" style={{ color: "#27500A" }}><Check size={12} /> Receipt sent</p>}
              {receiptStatus === "error" && <p className="text-[12px] mt-2" style={{ color: SLATE }}>Payment saved, but the receipt email failed to send.</p>}
            </div>

            <p className="text-[11px] font-semibold tracking-[0.1em] mb-2" style={{ color: MIDGREY }}>MONTH-BY-MONTH HISTORY</p>
            <div className="bg-white border rounded-xl overflow-hidden mb-6" style={{ borderColor: LIGHTGREY }}>
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr style={{ backgroundColor: PALEGREY }}>
                    <th className="px-4 py-2.5 font-semibold" style={{ color: SLATE }}>Month</th>
                    <th className="px-4 py-2.5 font-semibold" style={{ color: SLATE }}>Rent Paid</th>
                    <th className="px-4 py-2.5 font-semibold" style={{ color: SLATE }}>Utilities Due</th>
                    <th className="px-4 py-2.5 font-semibold" style={{ color: SLATE }}>Utilities Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {historyMonths.map((mk) => {
                    const totals = paidInMonth(mk);
                    const bill = getBillForMonth(mk);
                    const owed = (parseFloat(bill.electric) || 0) + (parseFloat(bill.wifi) || 0);
                    return (
                      <tr key={mk} style={{ borderTop: `1px solid ${LIGHTGREY}` }}>
                        <td className="px-4 py-2.5 font-semibold" style={{ color: INK }}>
                          <button onClick={() => setViewMonth(mk)} className="hover:underline">{monthLabel(mk)}</button>
                        </td>
                        <td className="px-4 py-2.5" style={{ color: INK }}>${totals.Rent.toFixed(2)}</td>
                        <td className="px-4 py-2.5" style={{ color: INK }}>${owed.toFixed(2)}</td>
                        <td className="px-4 py-2.5" style={{ color: INK }}>${(totals.Electric + totals.WiFi).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] font-semibold tracking-[0.1em] mb-2" style={{ color: MIDGREY }}>ALL PAYMENTS</p>
            {(!ledger.payments || ledger.payments.length === 0) ? (
              <p className="text-[13px]" style={{ color: MIDGREY }}>No payments logged yet.</p>
            ) : (
              <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: LIGHTGREY }}>
                <table className="w-full text-left border-collapse text-[13px]">
                  <thead>
                    <tr style={{ backgroundColor: PALEGREY }}>
                      <th className="px-4 py-2.5 font-semibold" style={{ color: SLATE }}>Date</th>
                      <th className="px-4 py-2.5 font-semibold" style={{ color: SLATE }}>Amount</th>
                      <th className="px-4 py-2.5 font-semibold" style={{ color: SLATE }}>Applies to</th>
                      <th className="px-4 py-2.5 font-semibold" style={{ color: SLATE }}>Method</th>
                      <th className="px-4 py-2.5 font-semibold" style={{ color: SLATE }}>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.payments.map((p) => {
                      const colors = TYPE_COLORS[p.appliesTo] || TYPE_COLORS.Other;
                      return (
                        <tr key={p.id} style={{ borderTop: `1px solid ${LIGHTGREY}` }}>
                          <td className="px-4 py-2.5" style={{ color: INK }}>{p.date}</td>
                          <td className="px-4 py-2.5" style={{ color: INK }}>${Number(p.amount).toFixed(2)}</td>
                          <td className="px-4 py-2.5"><span className="text-[12px] px-2 py-0.5 rounded" style={{ backgroundColor: colors.bg, color: colors.text }}>{p.appliesTo}</span></td>
                          <td className="px-4 py-2.5" style={{ color: SLATE }}>{p.method}</td>
                          <td className="px-4 py-2.5" style={{ color: SLATE }}>{p.note || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
