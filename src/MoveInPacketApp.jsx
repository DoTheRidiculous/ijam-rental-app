import React, { useState, useCallback } from "react";
import { Wifi, ClipboardList, PenLine, Plus, Trash2 } from "lucide-react";
import {
  ErrorBoundary, Field, TextInput, TextArea, SectionHeading, Callout,
  AppHeader, NavButtons, SuccessScreen, SignatureField, SubmitErrorBox, SubmitButton,
  useDraftStorage, downloadDocumentPdf, submitToDrive, todayStr,
  INK, CHARCOAL, SLATE, MIDGREY, LIGHTGREY, PALEGREY, ORG_EMAIL,
} from "./formKit.jsx";

const STEPS = [
  { key: "info", label: "Welcome & WiFi", icon: Wifi },
  { key: "checklist", label: "Move-In Checklist", icon: ClipboardList },
  { key: "sign", label: "Review & Sign", icon: PenLine },
];

const emptyChecklistRow = () => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, item: "", condition: "Good", notes: "" });

const emptyForm = {
  wifiNetwork: "", wifiPassword: "",
  staffContactName: "", staffContactPhone: "",
  trashDay: "", otherNotes: "",
  checklist: [emptyChecklistRow()],
  tenantName: "", tenantEmail: "", tenantSignature: "", tenantAck: false,
  signatureDate: "",
};

const QUERY_MAP = [
  ["tenant", "tenantName"],
  ["email", "tenantEmail"],
  ["wifi", "wifiNetwork"],
  ["wifipass", "wifiPassword"],
  ["staffname", "staffContactName"],
  ["staffphone", "staffContactPhone"],
  ["trash", "trashDay"],
];

function MoveInPacketForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [submitState, setSubmitState] = useState("idle");
  const [resultMessage, setResultMessage] = useState("");
  const [resultLink, setResultLink] = useState(null);

  const draft = useDraftStorage("draft:move-in-packet", emptyForm, setForm, QUERY_MAP);

  const set = (key) => (e) => {
    const val = e && e.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e;
    setForm((f) => {
      const next = { ...f, [key]: val };
      draft.save(next);
      return next;
    });
  };

  const setChecklistField = (id, key, value) => {
    setForm((f) => {
      const next = { ...f, checklist: f.checklist.map((row) => (row.id === id ? { ...row, [key]: value } : row)) };
      draft.save(next);
      return next;
    });
  };

  const addChecklistRow = () => setForm((f) => ({ ...f, checklist: [...f.checklist, emptyChecklistRow()] }));
  const removeChecklistRow = (id) => setForm((f) => ({ ...f, checklist: f.checklist.filter((row) => row.id !== id) }));

  const isSignStep = STEPS[step].key === "sign";
  const canGoNext = step < STEPS.length - 1;
  const canGoBack = step > 0;

  const buildDocumentText = useCallback(() => {
    const f = form;
    const checklistRows = f.checklist.filter((r) => r.item.trim());
    return `MOVE-IN PACKET
Submitted: ${new Date().toLocaleString()}

1. WELCOME & WIFI
WiFi Network: ${f.wifiNetwork}
WiFi Password: ${f.wifiPassword}
Staff Contact: ${f.staffContactName} — ${f.staffContactPhone}
Trash/Recycling Day: ${f.trashDay}
Other Notes: ${f.otherNotes || "None"}

2. MOVE-IN CONDITION CHECKLIST
${checklistRows.length > 0
  ? checklistRows.map((r, i) => `${i + 1}. ${r.item} — Condition: ${r.condition}${r.notes ? ` — Notes: ${r.notes}` : ""}`).join("\n")
  : "No items recorded."}

3. TENANT ACKNOWLEDGMENT
Name: ${f.tenantName}
Email: ${f.tenantEmail}
Typed signature: ${f.tenantSignature}
Acknowledged receipt of this packet and agreement with the recorded condition above: ${f.tenantAck ? "Yes" : "No"}
Date: ${f.signatureDate}

By signing above, the tenant confirms they received this welcome packet and reviewed the move-in condition checklist. This record may be referenced at move-out.
`;
  }, [form]);

  const handleSubmit = async () => {
    setSubmitState("sending");
    setResultMessage("");
    setResultLink(null);
    const docText = buildDocumentText();
    const dateLabel = form.signatureDate || todayStr();
    const docTitle = `Move-In Packet - ${form.tenantName || "Tenant"} - ${dateLabel}`;

    try {
      const data = await submitToDrive({
        docTitle, docText, signerEmail: form.tenantEmail, personName: form.tenantName,
        shareMessage: "Attached is your Move-In Packet, including your WiFi info and move-in condition checklist.",
      });
      draft.clear();
      setResultMessage(`This packet was saved and shared with ${form.tenantEmail} and ${ORG_EMAIL}.`);
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
      title: "MOVE-IN PACKET",
      subtitle: `Submitted: ${new Date().toLocaleString()}`,
      docText: buildDocumentText(),
      fileName: `Move_In_Packet_${(form.tenantName || "tenant").replace(/\s+/g, "_")}.pdf`,
    });
  };

  const startOver = () => {
    setForm(emptyForm);
    setSubmitState("idle");
    setStep(0);
    draft.clear();
  };

  const canSubmit = form.tenantName && form.tenantEmail && form.tenantSignature.trim().length > 1 && form.tenantAck;

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
      <AppHeader eyebrow="IJAM HOUSING" title="Move-In Packet" step={step} totalSteps={STEPS.length} noticeText={draft.noticeText} />

      <div className="max-w-2xl mx-auto px-5 py-6">
        <div className="flex items-center gap-2 mb-6">
          {React.createElement(STEPS[step].icon, { size: 18, color: SLATE })}
          <span className="text-[13px] font-bold tracking-wide" style={{ color: SLATE }}>
            STEP {step + 1} OF {STEPS.length} — {STEPS[step].label.toUpperCase()}
          </span>
        </div>

        <div className="bg-white rounded-xl border p-5 sm:p-6" style={{ borderColor: LIGHTGREY }}>
          {STEPS[step].key === "info" && (
            <>
              <SectionHeading num="1" title="Welcome & WiFi" />
              <Callout>Fill this in once per unit — reuse the same info for future tenants moving into the same space.</Callout>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <Field label="WiFi Network Name"><TextInput value={form.wifiNetwork} onChange={set("wifiNetwork")} /></Field>
                <Field label="WiFi Password"><TextInput value={form.wifiPassword} onChange={set("wifiPassword")} /></Field>
                <Field label="Staff Contact Name"><TextInput value={form.staffContactName} onChange={set("staffContactName")} /></Field>
                <Field label="Staff Contact Phone"><TextInput value={form.staffContactPhone} onChange={set("staffContactPhone")} /></Field>
                <Field label="Trash/Recycling Day" span={2}><TextInput value={form.trashDay} onChange={set("trashDay")} placeholder="e.g. Trash Tuesdays, Recycling every other Friday" /></Field>
              </div>
              <Field label="Anything else the tenant should know?">
                <TextArea value={form.otherNotes} onChange={set("otherNotes")} rows={3} placeholder="Parking, quiet hours, mail/package info, etc." />
              </Field>
            </>
          )}

          {STEPS[step].key === "checklist" && (
            <>
              <SectionHeading num="2" title="Move-In Condition Checklist" />
              <Callout>Walk through the unit together and record the condition of anything already there — appliances, fixtures, furniture. This protects both sides if there's ever a question at move-out.</Callout>

              <div className="flex flex-col gap-3 mb-4">
                {form.checklist.map((row) => (
                  <div key={row.id} className="p-3 rounded-md border" style={{ borderColor: LIGHTGREY, backgroundColor: PALEGREY }}>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <input
                        value={row.item}
                        onChange={(e) => setChecklistField(row.id, "item", e.target.value)}
                        placeholder="Item or area (e.g. Kitchen sink)"
                        className="rounded-md border px-3 py-2 text-[14px] outline-none"
                        style={{ borderColor: LIGHTGREY, color: INK, backgroundColor: "#fff" }}
                      />
                      <select
                        value={row.condition}
                        onChange={(e) => setChecklistField(row.id, "condition", e.target.value)}
                        className="rounded-md border px-3 py-2 text-[14px] outline-none"
                        style={{ borderColor: LIGHTGREY, color: INK, backgroundColor: "#fff" }}
                      >
                        <option>Good</option>
                        <option>Fair</option>
                        <option>Poor</option>
                        <option>Not Applicable</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={row.notes}
                        onChange={(e) => setChecklistField(row.id, "notes", e.target.value)}
                        placeholder="Notes (optional)"
                        className="flex-1 rounded-md border px-3 py-2 text-[13px] outline-none"
                        style={{ borderColor: LIGHTGREY, color: INK, backgroundColor: "#fff" }}
                      />
                      <button
                        type="button"
                        onClick={() => removeChecklistRow(row.id)}
                        className="w-9 h-9 flex items-center justify-center rounded-md flex-shrink-0"
                        style={{ backgroundColor: "#fff", border: `1px solid ${LIGHTGREY}` }}
                      >
                        <Trash2 size={15} color={SLATE} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addChecklistRow}
                className="flex items-center gap-2 px-4 py-2.5 rounded-md text-[13px] font-semibold"
                style={{ backgroundColor: PALEGREY, color: CHARCOAL, border: `1px solid ${LIGHTGREY}` }}
              >
                <Plus size={15} /> Add Item
              </button>
            </>
          )}

          {STEPS[step].key === "sign" && (
            <>
              <SectionHeading num="3" title="Review & Sign" />
              <Callout>The tenant reviews the info above and signs to confirm they received it and agree with the recorded condition of the unit.</Callout>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <Field label="Tenant's Name" required><TextInput value={form.tenantName} onChange={set("tenantName")} /></Field>
                <Field label="Tenant's Email" required><TextInput type="email" value={form.tenantEmail} onChange={set("tenantEmail")} /></Field>
              </div>
              <div className="mb-4">
                <SignatureField value={form.tenantSignature} onChange={set("tenantSignature")} />
              </div>
              <label className="flex items-start gap-3 mb-6 p-4 rounded-md" style={{ backgroundColor: PALEGREY }}>
                <input type="checkbox" checked={form.tenantAck} onChange={set("tenantAck")} className="mt-1 w-4 h-4" />
                <span className="text-[14px]" style={{ color: INK }}>I received this Move-In Packet and reviewed the move-in condition checklist above.</span>
              </label>

              <Field label="Date"><TextInput type="date" value={form.signatureDate || todayStr()} onChange={set("signatureDate")} /></Field>

              {submitState === "error" && <SubmitErrorBox message={resultMessage} onDownload={downloadCopy} />}

              <SubmitButton canSubmit={canSubmit} submitState={submitState} onClick={handleSubmit} label="Sign & Submit" />
            </>
          )}
        </div>

        <NavButtons canGoBack={canGoBack} onBack={() => setStep((s) => s - 1)} onNext={() => canGoNext && setStep((s) => s + 1)} isLastStep={isSignStep} />
      </div>
    </div>
  );
}

export default function MoveInPacketApp() {
  return (
    <ErrorBoundary>
      <MoveInPacketForm />
    </ErrorBoundary>
  );
}
