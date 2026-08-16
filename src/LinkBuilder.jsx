import React, { useState } from "react";
import { Link2, Copy, Check, ArrowLeft } from "lucide-react";
import { Field, TextInput, CHARCOAL, SLATE, MIDGREY, LIGHTGREY, PALEGREY } from "./formKit.jsx";

const DOC_TYPES = [
  {
    key: "rental-application",
    label: "Rental Application",
    path: "/rental-application",
    fields: [
      { key: "address", label: "Property Address" },
      { key: "rent", label: "Monthly Rent" },
      { key: "movein", label: "Desired Move-In Date" },
      { key: "tenant", label: "Applicant Name" },
      { key: "email", label: "Applicant Email" },
      { key: "phone", label: "Applicant Phone" },
    ],
  },
  {
    key: "agreement-to-lease",
    label: "Agreement to Lease",
    path: "/agreement-to-lease",
    fields: [
      { key: "address", label: "Property Address" },
      { key: "landlord", label: "Landlord / Owner Name" },
      { key: "rent", label: "Monthly Rent" },
      { key: "security", label: "Security Deposit" },
      { key: "reservation", label: "Reservation Deposit" },
      { key: "commence", label: "Lease Commencement Date" },
      { key: "tenant", label: "Tenant Name" },
      { key: "email", label: "Tenant Email" },
    ],
  },
  {
    key: "residential-lease",
    label: "Residential Lease",
    path: "/residential-lease",
    fields: [
      { key: "address", label: "Premises Address" },
      { key: "landlord", label: "Landlord / Owner Name" },
      { key: "rent", label: "Monthly Rent" },
      { key: "security", label: "Security Deposit" },
      { key: "start", label: "Commencement Date" },
      { key: "end", label: "Expiration Date" },
      { key: "term", label: "Lease Term" },
      { key: "tenant", label: "Tenant Name" },
      { key: "email", label: "Tenant Email" },
    ],
  },
  {
    key: "move-in-questionnaire",
    label: "Move-In Questionnaire",
    path: "/move-in-questionnaire",
    fields: [
      { key: "tenant", label: "Tenant Name" },
      { key: "email", label: "Tenant Email" },
    ],
  },
  {
    key: "item-photos",
    label: "Item Photos",
    path: "/item-photos",
    fields: [
      { key: "tenant", label: "Tenant Name" },
      { key: "email", label: "Tenant Email" },
    ],
  },
  {
    key: "storage-donation-consent",
    label: "Storage & Donation Consent",
    path: "/storage-donation-consent",
    fields: [
      { key: "tenant", label: "Tenant Name" },
      { key: "email", label: "Tenant Email" },
    ],
  },
];

export default function LinkBuilder() {
  const [docKey, setDocKey] = useState(DOC_TYPES[0].key);
  const [values, setValues] = useState({});
  const [copied, setCopied] = useState(false);

  const doc = DOC_TYPES.find((d) => d.key === docKey);

  const switchDoc = (key) => {
    setDocKey(key);
    setValues({});
    setCopied(false);
  };

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setCopied(false);
  };

  const buildLink = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const params = new URLSearchParams();
    doc.fields.forEach((f) => {
      const v = (values[f.key] || "").trim();
      if (v) params.set(f.key, v);
    });
    const qs = params.toString();
    return `${origin}${doc.path}${qs ? `?${qs}` : ""}`;
  };

  const link = buildLink();

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // clipboard API unavailable — user can still select and copy manually
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: PALEGREY }}>
      <div className="max-w-2xl mx-auto px-5 py-10">
        <a href="/" className="inline-flex items-center gap-1.5 text-[13px] font-semibold mb-6" style={{ color: SLATE }}>
          <ArrowLeft size={15} /> Back
        </a>

        <p className="text-[12px] font-bold tracking-[0.15em] mb-1" style={{ color: MIDGREY }}>IJAM HOUSING</p>
        <h1 className="text-2xl font-bold mb-2" style={{ color: CHARCOAL }}>Create a Pre-Filled Link</h1>
        <p className="text-[14px] mb-8" style={{ color: SLATE }}>
          Fill in what you already know, then copy the link and send it to the prospective tenant. They'll see these fields already filled in and just complete the rest.
        </p>

        <div className="flex gap-2 mb-6">
          {DOC_TYPES.map((d) => (
            <button
              key={d.key}
              onClick={() => switchDoc(d.key)}
              className="px-3.5 py-2 rounded-md text-[13px] font-semibold border"
              style={
                docKey === d.key
                  ? { backgroundColor: CHARCOAL, color: "#fff", borderColor: CHARCOAL }
                  : { backgroundColor: "#fff", color: SLATE, borderColor: LIGHTGREY }
              }
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border p-5 sm:p-6 mb-6" style={{ borderColor: LIGHTGREY }}>
          <div className="grid grid-cols-2 gap-4">
            {doc.fields.map((f) => (
              <Field key={f.key} label={f.label}>
                <TextInput value={values[f.key] || ""} onChange={set(f.key)} placeholder="Leave blank to skip" />
              </Field>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border p-5 sm:p-6" style={{ borderColor: LIGHTGREY }}>
          <div className="flex items-center gap-2 mb-3">
            <Link2 size={16} color={SLATE} />
            <span className="text-[13px] font-bold tracking-wide" style={{ color: SLATE }}>YOUR LINK</span>
          </div>
          <div
            className="text-[13px] font-mono p-3 rounded-md mb-3 break-all"
            style={{ backgroundColor: PALEGREY, color: CHARCOAL, border: `1px solid ${LIGHTGREY}` }}
          >
            {link}
          </div>
          <button
            onClick={copyLink}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-md text-[14px] font-bold text-white"
            style={{ backgroundColor: CHARCOAL }}
          >
            {copied ? (
              <>
                <Check size={16} /> Copied
              </>
            ) : (
              <>
                <Copy size={16} /> Copy Link
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
