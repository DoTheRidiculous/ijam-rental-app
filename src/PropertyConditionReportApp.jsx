import React, { useState, useCallback, useMemo } from "react";
import { ClipboardList, Key, PenLine, ChevronDown } from "lucide-react";
import {
  ErrorBoundary, Field, TextInput, TextArea, SectionHeading, Callout,
  AppHeader, NavButtons, SuccessScreen, SignatureField, SubmitErrorBox, SubmitButton,
  useDraftStorage, downloadDocumentPdf, submitToDrive, todayStr,
  INK, CHARCOAL, SLATE, MIDGREY, LIGHTGREY, PALEGREY, ORG_EMAIL,
} from "./formKit.jsx";

const STEPS = [
  { key: "basics", label: "Basic Info", icon: ClipboardList },
  { key: "rooms", label: "Room-by-Room", icon: ClipboardList },
  { key: "keys", label: "Keys & Comments", icon: Key },
  { key: "sign", label: "Review & Sign", icon: PenLine },
];

const KITCHEN_ITEMS = ["Floor & Floor Covering", "Walls & Ceilings", "Door & Lock", "Window(s) & Screen(s)", "Window Covering(s)", "Light Fixture(s)", "Cabinets/Drawers", "Countertops", "Stove/Burners/Controls", "Oven/Rangehood", "Microwave", "Refrigerator", "Dishwasher", "Sink, Faucet & Plumbing", "Garbage Disposal", "Fire Extinguisher", "Smoke Alarm", "Closet/Pantry/Shelving"];
const LIVING_ITEMS = ["Floor & Floor Covering", "Walls & Ceilings", "Door & Lock", "Window(s) & Screen(s)", "Window Covering(s)", "Light Fixture(s)", "Smoke Alarm", "Carbon Monoxide Alarm", "Closet/Rods/Shelves"];
const DINING_ITEMS = ["Floor & Floor Covering", "Walls & Ceilings", "Window(s) & Screen(s)", "Window Covering(s)", "Light Fixture(s)"];
const BATHROOM_ITEMS = ["Floor & Floor Covering", "Walls & Ceilings", "Counters & Surfaces", "Window(s) & Screen(s)", "Sink, Faucet & Plumbing", "Bathtub/Shower & Fixtures", "Toilet", "Exhaust Fan", "Mirror/Medicine Cabinet", "Cabinets/Drawers", "Door & Lock"];
const BEDROOM_ITEMS = ["Floor & Floor Covering", "Walls & Ceilings", "Window(s) & Screen(s)", "Window Covering(s)", "Light Fixture(s)", "Closet(s)", "Door & Lock", "Smoke Alarm/CO Alarm"];
const HALL_ITEMS = ["Floor & Floor Covering", "Walls & Ceilings", "Window(s) & Screen(s)", "Light Fixture(s)", "Door & Lock", "Smoke Alarm", "Carbon Monoxide Alarm"];
const OTHER_ITEMS = ["Heating System", "Air Conditioning", "Water Heater", "Thermostat", "Switches/Outlets/GFCI", "Laundry Area (Washer/Dryer)", "Storage Area", "Parking Area", "Patio/Balcony"];

function buildSections(numBedrooms, numBathrooms) {
  const sections = [
    { key: "frontEntry", title: "Front Entry", items: ["Door"] },
    { key: "kitchen", title: "Kitchen", items: KITCHEN_ITEMS },
    { key: "livingRoom", title: "Living Room", items: LIVING_ITEMS },
    { key: "diningRoom", title: "Dining Room", items: DINING_ITEMS },
  ];
  for (let i = 1; i <= numBathrooms; i++) {
    sections.push({ key: `bathroom${i}`, title: `Bathroom #${i}`, items: BATHROOM_ITEMS });
  }
  for (let i = 1; i <= numBedrooms; i++) {
    sections.push({ key: `bedroom${i}`, title: `Bedroom #${i}`, items: BEDROOM_ITEMS });
  }
  sections.push({ key: "hall", title: "Hall", items: HALL_ITEMS });
  sections.push({ key: "other", title: "Other", items: OTHER_ITEMS });
  return sections;
}

const emptyForm = {
  residentNames: "", unitNumber: "", numBedrooms: "2", numBathrooms: "2", inspectionDate: "",
  conditions: {},
  doorKeyCount: "", laundryKeyGiven: "", mailboxKeyGiven: "",
  comments: "", alarmsAck: false,
  tenantName: "", tenantEmail: "", tenantSignature: "",
  staffName: "", staffSignature: "",
  signatureDate: "",
};

const QUERY_MAP = [
  ["tenant", "tenantName"],
  ["email", "tenantEmail"],
  ["unit", "unitNumber"],
];

function RoomAccordion({ section, conditions, onChange }) {
  const [open, setOpen] = useState(false);
  const filledCount = section.items.filter((item) => conditions[`${section.key}::${item}`]?.condition && conditions[`${section.key}::${item}`]?.condition !== "Good").length;

  return (
    <div className="bg-white rounded-xl border overflow-hidden mb-3" style={{ borderColor: LIGHTGREY }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 text-left px-4 py-3.5"
      >
        <span className="text-[14px] font-bold" style={{ color: CHARCOAL }}>{section.title}</span>
        <div className="flex items-center gap-2">
          {filledCount > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#FAECE7", color: "#712B13" }}>
              {filledCount} flagged
            </span>
          )}
          <ChevronDown size={16} color={MIDGREY} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-2.5">
          {section.items.map((item) => {
            const k = `${section.key}::${item}`;
            const val = conditions[k] || { condition: "Good", notes: "" };
            return (
              <div key={k} className="grid grid-cols-[1fr_auto] gap-2 items-start">
                <div>
                  <p className="text-[13px] font-semibold mb-1" style={{ color: SLATE }}>{item}</p>
                  <input
                    value={val.notes}
                    onChange={(e) => onChange(k, { ...val, notes: e.target.value })}
                    placeholder="Notes (optional)"
                    className="w-full rounded-md border px-2.5 py-1.5 text-[12px] outline-none"
                    style={{ borderColor: LIGHTGREY, color: INK, backgroundColor: "#fff" }}
                  />
                </div>
                <select
                  value={val.condition}
                  onChange={(e) => onChange(k, { ...val, condition: e.target.value })}
                  className="mt-5 rounded-md border px-2 py-1.5 text-[12px] outline-none"
                  style={{ borderColor: LIGHTGREY, color: INK, backgroundColor: "#fff" }}
                >
                  <option>Good</option>
                  <option>Fair</option>
                  <option>Poor</option>
                  <option>N/A</option>
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PropertyConditionReportForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [submitState, setSubmitState] = useState("idle");
  const [resultMessage, setResultMessage] = useState("");
  const [resultLink, setResultLink] = useState(null);

  const draft = useDraftStorage("draft:property-condition-report", emptyForm, setForm, QUERY_MAP);

  const set = (key) => (e) => {
    const val = e && e.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e;
    setForm((f) => {
      const next = { ...f, [key]: val };
      draft.save(next);
      return next;
    });
  };

  const setCondition = (itemKey, value) => {
    setForm((f) => {
      const next = { ...f, conditions: { ...f.conditions, [itemKey]: value } };
      draft.save(next);
      return next;
    });
  };

  const sections = useMemo(
    () => buildSections(parseInt(form.numBedrooms, 10) || 0, parseInt(form.numBathrooms, 10) || 0),
    [form.numBedrooms, form.numBathrooms]
  );

  const isSignStep = STEPS[step].key === "sign";
  const canGoNext = step < STEPS.length - 1;
  const canGoBack = step > 0;

  const buildDocumentText = useCallback(() => {
    const f = form;
    const roomLines = sections.map((section) => {
      const rows = section.items.map((item) => {
        const val = f.conditions[`${section.key}::${item}`] || { condition: "Good", notes: "" };
        return `  ${item}: ${val.condition}${val.notes ? ` — ${val.notes}` : ""}`;
      });
      return `${section.title.toUpperCase()}\n${rows.join("\n")}`;
    }).join("\n\n");

    return `PROPERTY CONDITION REPORT (MOVE-IN)
Submitted: ${new Date().toLocaleString()}

Resident(s): ${f.residentNames}
Unit Number: ${f.unitNumber}
Inspection Date: ${f.inspectionDate}

ROOM-BY-ROOM CONDITION
${roomLines}

KEYS
Door keys given: ${f.doorKeyCount}
Laundry key given: ${f.laundryKeyGiven}
Mailbox key given: ${f.mailboxKeyGiven}

COMMENTS
${f.comments || "None"}

SMOKE & CO ALARM ACKNOWLEDGMENT
Resident acknowledges all smoke alarms, carbon monoxide alarms, and fire extinguishers were tested and found in working order, and agrees to test all detectors monthly and report any problems in writing: ${f.alarmsAck ? "Yes" : "No"}

SIGNATURES
Resident: ${f.tenantName} — Typed signature: ${f.tenantSignature}
IJAM Housing Representative: ${f.staffName} — Typed signature: ${f.staffSignature}
Date: ${f.signatureDate}

This record reflects the condition of the property at move-in and may be referenced against a move-out inspection.
`;
  }, [form, sections]);

  const handleSubmit = async () => {
    setSubmitState("sending");
    setResultMessage("");
    setResultLink(null);
    const docText = buildDocumentText();
    const dateLabel = form.signatureDate || todayStr();
    const docTitle = `Property Condition Report - ${form.tenantName || form.residentNames || "Resident"} - ${dateLabel}`;

    try {
      const data = await submitToDrive({
        docTitle, docText, signerEmail: form.tenantEmail, personName: form.tenantName || form.residentNames,
        shareMessage: "Attached is the Property Condition Report from your move-in inspection.",
      });
      draft.clear();
      setResultMessage(`This report was saved and shared with ${form.tenantEmail} and ${ORG_EMAIL}.`);
      setResultLink(data.link || null);
      setSubmitState("success");
    } catch (err) {
      setResultMessage(
        "Something went wrong sending this to Google Drive. Your answers are safely saved in this app — you can retry, or download a copy below and send it manually for now."
      );
      setSubmitState("error");
    }
  };

  const downloadCopy = () => {
    downloadDocumentPdf({
      title: "PROPERTY CONDITION REPORT (MOVE-IN)",
      subtitle: `Submitted: ${new Date().toLocaleString()}`,
      docText: buildDocumentText(),
      fileName: `Property_Condition_Report_${(form.tenantName || "resident").replace(/\s+/g, "_")}.pdf`,
    });
  };

  const startOver = () => {
    setForm(emptyForm);
    setSubmitState("idle");
    setStep(0);
    draft.clear();
  };

  const canSubmit =
    form.tenantName && form.tenantEmail && form.tenantSignature.trim().length > 1 &&
    form.staffName && form.staffSignature.trim().length > 1 && form.alarmsAck;

  if (submitState === "success") {
    return (
      <SuccessScreen
        resultMessage={resultMessage}
        resultLink={resultLink}
        signerEmail={form.tenantEmail}
        onDownload={downloadCopy}
        onStartOver={startOver}
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: PALEGREY }}>
      <AppHeader eyebrow="IJAM HOUSING" title="Property Condition Report" step={step} totalSteps={STEPS.length} noticeText={draft.noticeText} />

      <div className="max-w-2xl mx-auto px-5 py-6">
        <div className="flex items-center gap-2 mb-6">
          {React.createElement(STEPS[step].icon, { size: 18, color: SLATE })}
          <span className="text-[13px] font-bold tracking-wide" style={{ color: SLATE }}>
            STEP {step + 1} OF {STEPS.length} — {STEPS[step].label.toUpperCase()}
          </span>
        </div>

        {STEPS[step].key === "basics" && (
          <div className="bg-white rounded-xl border p-5 sm:p-6" style={{ borderColor: LIGHTGREY }}>
            <SectionHeading num="1" title="Basic Info" />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Field label="Resident Name(s)" span={2}><TextInput value={form.residentNames} onChange={set("residentNames")} /></Field>
              <Field label="Unit Number"><TextInput value={form.unitNumber} onChange={set("unitNumber")} /></Field>
              <Field label="Inspection Date"><TextInput type="date" value={form.inspectionDate} onChange={set("inspectionDate")} /></Field>
              <Field label="Number of Bedrooms">
                <select value={form.numBedrooms} onChange={set("numBedrooms")} className="w-full rounded-md border px-3 py-2.5 text-[14px] outline-none" style={{ borderColor: LIGHTGREY, color: INK }}>
                  <option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option>
                </select>
              </Field>
              <Field label="Number of Bathrooms">
                <select value={form.numBathrooms} onChange={set("numBathrooms")} className="w-full rounded-md border px-3 py-2.5 text-[14px] outline-none" style={{ borderColor: LIGHTGREY, color: INK }}>
                  <option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option>
                </select>
              </Field>
            </div>
          </div>
        )}

        {STEPS[step].key === "rooms" && (
          <>
            <Callout>Walk through each room together. Every item defaults to "Good" — only change what's actually different, and add a note if something needs explaining.</Callout>
            {sections.map((section) => (
              <RoomAccordion key={section.key} section={section} conditions={form.conditions} onChange={setCondition} />
            ))}
          </>
        )}

        {STEPS[step].key === "keys" && (
          <div className="bg-white rounded-xl border p-5 sm:p-6" style={{ borderColor: LIGHTGREY }}>
            <SectionHeading num="3" title="Keys & Comments" />
            <div className="grid grid-cols-3 gap-4 mb-5">
              <Field label="Door Keys Given"><TextInput value={form.doorKeyCount} onChange={set("doorKeyCount")} placeholder="e.g. 2" /></Field>
              <Field label="Laundry Key">
                <select value={form.laundryKeyGiven} onChange={set("laundryKeyGiven")} className="w-full rounded-md border px-3 py-2.5 text-[14px] outline-none" style={{ borderColor: LIGHTGREY, color: INK }}>
                  <option value="">—</option><option>Yes</option><option>No</option><option>N/A</option>
                </select>
              </Field>
              <Field label="Mailbox Key">
                <select value={form.mailboxKeyGiven} onChange={set("mailboxKeyGiven")} className="w-full rounded-md border px-3 py-2.5 text-[14px] outline-none" style={{ borderColor: LIGHTGREY, color: INK }}>
                  <option value="">—</option><option>Yes</option><option>No</option><option>N/A</option>
                </select>
              </Field>
            </div>
            <Field label="Comments">
              <TextArea value={form.comments} onChange={set("comments")} rows={4} placeholder="Anything worth noting that didn't fit above" />
            </Field>
          </div>
        )}

        {STEPS[step].key === "sign" && (
          <div className="bg-white rounded-xl border p-5 sm:p-6" style={{ borderColor: LIGHTGREY }}>
            <SectionHeading num="4" title="Review & Sign" />

            <label className="flex items-start gap-3 mb-6 p-4 rounded-md" style={{ backgroundColor: PALEGREY }}>
              <input type="checkbox" checked={form.alarmsAck} onChange={set("alarmsAck")} className="mt-1 w-4 h-4" />
              <span className="text-[14px]" style={{ color: INK }}>
                Resident acknowledges that all smoke alarms, carbon monoxide alarms, and fire extinguishers were tested in their presence and found to be in working order, and agrees to test all detectors at least once a month and report any problems in writing.
              </span>
            </label>

            <p className="text-[13px] font-bold mb-3" style={{ color: SLATE }}>RESIDENT</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Field label="Resident's Name" required><TextInput value={form.tenantName} onChange={set("tenantName")} /></Field>
              <Field label="Resident's Email" required><TextInput type="email" value={form.tenantEmail} onChange={set("tenantEmail")} /></Field>
            </div>
            <div className="mb-6">
              <SignatureField value={form.tenantSignature} onChange={set("tenantSignature")} />
            </div>

            <p className="text-[13px] font-bold mb-3" style={{ color: SLATE }}>IJAM HOUSING REPRESENTATIVE</p>
            <div className="mb-4">
              <Field label="Representative's Name" required><TextInput value={form.staffName} onChange={set("staffName")} /></Field>
            </div>
            <div className="mb-6">
              <SignatureField value={form.staffSignature} onChange={set("staffSignature")} />
            </div>

            <Field label="Date"><TextInput type="date" value={form.signatureDate || todayStr()} onChange={set("signatureDate")} /></Field>

            {submitState === "error" && <SubmitErrorBox message={resultMessage} onDownload={downloadCopy} />}

            <SubmitButton canSubmit={canSubmit} submitState={submitState} onClick={handleSubmit} label="Sign & Submit Report" />
          </div>
        )}

        <NavButtons canGoBack={canGoBack} onBack={() => setStep((s) => s - 1)} onNext={() => canGoNext && setStep((s) => s + 1)} isLastStep={isSignStep} />
      </div>
    </div>
  );
}

export default function PropertyConditionReportApp() {
  return (
    <ErrorBoundary>
      <PropertyConditionReportForm />
    </ErrorBoundary>
  );
}
