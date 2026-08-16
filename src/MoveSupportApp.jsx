import React, { useState, useCallback } from "react";
import { Truck, PackageOpen, ClipboardCheck } from "lucide-react";
import {
  ErrorBoundary, Field, TextInput, TextArea, YesNo, SectionHeading, Callout,
  AppHeader, NavButtons, SuccessScreen, SubmitErrorBox, SubmitButton,
  useDraftStorage, downloadDocumentPdf, submitToDrive,
  INK, CHARCOAL, SLATE, MIDGREY, LIGHTGREY, PALEGREY, ORG_EMAIL,
} from "./formKit.jsx";

const STEPS = [
  { key: "moving", label: "Move Support", icon: Truck },
  { key: "boxes", label: "Boxes", icon: PackageOpen },
  { key: "review", label: "Review & Submit", icon: ClipboardCheck },
];

const emptyForm = {
  needsMovingHelp: "", startMoveDate: "", earliestMoveDate: "", latestMoveDate: "",
  needsBoxes: "", numBoxes: "", boxSizes: "",
  respondentName: "", respondentEmail: "", nonBindingAck: false,
};

const QUERY_MAP = [
  ["tenant", "respondentName"],
  ["email", "respondentEmail"],
];

function MoveSupportForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [submitState, setSubmitState] = useState("idle");
  const [resultMessage, setResultMessage] = useState("");
  const [resultLink, setResultLink] = useState(null);

  const draft = useDraftStorage("draft:move-support", emptyForm, setForm, QUERY_MAP);

  const set = (key) => (e) => {
    const val = e && e.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e;
    setForm((f) => {
      const next = { ...f, [key]: val };
      draft.save(next);
      return next;
    });
  };

  const setYesNo = (key) => (v) =>
    setForm((f) => {
      const next = { ...f, [key]: v };
      draft.save(next);
      return next;
    });

  const isLastStep = STEPS[step].key === "review";
  const canGoNext = step < STEPS.length - 1;
  const canGoBack = step > 0;

  const buildDocumentText = useCallback(() => {
    const f = form;
    return `MOVE SUPPORT REQUEST
Submitted: ${new Date().toLocaleString()}

1. MOVE SUPPORT
Needs support moving belongings: ${f.needsMovingHelp}
Date planning to start moving in: ${f.startMoveDate}
Earliest possible move day: ${f.earliestMoveDate}
Latest possible move day: ${f.latestMoveDate}

2. BOXES
Needs boxes: ${f.needsBoxes}
Number of boxes needed: ${f.numBoxes}
Box sizes needed: ${f.boxSizes}

3. RESPONDENT
Completed by: ${f.respondentName}
Email: ${f.respondentEmail}
Acknowledged this is a planning request only: ${f.nonBindingAck ? "Yes" : "No"}
`;
  }, [form]);

  const handleSubmit = async () => {
    setSubmitState("sending");
    setResultMessage("");
    setResultLink(null);
    const docText = buildDocumentText();
    const docTitle = `Move Support Request - ${form.respondentName || "Respondent"}`;

    try {
      const data = await submitToDrive({
        docTitle, docText, signerEmail: form.respondentEmail,
        shareMessage: "Attached is the Move Support Request form.",
        endpoint: "/api/submit-questionnaire",
      });
      draft.clear();
      setResultMessage(
        data.updated
          ? `Your existing request was updated, and a copy was shared with ${form.respondentEmail} and ${ORG_EMAIL}.`
          : `This request was saved and shared with ${form.respondentEmail} and ${ORG_EMAIL}.`
      );
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
      title: "MOVE SUPPORT REQUEST",
      subtitle: `Submitted: ${new Date().toLocaleString()}`,
      docText: buildDocumentText(),
      fileName: `Move_Support_Request_${(form.respondentName || "respondent").replace(/\s+/g, "_")}.pdf`,
    });
  };

  const startOver = () => {
    setForm(emptyForm);
    setSubmitState("idle");
    setStep(0);
    draft.clear();
  };

  const canSubmit = form.respondentName && form.respondentEmail && form.nonBindingAck;

  if (submitState === "success") {
    return (
      <SuccessScreen
        resultMessage={resultMessage}
        resultLink={resultLink}
        signerEmail={form.respondentEmail}
        onDownload={downloadCopy}
        onStartOver={startOver}
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: PALEGREY }}>
      <AppHeader eyebrow="IJAM HOUSING" title="Move Support Request" step={step} totalSteps={STEPS.length} noticeText={draft.noticeText} />

      <div className="max-w-2xl mx-auto px-5 py-6">
        <div className="flex items-center gap-2 mb-6">
          {React.createElement(STEPS[step].icon, { size: 18, color: SLATE })}
          <span className="text-[13px] font-bold tracking-wide" style={{ color: SLATE }}>
            STEP {step + 1} OF {STEPS.length} — {STEPS[step].label.toUpperCase()}
          </span>
        </div>

        <div className="bg-white rounded-xl border p-5 sm:p-6" style={{ borderColor: LIGHTGREY }}>
          {STEPS[step].key === "moving" && (
            <>
              <SectionHeading num="1" title="Move Support" />
              <div className="flex items-center justify-between gap-4 mb-5">
                <span className="text-[14px]" style={{ color: INK }}>Do you need any support moving your belongings?</span>
                <YesNo value={form.needsMovingHelp} onChange={setYesNo("needsMovingHelp")} />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <Field label="Date you plan to start moving in" span={2}>
                  <TextInput type="date" value={form.startMoveDate} onChange={set("startMoveDate")} />
                </Field>
                <Field label="Earliest day you could move">
                  <TextInput type="date" value={form.earliestMoveDate} onChange={set("earliestMoveDate")} />
                </Field>
                <Field label="Latest day you could move">
                  <TextInput type="date" value={form.latestMoveDate} onChange={set("latestMoveDate")} />
                </Field>
              </div>
            </>
          )}

          {STEPS[step].key === "boxes" && (
            <>
              <SectionHeading num="2" title="Boxes" />
              <div className="flex items-center justify-between gap-4 mb-5">
                <span className="text-[14px]" style={{ color: INK }}>Do you need moving boxes?</span>
                <YesNo value={form.needsBoxes} onChange={setYesNo("needsBoxes")} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="How many boxes?"><TextInput value={form.numBoxes} onChange={set("numBoxes")} /></Field>
                <Field label="What size(s)?"><TextInput value={form.boxSizes} onChange={set("boxSizes")} placeholder="e.g. Small, Medium, Large" /></Field>
              </div>
            </>
          )}

          {STEPS[step].key === "review" && (
            <>
              <SectionHeading num="3" title="Review & Submit" />
              <Callout>
                This is a request for planning purposes — it helps us understand what support to line up ahead of your move.
                Come back to this same link anytime to update it.
              </Callout>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <Field label="Your Name" required><TextInput value={form.respondentName} onChange={set("respondentName")} /></Field>
                <Field label="Email to send a copy to" required><TextInput type="email" value={form.respondentEmail} onChange={set("respondentEmail")} /></Field>
              </div>

              <label className="flex items-start gap-3 p-4 rounded-md" style={{ backgroundColor: PALEGREY }}>
                <input type="checkbox" checked={form.nonBindingAck} onChange={set("nonBindingAck")} className="mt-1 w-4 h-4" />
                <span className="text-[14px]" style={{ color: INK }}>
                  I understand this is a request for planning purposes, and that specific support (boxes, moving help) will be confirmed separately based on availability.
                </span>
              </label>

              {submitState === "error" && <SubmitErrorBox message={resultMessage} onDownload={downloadCopy} />}

              <SubmitButton canSubmit={canSubmit} submitState={submitState} onClick={handleSubmit} label="Submit Request" />
            </>
          )}
        </div>

        <NavButtons canGoBack={canGoBack} onBack={() => setStep((s) => s - 1)} onNext={() => canGoNext && setStep((s) => s + 1)} isLastStep={isLastStep} />

        <p className="text-center text-[12px] mt-6" style={{ color: MIDGREY }}>You can come back and update this anytime using the same name.</p>
      </div>
    </div>
  );
}

export default function MoveSupportApp() {
  return (
    <ErrorBoundary>
      <MoveSupportForm />
    </ErrorBoundary>
  );
}
