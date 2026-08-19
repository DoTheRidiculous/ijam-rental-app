import React, { useState, useCallback } from "react";
import { Package, FileSignature, ShieldCheck, PenLine } from "lucide-react";
import {
  ErrorBoundary, Field, TextInput, TextArea, SectionHeading, Callout,
  AppHeader, NavButtons, SuccessScreen, SignatureField, SubmitErrorBox, SubmitButton,
  useDraftStorage, downloadDocumentPdf, submitToDrive, todayStr,
  INK, CHARCOAL, SLATE, MIDGREY, LIGHTGREY, PALEGREY, ORG_EMAIL,
} from "./formKit.jsx";

const STEPS = [
  { key: "item", label: "Item Details", icon: Package },
  { key: "terms", label: "Loan Terms", icon: FileSignature },
  { key: "care", label: "Care & Liability", icon: ShieldCheck },
  { key: "sign", label: "Review & Sign", icon: PenLine },
];

const emptyForm = {
  itemDescription: "", itemCondition: "", estimatedValue: "",
  loanPurpose: "", loanStartDate: "", returnNoticeTerms: "", transportResponsibility: "",
  specialCareInstructions: "",
  ownerName: "", ownerEmail: "", ownerSignature: "", ownerAck: false,
  borrowerRepName: "", borrowerSignature: "", borrowerAck: false,
  signatureDate: "",
};

const QUERY_MAP = [
  ["tenant", "ownerName"],
  ["email", "ownerEmail"],
];

const CARE_TERMS = [
  "IJAM Housing agrees to keep the loaned item(s) in good working order while in its care, and to cover the cost of routine maintenance and any repairs needed due to normal use during the loan period.",
  "IJAM Housing will promptly notify the Owner of any significant damage, malfunction, or issue affecting the item(s).",
  "The item(s) remain the sole property of the Owner at all times. This agreement does not transfer ownership.",
  "If the item(s) are lost, stolen, or damaged beyond normal wear and tear while in IJAM Housing's care, IJAM Housing will either repair the item(s) or reimburse the Owner up to the estimated value stated in this agreement, at the Owner's choice.",
  "Normal wear and tear from ordinary use is expected and is not something IJAM Housing is responsible for reimbursing.",
  "The Owner is responsible for disclosing any known pre-existing issues or defects with the item(s) at the time of loan. IJAM Housing is not responsible for pre-existing conditions disclosed at the outset.",
  "Upon the Owner's request for return, IJAM Housing will return the item(s) within the notice period stated in this agreement, in the same condition as received, normal wear and tear excepted.",
];

function PropertyLoanForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [submitState, setSubmitState] = useState("idle");
  const [resultMessage, setResultMessage] = useState("");
  const [resultLink, setResultLink] = useState(null);

  const draft = useDraftStorage("draft:property-loan-agreement", emptyForm, setForm, QUERY_MAP);

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
    return `PROPERTY LOAN AGREEMENT
Submitted: ${new Date().toLocaleString()}

This Property Loan Agreement is entered into between the Owner of the item(s) described below and IJAM Housing (the "Borrower"). The Owner is voluntarily loaning the item(s) below for IJAM Housing's use, with the clear understanding that the item(s) remain the Owner's property and will be returned upon request.

1. ITEM DETAILS
Item(s) being loaned: ${f.itemDescription}
Condition / known issues at time of loan: ${f.itemCondition}
Estimated value: ${f.estimatedValue}

2. LOAN TERMS
Purpose of loan: ${f.loanPurpose}
Loan start date: ${f.loanStartDate}
Return notice terms (how much notice the Owner will give before requesting return): ${f.returnNoticeTerms}
Responsibility for pickup/delivery and transport costs: ${f.transportResponsibility}

3. CARE, MAINTENANCE & LIABILITY
${CARE_TERMS.map((t, i) => `${i + 1}. ${t}`).join("\n")}

Special care instructions from Owner: ${f.specialCareInstructions || "None provided."}

4. SIGNATURES

OWNER
Name: ${f.ownerName}
Email: ${f.ownerEmail}
Typed signature: ${f.ownerSignature}
Acknowledged terms above: ${f.ownerAck ? "Yes" : "No"}

BORROWER (IJAM Housing Representative)
Name: ${f.borrowerRepName}
Typed signature: ${f.borrowerSignature}
Acknowledged terms above: ${f.borrowerAck ? "Yes" : "No"}

Date signed: ${f.signatureDate}

By signing above, both parties agree to the terms of this Property Loan Agreement.

Note: This is a general agreement intended to document a good-faith property loan between the Owner and IJAM Housing. It is not a substitute for legal advice; for high-value items or complex situations, a local attorney should review this agreement.
`;
  }, [form]);

  const handleSubmit = async () => {
    setSubmitState("sending");
    setResultMessage("");
    setResultLink(null);
    const docText = buildDocumentText();
    const dateLabel = form.signatureDate || todayStr();
    const docTitle = `Property Loan Agreement - ${form.ownerName || "Owner"} - ${dateLabel}`;

    try {
      const data = await submitToDrive({
        docTitle, docText, signerEmail: form.ownerEmail,
        shareMessage: "Attached is the completed and signed Property Loan Agreement.",
      });
      draft.clear();
      setResultMessage(`This agreement was saved and shared with ${form.ownerEmail} and ${ORG_EMAIL}.`);
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
      title: "PROPERTY LOAN AGREEMENT",
      subtitle: `Submitted: ${new Date().toLocaleString()}`,
      docText: buildDocumentText(),
      fileName: `Property_Loan_Agreement_${(form.ownerName || "owner").replace(/\s+/g, "_")}.pdf`,
    });
  };

  const startOver = () => {
    setForm(emptyForm);
    setSubmitState("idle");
    setStep(0);
    draft.clear();
  };

  const canSubmit =
    form.ownerName && form.ownerEmail && form.ownerSignature.trim().length > 1 && form.ownerAck &&
    form.borrowerRepName && form.borrowerSignature.trim().length > 1 && form.borrowerAck;

  if (submitState === "success") {
    return (
      <SuccessScreen
        resultMessage={resultMessage}
        resultLink={resultLink}
        signerEmail={form.ownerEmail}
        onDownload={downloadCopy}
        onStartOver={startOver}
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: PALEGREY }}>
      <AppHeader eyebrow="IJAM HOUSING" title="Property Loan Agreement" step={step} totalSteps={STEPS.length} noticeText={draft.noticeText} />

      <div className="max-w-2xl mx-auto px-5 py-6">
        <div className="flex items-center gap-2 mb-6">
          {React.createElement(STEPS[step].icon, { size: 18, color: SLATE })}
          <span className="text-[13px] font-bold tracking-wide" style={{ color: SLATE }}>
            STEP {step + 1} OF {STEPS.length} — {STEPS[step].label.toUpperCase()}
          </span>
        </div>

        <div className="bg-white rounded-xl border p-5 sm:p-6" style={{ borderColor: LIGHTGREY }}>
          {STEPS[step].key === "item" && (
            <>
              <SectionHeading num="1" title="Item Details" />
              <Callout>This documents exactly what's being loaned and its condition, so there's no confusion later about what was loaned or what shape it was in.</Callout>
              <div className="flex flex-col gap-5">
                <Field label="Item(s) being loaned" required>
                  <TextArea value={form.itemDescription} onChange={set("itemDescription")} rows={2} placeholder="e.g. Washer and dryer" />
                </Field>
                <Field label="Condition / known issues at time of loan">
                  <TextArea value={form.itemCondition} onChange={set("itemCondition")} rows={3} placeholder="Note any existing dents, wear, or issues" />
                </Field>
                <Field label="Estimated value (for repair/replacement reference)">
                  <TextInput value={form.estimatedValue} onChange={set("estimatedValue")} placeholder="$" />
                </Field>
              </div>
            </>
          )}

          {STEPS[step].key === "terms" && (
            <>
              <SectionHeading num="2" title="Loan Terms" />
              <div className="flex flex-col gap-5">
                <Field label="Purpose of loan"><TextInput value={form.loanPurpose} onChange={set("loanPurpose")} placeholder="e.g. For use during tenant's housing arrangement" /></Field>
                <Field label="Loan start date"><TextInput type="date" value={form.loanStartDate} onChange={set("loanStartDate")} /></Field>
                <Field label="Return notice terms">
                  <TextArea value={form.returnNoticeTerms} onChange={set("returnNoticeTerms")} rows={2} placeholder="e.g. Owner will give 2 weeks' notice before requesting return" />
                </Field>
                <Field label="Who handles pickup/delivery and transport costs">
                  <TextArea value={form.transportResponsibility} onChange={set("transportResponsibility")} rows={2} />
                </Field>
              </div>
            </>
          )}

          {STEPS[step].key === "care" && (
            <>
              <SectionHeading num="3" title="Care, Maintenance & Liability" />
              <Callout>These are the standard terms that protect both sides — the Owner keeps ownership and gets the item back in good shape, and IJAM Housing isn't on the hook for normal wear and tear or issues that existed beforehand.</Callout>
              <div className="flex flex-col gap-2 mb-5">
                {CARE_TERMS.map((t, i) => (
                  <p key={i} className="text-[13px]" style={{ color: INK }}>
                    <span style={{ color: SLATE, fontWeight: 700 }}>{i + 1}. </span>{t}
                  </p>
                ))}
              </div>
              <Field label="Any special care instructions from the Owner?">
                <TextArea value={form.specialCareInstructions} onChange={set("specialCareInstructions")} rows={3} />
              </Field>
            </>
          )}

          {STEPS[step].key === "sign" && (
            <>
              <SectionHeading num="4" title="Review & Sign" />
              <Callout>Both the Owner and an IJAM Housing representative sign below to confirm this agreement.</Callout>

              <p className="text-[13px] font-bold mb-3" style={{ color: SLATE }}>OWNER</p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Field label="Owner's Name" required><TextInput value={form.ownerName} onChange={set("ownerName")} /></Field>
                <Field label="Owner's Email" required><TextInput type="email" value={form.ownerEmail} onChange={set("ownerEmail")} /></Field>
              </div>
              <div className="mb-4">
                <SignatureField value={form.ownerSignature} onChange={set("ownerSignature")} />
              </div>
              <label className="flex items-start gap-3 mb-8 p-4 rounded-md" style={{ backgroundColor: PALEGREY }}>
                <input type="checkbox" checked={form.ownerAck} onChange={set("ownerAck")} className="mt-1 w-4 h-4" />
                <span className="text-[14px]" style={{ color: INK }}>I am the owner of the item(s) above, and I agree to loan them under the terms of this agreement.</span>
              </label>

              <p className="text-[13px] font-bold mb-3" style={{ color: SLATE }}>BORROWER (IJAM Housing Representative)</p>
              <div className="mb-4">
                <Field label="Representative's Name" required><TextInput value={form.borrowerRepName} onChange={set("borrowerRepName")} /></Field>
              </div>
              <div className="mb-4">
                <Field label="Type your full name as your signature" required>
                  <input
                    value={form.borrowerSignature}
                    onChange={set("borrowerSignature")}
                    placeholder="Your full name"
                    className="w-full rounded-md border px-3 py-3 text-2xl outline-none"
                    style={{ fontFamily: "'Brush Script MT', cursive", borderColor: LIGHTGREY, color: INK }}
                  />
                </Field>
              </div>
              <label className="flex items-start gap-3 mb-6 p-4 rounded-md" style={{ backgroundColor: PALEGREY }}>
                <input type="checkbox" checked={form.borrowerAck} onChange={set("borrowerAck")} className="mt-1 w-4 h-4" />
                <span className="text-[14px]" style={{ color: INK }}>On behalf of IJAM Housing, I agree to the care, maintenance, and return terms of this agreement.</span>
              </label>

              <Field label="Date"><TextInput type="date" value={form.signatureDate || todayStr()} onChange={set("signatureDate")} /></Field>

              {submitState === "error" && <SubmitErrorBox message={resultMessage} onDownload={downloadCopy} />}

              <SubmitButton canSubmit={canSubmit} submitState={submitState} onClick={handleSubmit} label="Sign & Submit Agreement" />
            </>
          )}
        </div>

        <NavButtons canGoBack={canGoBack} onBack={() => setStep((s) => s - 1)} onNext={() => canGoNext && setStep((s) => s + 1)} isLastStep={isSignStep} />

        <p className="text-center text-[12px] mt-6" style={{ color: MIDGREY }}>Best filled out together with the Owner, since it needs both signatures.</p>
      </div>
    </div>
  );
}

export default function PropertyLoanAgreementApp() {
  return (
    <ErrorBoundary>
      <PropertyLoanForm />
    </ErrorBoundary>
  );
}
