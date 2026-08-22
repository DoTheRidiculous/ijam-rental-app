import React from "react";
import {
  FileText, FileSignature, Home as HomeIcon, Link2, Boxes, Camera, Search, Gift, Truck,
  FileSearch, Package, LayoutDashboard, Mail, FileUp,
} from "lucide-react";
import { CHARCOAL, MIDGREY, LIGHTGREY, PALEGREY, INK } from "./formKit.jsx";

const SECTIONS = [
  {
    label: "APPLICATION",
    accent: "#993C1D",
    tint: "#FAECE7",
    links: [
      { href: "/rental-application", title: "Rental Application", icon: FileText },
      { href: "/proof-of-income", title: "Proof of Income", icon: FileUp },
    ],
  },
  {
    label: "LEASE DOCUMENTS",
    accent: "#3B6D11",
    tint: "#EAF3DE",
    links: [
      { href: "/agreement-to-lease", title: "Agreement to Lease", icon: FileSignature },
      { href: "/residential-lease", title: "Residential Lease", icon: HomeIcon },
    ],
  },
  {
    label: "MOVE-IN PREP",
    accent: "#185FA5",
    tint: "#E6F1FB",
    links: [
      { href: "/move-in-questionnaire", title: "Move-In Questionnaire", icon: Boxes },
      { href: "/item-photos", title: "Item Photos", icon: Camera },
      { href: "/storage-donation-consent", title: "Storage & Donation Consent", icon: Gift },
      { href: "/move-support", title: "Move Support Request", icon: Truck },
    ],
  },
  {
    label: "OTHER",
    accent: "#534AB7",
    tint: "#EEEDFE",
    links: [
      { href: "/property-loan-agreement", title: "Property Loan Agreement", icon: Package },
    ],
  },
];

const STAFF_LINKS = [
  { href: "/dashboard", title: "Progress Dashboard", icon: LayoutDashboard },
  { href: "/email-templates", title: "Email Templates", icon: Mail },
  { href: "/create-link", title: "Create a Pre-Filled Link", icon: Link2 },
  { href: "/find-photos", title: "Find an Applicant's Photos", icon: Search },
  { href: "/find-documents", title: "Search All Documents", icon: FileSearch },
];

function TileLink({ href, title, icon: Icon, tint, accent, muted }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-xl border px-3.5 py-3.5 transition-shadow hover:shadow-sm"
      style={{ backgroundColor: muted ? PALEGREY : "#fff", borderColor: LIGHTGREY }}
    >
      <div
        className="w-9 h-9 rounded-[9px] flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: muted ? "#fff" : tint }}
      >
        <Icon size={16} color={muted ? CHARCOAL : accent} />
      </div>
      <span className="text-[13px] font-semibold" style={{ color: INK }}>{title}</span>
    </a>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: PALEGREY }}>
      <div className="max-w-2xl mx-auto px-5 py-14">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#fff", border: `0.5px solid ${LIGHTGREY}` }}>
            <HomeIcon size={17} color={CHARCOAL} />
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] mb-0" style={{ color: MIDGREY }}>IJAM HOUSING</p>
            <h1 className="text-[26px] font-bold" style={{ color: CHARCOAL }}>Housing Documents</h1>
          </div>
        </div>

        {SECTIONS.map((section) => (
          <div key={section.label} className="mb-6">
            <p className="text-[11px] font-semibold tracking-[0.1em] mb-2.5" style={{ color: section.accent }}>{section.label}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {section.links.map((link) => (
                <TileLink key={link.href} {...link} tint={section.tint} accent={section.accent} />
              ))}
            </div>
          </div>
        ))}

        <div className="mb-2">
          <p className="text-[11px] font-semibold tracking-[0.1em] mb-2.5" style={{ color: MIDGREY }}>STAFF TOOLS</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {STAFF_LINKS.map((link) => (
              <TileLink key={link.href} {...link} muted />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
