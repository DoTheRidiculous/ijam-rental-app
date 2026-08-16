import React from "react";
import { FileText, FileSignature, Home as HomeIcon, ArrowRight, Link2, Boxes, Camera, Search, Gift } from "lucide-react";
import { CHARCOAL, SLATE, MIDGREY, LIGHTGREY, PALEGREY } from "./formKit.jsx";

const FORM_LINKS = [
  { href: "/rental-application", title: "Rental Application", desc: "For prospective applicants to apply for a unit.", icon: FileText },
  { href: "/agreement-to-lease", title: "Agreement to Lease", desc: "Reserve a unit ahead of the full lease signing.", icon: FileSignature },
  { href: "/residential-lease", title: "Residential Lease", desc: "The full lease agreement for move-in.", icon: HomeIcon },
  { href: "/move-in-questionnaire", title: "Move-In & Storage Questionnaire", desc: "Plan move-in timing, furniture, and storage needs.", icon: Boxes },
  { href: "/item-photos", title: "Item Photos", desc: "Upload photos of furniture and belongings for us to view.", icon: Camera },
  { href: "/storage-donation-consent", title: "Storage & Donation Consent", desc: "Let us know what to store or give away — no obligation created either way.", icon: Gift },
];

const STAFF_LINKS = [
  { href: "/create-link", title: "Create a Pre-Filled Link", desc: "Build a link with a few fields already filled in for a specific tenant.", icon: Link2 },
  { href: "/find-photos", title: "Find an Applicant's Photos", desc: "Search by name to find and re-share their photo folder link.", icon: Search },
];

function LinkCard({ href, title, desc, icon: Icon }) {
  return (
    <a
      href={href}
      className="flex items-center gap-4 bg-white border rounded-xl p-5 transition-shadow hover:shadow-sm"
      style={{ borderColor: LIGHTGREY }}
    >
      <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: PALEGREY }}>
        <Icon size={20} color={CHARCOAL} />
      </div>
      <div className="flex-1">
        <p className="text-[16px] font-bold" style={{ color: CHARCOAL }}>{title}</p>
        <p className="text-[13px]" style={{ color: SLATE }}>{desc}</p>
      </div>
      <ArrowRight size={18} color={MIDGREY} />
    </a>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: PALEGREY }}>
      <div className="max-w-2xl mx-auto px-5 py-14">
        <p className="text-[12px] font-bold tracking-[0.15em] mb-2" style={{ color: MIDGREY }}>IJAM HOUSING</p>
        <h1 className="text-3xl font-bold mb-2" style={{ color: CHARCOAL }}>Housing Documents</h1>
        <p className="text-[15px] mb-8" style={{ color: SLATE }}>Choose the document you need to fill out and sign.</p>

        <div className="flex flex-col gap-3 mb-10">
          {FORM_LINKS.map((link) => <LinkCard key={link.href} {...link} />)}
        </div>

        <p className="text-[12px] font-bold tracking-[0.15em] mb-3" style={{ color: MIDGREY }}>STAFF TOOLS</p>
        <div className="flex flex-col gap-3">
          {STAFF_LINKS.map((link) => <LinkCard key={link.href} {...link} />)}
        </div>
      </div>
    </div>
  );
}
