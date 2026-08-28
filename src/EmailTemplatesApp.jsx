import React, { useState, useEffect } from "react";
import {
  ArrowLeft, Mail, Send, Copy, Check, FileText, Gift, Truck, Package,
  ClipboardCheck, FileSignature, CreditCard, ChevronRight, FileUp, Boxes, Camera, XCircle, Info, Wifi,
} from "lucide-react";
import { CHARCOAL, SLATE, MIDGREY, LIGHTGREY, PALEGREY, INK, useKnownNames } from "./formKit.jsx";

const ORIGIN_PLACEHOLDER = "https://ijam-rental-app.vercel.app";

const TEMPLATES = [
  {
    key: "rental-application",
    label: "Rental Application",
    icon: FileText,
    path: "/rental-application",
    subject: "Next step: Rental Application",
    body: `Hi {{name}},

The next step is completing a rental application. I've put together a short online form that walks you through it step by step — property details, your info, current and past residences, employment, references, and a couple of background questions:

{{link}}

It takes about 10-15 minutes. Your progress saves automatically, so if you need to step away and finish later, you can pick up right where you left off on the same device.

At the end, you'll type your name as your signature and submit — you'll get an emailed copy right away, and so will we.

Let me know if anything comes up while you're filling it out, or if you'd rather go over any of it by phone instead.

Thanks,
{{staff}}
IJAM Housing`,
  },
  {
    key: "proof-of-income",
    label: "Proof of Income",
    icon: FileUp,
    path: "/proof-of-income",
    subject: "Please upload proof of income",
    body: `Hi {{name}},

To finish processing your application, we need to see proof of income — this can be a recent pay stub, an offer letter, a benefits statement, or anything similar.

You can upload it here, PDFs or photos both work:

{{link}}

This goes to a private folder that only our staff can see — it isn't a public link.

Let me know if you have any questions about what qualifies, or if you need help getting documentation together.

Thanks,
{{staff}}
IJAM Housing`,
  },
  {
    key: "approved",
    label: "Application Approved",
    icon: ClipboardCheck,
    subject: "You're approved! Here are your terms",
    body: `Hi {{name}},

Great news — your application has been approved! Here are the terms for the unit:

- Monthly rent: [$amount], due on the [day] of each month
- Security deposit: [$amount]

The next step is the Agreement to Lease, which reserves the unit for you with these terms. I'll send that link separately once you've had a chance to look this over.

Congratulations, and let me know if you have any questions about any of this!

Warmly,
{{staff}}
IJAM Housing`,
  },
  {
    key: "denied",
    label: "Application Not Approved",
    icon: XCircle,
    note: "If this decision is based on a credit report or background check, federal law (FCRA) requires a separate formal \"adverse action\" notice — naming the reporting agency, the applicant's right to a free copy of the report, and their right to dispute it. This template alone doesn't satisfy that requirement. Check with a professional if that applies here.",
    subject: "Update on your rental application",
    body: `Hi {{name}},

Thank you for taking the time to apply, and for your patience during the review process.

After careful review, we're not able to move forward with your application at this time.

We know this isn't the news you were hoping for, and we genuinely wish you the best in your housing search. If you have any questions, please don't hesitate to reach out.

Thank you again for your interest.

{{staff}}
IJAM Housing`,
  },
  {
    key: "approved-lease-deposit",
    label: "Approved + Lease + Venmo Deposit",
    icon: ClipboardCheck,
    path: "/residential-lease",
    subject: "You're approved! Next steps + deposit info",
    body: `Hi {{name}},

Great news — your application has been approved!

Next step is signing your Residential Lease:

{{link}}

SECURITY DEPOSIT VIA VENMO
Please send your security deposit to our Venmo: [@YourVenmoUsername]
- Double check the name/photo matches ours before sending
- Include a note on the payment: "Security Deposit - [Unit Number]"
- Once sent, let us know and we'll confirm receipt and send you a receipt for your records

Let me know if you have any questions about any of this — congratulations again!

Warmly,
{{staff}}
IJAM Housing`,
  },
  {
    key: "agreement-to-lease-only",
    label: "Agreement to Lease",
    icon: FileSignature,
    path: "/agreement-to-lease",
    subject: "Please complete: Agreement to Lease",
    body: `Hi {{name}},

Here's the link to complete your Agreement to Lease:

{{link}}

Let me know if anything comes up while you're filling it out.

Thanks,
{{staff}}
IJAM Housing`,
  },
  {
    key: "residential-lease-only",
    label: "Residential Lease",
    icon: FileSignature,
    path: "/residential-lease",
    subject: "Please complete: Residential Lease",
    body: `Hi {{name}},

Here's the link to complete your Residential Lease:

{{link}}

Let me know if anything comes up while you're filling it out.

Thanks,
{{staff}}
IJAM Housing`,
  },
  {
    key: "move-in-packet",
    label: "Move-In Packet",
    icon: Wifi,
    path: "/move-in-packet",
    subject: "Your move-in packet (WiFi info + welcome details)",
    body: `Hi {{name}},

Here's your move-in packet — it has your WiFi info and a few welcome details, plus a spot to sign confirming you received it:

{{link}}

Let me know if you have any questions!

Warmly,
{{staff}}
IJAM Housing`,
  },
  {
    key: "property-condition-report",
    label: "Property Condition Report",
    icon: ClipboardCheck,
    path: "/property-condition-report",
    subject: "Move-in condition walkthrough",
    body: `Hi {{name}},

As part of move-in, we'll walk through the unit together and record its condition room by room — this protects both of us if there's ever a question at move-out.

{{link}}

We'll fill this out together and both sign at the end.

Thanks,
{{staff}}
IJAM Housing`,
  },
  {
    key: "lease-documents",
    label: "Agreement to Lease + Residential Lease",
    icon: FileSignature,
    paths: ["/agreement-to-lease", "/residential-lease"],
    subject: "Two quick things to finish up your lease",
    body: `Hi {{name}},

A couple of things to finish up now that your terms are confirmed:

1) The Agreement to Lease:
{{link1}}

2) The full Residential Lease, which has all the details of your tenancy:
{{link2}}

Both only take a few minutes. Let me know if anything comes up while you're filling them out!

Thanks,
{{staff}}
IJAM Housing`,
  },
  {
    key: "move-in-questionnaire",
    label: "Move-In & Storage Questionnaire",
    icon: Boxes,
    path: "/move-in-questionnaire",
    subject: "Quick form: Move-in planning",
    body: `Hi {{name}},

To help plan your move-in, could you fill out this short questionnaire? It covers timing, furniture, and any storage needs:

{{link}}

It only takes a few minutes, and you're welcome to come back and update your answers anytime if plans change.

Thanks,
{{staff}}
IJAM Housing`,
  },
  {
    key: "storage-donation",
    label: "Storage & Donation Consent",
    icon: Gift,
    path: "/storage-donation-consent",
    subject: "A form for planning storage & donations — no rush",
    body: `Hi {{name}},

As we plan out your move, we know there may be some things you can't bring with you — whether that's because of space, or just things you're ready to let go of. We put together a short form so you can let us know what you'd like help storing, and what you're comfortable donating or giving away, entirely at your own pace and on your own terms:

{{link}}

A few things worth knowing:
- Nothing gets given away without you specifically checking a box saying it's okay
- This is just for planning — filling it out doesn't commit you to anything
- You can come back and update your answers anytime if things change

Take your time with this one — no rush.

Warmly,
{{staff}}
IJAM Housing`,
  },
  {
    key: "move-support",
    label: "Move Support Request",
    icon: Truck,
    path: "/move-support",
    subject: "Quick form: Move support & timing",
    body: `Hi {{name}},

As your move gets closer, we'd like to know what kind of support might be helpful — whether that's a hand moving things, or boxes to pack with. Could you fill out this quick form when you get a chance?

{{link}}

It just asks:
- Whether you could use help moving your things
- The date you're hoping to start moving in
- The earliest and latest days that would work for you
- Whether you need boxes, and roughly how many/what sizes

It only takes a couple minutes, and you can come back and update it anytime if your plans change.

Thanks,
{{staff}}
IJAM Housing`,
  },
  {
    key: "item-photos",
    label: "Item Photos",
    icon: Camera,
    path: "/item-photos",
    subject: "Please upload photos of your items",
    body: `Hi {{name}},

Could you take or upload a few photos of your larger furniture and belongings? This helps us know what to expect ahead of your move:

{{link}}

You can label each photo as you go — no rush, and you can add more anytime using the same link.

Thanks,
{{staff}}
IJAM Housing`,
  },
  {
    key: "property-loan",
    label: "Property Loan Agreement",
    icon: Package,
    path: "/property-loan-agreement",
    subject: "Let's put your item loan in writing",
    body: `Hi {{name}},

Thank you so much for offering to loan an item for our use — that's a huge help. Since it's still your property and you'll want it back eventually, we want to put together a quick written agreement so everything is clear for both of us.

{{link}}

It covers a description of the item and its condition, the terms of the loan, and how we'll take care of it and return it — normal wear and tear is on us, and you keep ownership the whole time.

Since it needs both of our signatures, it works best if we fill it out together — happy to hop on a call or meet up whenever's convenient for you.

Thanks again for your generosity with this!

Warmly,
{{staff}}
IJAM Housing`,
  },
  {
    key: "baselane-setup",
    label: "Baselane Payment Setup",
    icon: CreditCard,
    subject: "Heads up: your first payments",
    body: `Hi {{name}},

We're moving rent and utility payments over to Baselane, a payment platform that gives you one place to pay, see your history, and download receipts.

You'll get a separate invite email from Baselane shortly to set up your login. Once you get it, just follow the steps to link a payment method (bank transfer or card both work), and you'll be all set going forward.

Let me know if anything looks off or if you have any questions before it's up and running!

Warmly,
{{staff}}
IJAM Housing`,
  },

];

function buildPrefilledLink(path, { name, email }) {
  if (!path) return "";
  const params = new URLSearchParams();
  if (name) params.set("tenant", name);
  if (email) params.set("email", email);
  const qs = params.toString();
  return `${ORIGIN_PLACEHOLDER}${path}${qs ? `?${qs}` : ""}`;
}

function fillTemplate(template, { name, email, staff }) {
  let subject = template.subject
    .replaceAll("{{name}}", name || "[Name]")
    .replaceAll("{{staff}}", staff || "[Your Name]");
  let body = template.body
    .replaceAll("{{name}}", name || "[Name]")
    .replaceAll("{{staff}}", staff || "[Your Name]");

  if (template.path) {
    body = body.replaceAll("{{link}}", buildPrefilledLink(template.path, { name, email }));
  }
  if (template.paths) {
    template.paths.forEach((p, i) => {
      body = body.replaceAll(`{{link${i + 1}}}`, buildPrefilledLink(p, { name, email }));
    });
  }
  return { subject, body };
}

export default function EmailTemplatesApp() {
  const [selectedKey, setSelectedKey] = useState(TEMPLATES[0].key);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [staffName, setStaffName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [copied, setCopied] = useState(false);
  const [sendState, setSendState] = useState("idle");
  const [sendError, setSendError] = useState("");
  const knownNames = useKnownNames();

  const template = TEMPLATES.find((t) => t.key === selectedKey);

  const refill = (tmpl = template) => {
    const filled = fillTemplate(tmpl, { name: recipientName, email: recipientEmail, staff: staffName });
    setSubject(filled.subject);
    setBody(filled.body);
  };

  useEffect(() => {
    refill(template);
    setSendState("idle");
    setSendError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  const copyBody = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) { /* clipboard unavailable */ }
  };

  const sendNow = async () => {
    setSendState("sending");
    setSendError("");
    try {
      const res = await fetch("/api/send-template-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: recipientEmail, subject, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send this email.");
      setSendState("sent");
    } catch (e) {
      setSendError(e.message || "Something went wrong sending this email.");
      setSendState("error");
    }
  };

  const canSend = recipientEmail.trim().length > 3 && subject.trim() && body.trim();
  const hasLink = Boolean(template.path || template.paths);

  return (
    <div className="min-h-screen" style={{ backgroundColor: PALEGREY }}>
      <div className="max-w-3xl mx-auto px-5 py-10">
        <a href="/" className="inline-flex items-center gap-1.5 text-[13px] font-semibold mb-5" style={{ color: SLATE }}>
          <ArrowLeft size={15} /> Back
        </a>

        <div className="flex items-center gap-3 mb-1.5">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: PALEGREY, border: `0.5px solid ${LIGHTGREY}` }}>
            <Mail size={17} color={CHARCOAL} />
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] mb-0" style={{ color: MIDGREY }}>IJAM HOUSING</p>
            <h1 className="text-[22px] font-bold" style={{ color: CHARCOAL }}>Email Templates</h1>
          </div>
        </div>
        <p className="text-[14px] mb-6 mt-2.5" style={{ color: SLATE }}>
          Pick a template, fill in the recipient, then copy it or send it directly from here.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-5">
          <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0">
            {TEMPLATES.map((t) => {
              const Icon = t.icon;
              const active = t.key === selectedKey;
              return (
                <button
                  key={t.key}
                  onClick={() => setSelectedKey(t.key)}
                  className="flex items-center gap-2.5 text-left rounded-[10px] border px-3 py-2.5 flex-shrink-0 sm:flex-shrink"
                  style={
                    active
                      ? { backgroundColor: CHARCOAL, borderColor: CHARCOAL, color: "#fff" }
                      : { backgroundColor: "#fff", borderColor: LIGHTGREY, color: SLATE }
                  }
                >
                  <Icon size={15} />
                  <span className="text-[13px] font-semibold whitespace-nowrap sm:whitespace-normal">{t.label}</span>
                  {active && <ChevronRight size={14} className="ml-auto hidden sm:block" />}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-4">
            {template.note && (
              <div className="flex gap-3 p-4 rounded-md" style={{ backgroundColor: "#F5F0EE" }}>
                <Info size={17} style={{ color: SLATE, flexShrink: 0, marginTop: 1 }} />
                <p className="text-[13px]" style={{ color: INK }}>{template.note}</p>
              </div>
            )}
            <div className="bg-white rounded-xl border p-4 sm:p-5" style={{ borderColor: LIGHTGREY }}>
              <p className="text-[11px] font-semibold tracking-[0.1em] mb-3" style={{ color: MIDGREY }}>RECIPIENT</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[12px] font-semibold block mb-1" style={{ color: SLATE }}>Name</label>
                  <input
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    onBlur={() => refill()}
                    list="known-names-email"
                    className="w-full rounded-md border px-3 py-2 text-[14px] outline-none"
                    style={{ borderColor: LIGHTGREY, color: INK }}
                  />
                  <datalist id="known-names-email">
                    {knownNames.map((n) => <option key={n} value={n} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-[12px] font-semibold block mb-1" style={{ color: SLATE }}>Email</label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    onBlur={() => refill()}
                    className="w-full rounded-md border px-3 py-2 text-[14px] outline-none"
                    style={{ borderColor: LIGHTGREY, color: INK }}
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold block mb-1" style={{ color: SLATE }}>Your Name</label>
                  <input
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    onBlur={() => refill()}
                    className="w-full rounded-md border px-3 py-2 text-[14px] outline-none"
                    style={{ borderColor: LIGHTGREY, color: INK }}
                  />
                </div>
              </div>
              {hasLink && (
                <p className="text-[12px] mt-3" style={{ color: MIDGREY }}>
                  The link in this template will be pre-filled with the name and email above — same as Create a Pre-Filled Link.
                </p>
              )}
            </div>

            <div className="bg-white rounded-xl border p-4 sm:p-5" style={{ borderColor: LIGHTGREY }}>
              <p className="text-[11px] font-semibold tracking-[0.1em] mb-3" style={{ color: MIDGREY }}>SUBJECT</p>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-md border px-3 py-2.5 text-[14px] outline-none mb-4"
                style={{ borderColor: LIGHTGREY, color: INK }}
              />
              <p className="text-[11px] font-semibold tracking-[0.1em] mb-3" style={{ color: MIDGREY }}>MESSAGE</p>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={14}
                className="w-full rounded-md border px-3 py-2.5 text-[13px] outline-none resize-y"
                style={{ borderColor: LIGHTGREY, color: INK, fontFamily: "inherit" }}
              />
              <p className="text-[12px] mt-2" style={{ color: MIDGREY }}>
                Anything in brackets, like [$amount], is a placeholder — edit it above before sending.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={copyBody}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-[14px] font-semibold border"
                style={{ borderColor: LIGHTGREY, color: CHARCOAL, backgroundColor: "#fff" }}
              >
                {copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> Copy</>}
              </button>
              <button
                onClick={sendNow}
                disabled={!canSend || sendState === "sending"}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-[14px] font-semibold text-white"
                style={{ backgroundColor: CHARCOAL, opacity: !canSend || sendState === "sending" ? 0.5 : 1 }}
              >
                {sendState === "sent" ? <><Check size={15} /> Sent</> : sendState === "sending" ? "Sending…" : <><Send size={15} /> Send Now</>}
              </button>
            </div>
            {sendState === "error" && <p className="text-[13px]" style={{ color: SLATE }}>{sendError}</p>}
            {!recipientEmail && <p className="text-[12px]" style={{ color: MIDGREY }}>Add a recipient email above to enable sending.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
