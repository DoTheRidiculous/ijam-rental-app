import React from "react";
import { FileText, FileSignature, Home as HomeIcon, ArrowRight, Link2, Boxes } from "lucide-react";
import { CHARCOAL, SLATE, MIDGREY, LIGHTGREY, PALEGREY } from "./formKit.jsx";

const LINKS = [
  { href: "/rental-application", title: "Rental Application", desc: "For prospective applicants to apply for a unit.", icon: FileText },
  { href: "/agreement-to-lease", title: "Agreement to Lease", desc: "Reserve a unit ahead of the full lease signing.", icon: FileSignature },
  { href: "/residential-lease", title: "Residential Lease", desc: "The full lease agreement for move-in.", icon: HomeIcon },
  { href: "/move-in-questionnaire", title: "Move-In & Storage Questionnaire", desc: "Plan move-in timing, furniture, and storage needs.", icon: Boxes },
];

export default function Landing() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: PALEGREY }}>
      <div className="max-w-2xl mx-auto px-5 py-14">
        <p className="text-[12px] font-bold tracking-[0.15em] mb-2" style={{ color: MIDGREY }}>IJAM HOUSING</p>
        <h1 className="text-3xl font-bold mb-2" style={{ color: CHARCOAL }}>Housing Documents</h1>
        <p className="text-[15px] mb-10" style={{ color: SLATE }}>Choose the document you need to fill out and sign.</p>

        <div className="flex flex-col gap-3">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="flex items-center gap-4 bg-white border rounded-xl p-5 transition-shadow hover:shadow-sm"
              style={{ borderColor: LIGHTGREY }}
            >
              <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: PALEGREY }}>
                <link.icon size={20} color={CHARCOAL} />
              </div>
              <div className="flex-1">
                <p className="text-[16px] font-bold" style={{ color: CHARCOAL }}>{link.title}</p>
                <p className="text-[13px]" style={{ color: SLATE }}>{link.desc}</p>
              </div>
              <ArrowRight size={18} color={MIDGREY} />
            </a>
          ))}
        </div>

        <a
          href="/create-link"
          className="flex items-center gap-4 bg-white border rounded-xl p-5 mt-3 transition-shadow hover:shadow-sm"
          style={{ borderColor: LIGHTGREY }}
        >
          <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: PALEGREY }}>
            <Link2 size={20} color={CHARCOAL} />
          </div>
          <div className="flex-1">
            <p className="text-[16px] font-bold" style={{ color: CHARCOAL }}>Create a Pre-Filled Link</p>
            <p className="text-[13px]" style={{ color: SLATE }}>For staff — build a link with a few fields already filled in for a specific tenant.</p>
          </div>
          <ArrowRight size={18} color={MIDGREY} />
        </a>
      </div>
    </div>
  );
}
