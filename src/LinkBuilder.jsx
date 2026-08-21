import React, { useState } from "react";
import {
  Link2, Copy, Check, ArrowLeft, FileText, FileSignature, Home as HomeIcon,
  Boxes, Camera, Gift, Truck, Package, MapPin, DollarSign, Calendar, User, Mail, Phone, Clock,
} from "lucide-react";
import { CHARCOAL, SLATE, MIDGREY, LIGHTGREY, PALEGREY, INK } from "./formKit.jsx";

const DOC_TYPES = [
  {
    key: "rental-application",
    label: "Rental Application",
    shortLabel: "Rental application",
    icon: FileText,
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
    shortLabel: "Agreement to lease",
    icon: FileSignature,
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
    shortLabel: "Residential lease",
    icon: HomeIcon,
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
    shortLabel: "Questionnaire",
    icon: Boxes,
    path: "/move-in-questionnaire",
    fields: [
      { key: "tenant", label: "Tenant Name" },
      { key: "email", label: "Tenant Email" },
    ],
  },
  {
    key: "item-photos",
    label: "Item Photos",
    shortLabel: "Item photos",
    icon: Camera,
    path: "/item-photos",
    fields: [
      { key: "tenant", label: "Tenant Name" },
      { key: "email", label: "Tenant Email" },
    ],
  },
  {
    key: "storage-donation-consent",
    label: "Storage & Donation Consent",
    shortLabel: "Storage & donation",
    icon: Gift,
    path: "/storage-donation-consent",
    fields: [
      { key: "tenant", label: "Tenant Name" },
      { key: "email", label: "Tenant Email" },
    ],
  },
  {
    key: "move-support",
    label: "Move Support Request",
    shortLabel: "Move support",
    icon: Truck,
    path: "/move-support",
    fields: [
      { key: "tenant", label: "Tenant Name" },
      { key: "email", label: "Tenant Email" },
    ],
  },
  {
    key: "property-loan-agreement",
    label: "Property Loan Agreement",
    shortLabel: "Loan agreement",
    icon: Package,
    path: "/property-loan-agreement",
    fields: [
      { key: "tenant", label: "Owner Name" },
      { key: "email", label: "Owner Email" },
    ],
  },
];

const FIELD_ICONS = {
  address: MapPin,
  rent: DollarSign,
  security: DollarSign,
  reservation: DollarSign,
  movein: Calendar,
  commence: Calendar,
  start: Calendar,
  end: Calendar,
  term: Clock,
  tenant: User,
  landlord: User,
  email: Mail,
  phone: Phone,
};

function IconField({ icon: Icon, label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: SLATE }}>
        <Icon size={14} color={MIDGREY} /> {label}
      </label>
      <input
        value={value}
        onChange={onChange}
        placeholder="Leave blank to skip"
        className="w-full rounded-md border px-3 py-2.5 text-[14px] outline-none"
        style={{ borderColor: LIGHTGREY, color: INK, backgroundColor: "#fff" }}
        onFocus={(e) => (e.target.style.borderColor = CHARCOAL)}
        onBlur={(e) => (e.target.style.borderColor = LIGHTGREY)}
      />
    </div>
  );
}

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
        <a href="/" className="inline-flex items-center gap-1.5 text-[13px] font-semibold mb-5" style={{ color: SLATE }}>
          <ArrowLeft size={15} /> Back
        </a>

        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: PALEGREY, border: `0.5px solid ${LIGHTGREY}` }}>
            <Link2 size={17} color={CHARCOAL} />
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] mb-0" style={{ color: MIDGREY }}>IJAM HOUSING</p>
            <h1 className="text-[22px] font-bold" style={{ color: CHARCOAL }}>Create a Pre-Filled Link</h1>
          </div>
        </div>
        <p className="text-[14px] mb-6 mt-2.5" style={{ color: SLATE }}>
          Fill in what you already know, then send the link to the tenant. They'll see it pre-filled and finish the rest.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {DOC_TYPES.map((d) => {
            const Icon = d.icon;
            const active = docKey === d.key;
            return (
              <button
                key={d.key}
                onClick={() => switchDoc(d.key)}
                className="flex flex-col items-center gap-1.5 py-3.5 px-1.5 rounded-[10px] border text-center"
                style={
                  active
                    ? { backgroundColor: CHARCOAL, borderColor: CHARCOAL, color: "#fff" }
                    : { backgroundColor: "#fff", borderColor: LIGHTGREY, color: SLATE }
                }
              >
                <Icon size={18} />
                <span className="text-[12px] font-semibold leading-tight">{d.shortLabel}</span>
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-xl border p-5 sm:p-6 mb-4" style={{ borderColor: LIGHTGREY }}>
          <p className="text-[11px] font-semibold tracking-[0.1em] mb-4" style={{ color: MIDGREY }}>
            {doc.label.toUpperCase()} DETAILS
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
            {doc.fields.map((f) => (
              <IconField
                key={f.key}
                icon={FIELD_ICONS[f.key] || FileText}
                label={f.label}
                value={values[f.key] || ""}
                onChange={set(f.key)}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl p-[18px]" style={{ backgroundColor: PALEGREY }}>
          <p className="text-[11px] font-semibold tracking-[0.1em] mb-3" style={{ color: MIDGREY }}>YOUR LINK</p>
          <div className="flex items-center gap-2.5 bg-white border rounded-[10px] px-3 py-2.5" style={{ borderColor: LIGHTGREY }}>
            <Link2 size={16} color={MIDGREY} className="flex-shrink-0" />
            <span className="flex-1 text-[13px] truncate" style={{ color: INK }}>{link}</span>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 h-8 px-3.5 rounded-md text-[13px] font-semibold text-white flex-shrink-0"
              style={{ backgroundColor: CHARCOAL }}
            >
              {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
