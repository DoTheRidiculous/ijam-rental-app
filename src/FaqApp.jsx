import React, { useState } from "react";
import { HelpCircle, ChevronDown } from "lucide-react";
import { CHARCOAL, SLATE, MIDGREY, LIGHTGREY, PALEGREY, INK } from "./formKit.jsx";

const FAQS = [
  {
    q: "Why do you need my Social Security number and a background check?",
    a: "This is a standard part of the application process for any rental — it lets us verify your identity and rental history, the same way any landlord would. Your Rental Application is stored privately and is never shared publicly.",
  },
  {
    q: "What payment methods can I use for my security deposit or rent?",
    a: "Venmo, Cash App, Zelle, or a checking account transfer all work. Let us know which one works best for you.",
  },
  {
    q: "Will I need to transfer electric or WiFi into my own name?",
    a: "No — those accounts stay in IJAM Housing's name. You don't need to open anything yourself.",
  },
  {
    q: "Is the cost of utilities included in my rent, or billed separately?",
    a: "Separately. Since electric and WiFi aren't in your name, you'll get a separate invoice for those each month once the bill comes in — the amount can vary based on usage.",
  },
  {
    q: "When can I move in after paying my security deposit?",
    a: "Once your deposit and paperwork are complete, we'll work with you to schedule your move-in date — just let us know what timing works best for you.",
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: LIGHTGREY }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 text-left px-5 py-4"
      >
        <span className="text-[15px] font-semibold" style={{ color: CHARCOAL }}>{q}</span>
        <ChevronDown
          size={18}
          color={MIDGREY}
          style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
        />
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-[14px] leading-relaxed" style={{ color: SLATE }}>{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FaqApp() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: PALEGREY }}>
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#fff", border: `0.5px solid ${LIGHTGREY}` }}>
            <HelpCircle size={17} color={CHARCOAL} />
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] mb-0" style={{ color: MIDGREY }}>IJAM HOUSING</p>
            <h1 className="text-[22px] font-bold" style={{ color: CHARCOAL }}>Frequently Asked Questions</h1>
          </div>
        </div>
        <p className="text-[14px] mb-8 mt-2.5" style={{ color: SLATE }}>
          Answers to questions we hear often. Don't see yours here? Just reach out directly.
        </p>

        <div className="flex flex-col gap-3">
          {FAQS.map((item) => <FaqItem key={item.q} {...item} />)}
        </div>
      </div>
    </div>
  );
}
