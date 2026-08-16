import React, { useState, useCallback } from "react";
import { Warehouse, Gift, StickyNote, ClipboardCheck } from "lucide-react";
import {
  ErrorBoundary, Field, TextInput, TextArea, YesNo, SectionHeading, Callout,
  AppHeader, NavButtons, SuccessScreen, SubmitErrorBox, SubmitButton,
  useDraftStorage, downloadDocumentPdf, submitToDrive,
  INK, CHARCOAL, SLATE, MIDGREY, LIGHTGREY, PALEGREY, ORG_EMAIL,
} from "./formKit.jsx";

const STEPS = [
  { key: "storage", label: "Storage Needs", icon: Warehouse },
  { key: "donation", label: "Donation / Give Away", icon: Gift },
  { key: "notes", label: "Additional Notes", icon: StickyNote },
  { key: "review", label: "Review & Submit", icon: ClipboardCheck },
];

const emptyForm = {
  needsStorage: "", itemsForStorage: "",
  itemsToDonate: "", donationConsent: false,
  additionalNotes: "",
  respondentName: "", respondentEmail: "", nonBindingAck: false,
};

const QUERY_MAP = [
  ["tenant", "respondentName"],
  ["email", "respondentEmail"],
];

const DISCLAIMER =
  "This form is a planning tool only. Completing it does not create a storage contract, and does not make IJAM Housing " +
  "legally responsible for storing, insuring, holding, or handling your belongings. If storage is arranged, it will be " +
  "through a separate storage provider under its own terms. Any items marked for donation or giving away are given " +
  "with your consent and at your direction — IJAM Housing is not liable for their condition, value, or disposition " +
  "once given away.";

function MoveInStorageConsentForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [submitState, setSubmitState] = useState("idle");
  const [resultMessage, setResultMessage] = useState("");
  const [resultLink, setResultLink] = useState(null);

  const draft = useDraftStorage("draft:storage-donation-consent", emptyForm, setForm, QUERY_MAP);

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
    return `ITEM STORAGE & DONATION CONSENT
Submitted: ${new Date().toLocaleString()}

1. STORAGE NEEDS
Needs help arranging storage: ${f.needsStorage}
Items requested for storage: ${f.itemsForStorage}

2. DONATION / GIVE AWAY
Items comfortable donating or giving away: ${f.itemsToDonate}
Consent given to donate/give away the items listed above: ${f.donationConsent ? "Yes" : "No"}

3. ADDITIONAL NOTES
${f.additionalNotes}

4. RESPONDENT
Completed by: ${f.respondentName}
Email: ${f.respondentEmail}
Acknowledged non-binding terms: ${f.nonBindingAck ? "Yes" : "No"}

DISCLAIMER
${DISCLAIMER}
`;
  }, [form]);

  const handleSubmit = async () => {
    setSubmitState("sending");
    setResultMessage("");
    setResultLink(null);
    const docText = buildDocumentText();
    const docTitle = `Item Storage & Donation Consent - ${form.respondentName || "Respondent"}`;

    try {
      const data = await submitToDrive({
        docTitle, docText, signerEmail: form.respondentEmail,
        shareMessage: "Attached is the Item Storage & Donation Consent form.",
        endpoint: "/api/submit-questionnaire",
      });
      draft.clear();
      setResultMessage(
        data.updated
          ? `Your existing form was updated with these answers, and a copy was shared with ${form.respondentEmail} and ${ORG_EMAIL}.`
          : `This form was saved and shared with ${form.respondentEmail} and ${ORG_EMAIL}.`
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
      title: "ITEM STORAGE & DONATION CONSENT",
      subtitle: `Submitted: ${new Date().toLocaleString()}`,
      docText: buildDocumentText(),
      fileName: `Storage_Donation_Consent_${(form.respondentName || "respondent").replace(/\s+/g, "_")}.pdf`,
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
      <AppHeader eyebrow="IJAM HOUSING" title="Storage & Donation Consent" step={step} totalSteps={STEPS.length} noticeText={draft.noticeText} />

      <div className="max-w-2xl mx-auto px-5 py-6">
        <div className="flex items-center gap-2 mb-6">
          {React.createElement(STEPS[step].icon, { size: 18, color: SLATE })}
          <span className="text-[13px] font-bold tracking-wide" style={{ color: SLATE }}>
            STEP {step + 1} OF {STEPS.length} — {STEPS[step].label.toUpperCase()}
          </span>
        </div>

        <div className="bg-white rounded-xl border p-5 sm:p-6" style={{ borderColor: LIGHTGREY }}>
          {STEPS[step].key === "storage" && (
            <>
              <SectionHeading num="1" title="Storage Needs" />
              <Callout>
                If there are things you can't bring to the apartment but still want to keep, let us know here — this
                just helps us plan, it doesn't commit you or us to anything yet.
              </Callout>
              <div className="flex items-center justify-between gap-4 mb-5">
                <span className="text-[14px]" style={{ color: INK }}>Would you like help arranging storage?</span>
                <YesNo value={form.needsStorage} onChange={setYesNo("needsStorage")} />
              </div>
              <Field label="Items you'd like stored"><TextArea value={form.itemsForStorage} onChange={set("itemsForStorage")} rows={4} /></Field>
            </>
          )}

          {STEPS[step].key === "donation" && (
            <>
              <SectionHeading num="2" title="Donation / Give Away" />
              <Callout>
                If there are things you don't need or can't keep, you can let us know here — nothing gets given away
                without your say-so below.
              </Callout>
              <Field label="Items you're comfortable donating or giving away"><TextArea value={form.itemsToDonate} onChange={set("itemsToDonate")} rows={4} /></Field>
              <label className="flex items-start gap-3 mt-5 p-4 rounded-md" style={{ backgroundColor: PALEGREY }}>
                <input type="checkbox" checked={form.donationConsent} onChange={set("donationConsent")} className="mt-1 w-4 h-4" />
                <span className="text-[14px]" style={{ color: INK }}>
                  I give my permission for the items listed above to be donated or given away if I don't bring them or arrange to store them.
                </span>
              </label>
            </>
          )}

          {STEPS[step].key === "notes" && (
            <>
              <SectionHeading num="3" title="Additional Notes" />
              <Field label="Anything else we should know?"><TextArea value={form.additionalNotes} onChange={set("additionalNotes")} rows={5} /></Field>
            </>
          )}

          {STEPS[step].key === "review" && (
            <>
              <SectionHeading num="4" title="Review & Submit" />
              <div className="mb-5 p-4 rounded-md text-[13px] leading-relaxed" style={{ backgroundColor: PALEGREY, color: SLATE }}>
                {DISCLAIMER}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <Field label="Your Name" required><TextInput value={form.respondentName} onChange={set("respondentName")} /></Field>
                <Field label="Email to send a copy to" required><TextInput type="email" value={form.respondentEmail} onChange={set("respondentEmail")} /></Field>
              </div>

              <label className="flex items-start gap-3 p-4 rounded-md" style={{ backgroundColor: PALEGREY }}>
                <input type="checkbox" checked={form.nonBindingAck} onChange={set("nonBindingAck")} className="mt-1 w-4 h-4" />
                <span className="text-[14px]" style={{ color: INK }}>
                  I understand this form is for planning purposes only and does not create any legal obligation, contract, or liability for IJAM Housing regarding storage or handling of my belongings.
                </span>
              </label>

              {submitState === "error" && <SubmitErrorBox message={resultMessage} onDownload={downloadCopy} />}

              <SubmitButton canSubmit={canSubmit} submitState={submitState} onClick={handleSubmit} label="Submit" />
            </>
          )}
        </div>

        <NavButtons canGoBack={canGoBack} onBack={() => setStep((s) => s - 1)} onNext={() => canGoNext && setStep((s) => s + 1)} isLastStep={isLastStep} />

        <p className="text-center text-[12px] mt-6" style={{ color: MIDGREY }}>You can come back and update this anytime using the same name.</p>
      </div>
    </div>
  );
}

export default function StorageDonationConsentApp() {
  return (
    <ErrorBoundary>
      <MoveInStorageConsentForm />
    </ErrorBoundary>
  );
}
