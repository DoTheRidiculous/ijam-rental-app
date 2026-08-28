import React, { useState, useCallback } from "react";
import { Wifi, PenLine } from "lucide-react";
import {
  ErrorBoundary, Field, TextInput, TextArea, SectionHeading, Callout,
  AppHeader, NavButtons, SuccessScreen, SignatureField, SubmitErrorBox, SubmitButton,
  useDraftStorage, downloadDocumentPdf, submitToDrive, todayStr,
  INK, CHARCOAL, SLATE, MIDGREY, LIGHTGREY, PALEGREY, ORG_EMAIL,
} from "./formKit.jsx";

const STEPS = [
  { key: "info", label: "Welcome & WiFi", icon: Wifi },
  { key: "sign", label: "Review & Sign", icon: PenLine },
];

const emptyForm = {
  wifiNetwork: "", wifiPassword: "",
  staffContactName: "", staffContactPhone: "",
  trashDay: "", otherNotes: "",
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

  const isSignStep = STEPS[step].key === "sign";
  const canGoNext = step < STEPS.length - 1;
  const canGoBack = step > 0;

  const buildDocumentText = useCallback(() => {
    const f = form;
    return `MOVE-IN PACKET
Submitted: ${new Date().toLocaleString()}

1. WELCOME & WIFI
WiFi Network: ${f.wifiNetwork}
WiFi Password: ${f.wifiPassword}
Staff Contact: ${f.staffContactName} — ${f.staffContactPhone}
Trash/Recycling Day: ${f.trashDay}
Other Notes: ${f.otherNotes || "None"}

2. TENANT ACKNOWLEDGMENT
Name: ${f.tenantName}
Email: ${f.tenantEmail}
Typed signature: ${f.tenantSignature}
Acknowledged receipt of this packet: ${f.tenantAck ? "Yes" : "No"}
Date: ${f.signatureDate}

Note: the detailed room-by-room move-in condition checklist is a separate document — see the Property Condition Report.
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
        shareMessage: "Attached is your Move-In Packet, including your WiFi info.",
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
              <Callout>Fill this in once per unit — reuse the same info for future tenants moving into the same space. Looking for the detailed room-by-room condition checklist? That's the separate Property Condition Report.</Callout>
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

          {STEPS[step].key === "sign" && (
            <>
              <SectionHeading num="2" title="Review & Sign" />
              <Callout>The tenant reviews the info above and signs to confirm they received it.</Callout>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <Field label="Tenant's Name" required><TextInput value={form.tenantName} onChange={set("tenantName")} /></Field>
                <Field label="Tenant's Email" required><TextInput type="email" value={form.tenantEmail} onChange={set("tenantEmail")} /></Field>
              </div>
              <div className="mb-4">
                <SignatureField value={form.tenantSignature} onChange={set("tenantSignature")} />
              </div>
              <label className="flex items-start gap-3 mb-6 p-4 rounded-md" style={{ backgroundColor: PALEGREY }}>
                <input type="checkbox" checked={form.tenantAck} onChange={set("tenantAck")} className="mt-1 w-4 h-4" />
                <span className="text-[14px]" style={{ color: INK }}>I received this Move-In Packet.</span>
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
