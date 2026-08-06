import React, { useState, useCallback } from "react";
import { Users, Home, DollarSign, ListChecks, PenLine } from "lucide-react";
import {
  ErrorBoundary, Field, TextInput, TextArea, SectionHeading, Callout,
  AppHeader, NavButtons, SuccessScreen, SignatureField, SubmitErrorBox, SubmitButton,
  useDraftStorage, downloadDocumentPdf, submitToDrive, todayStr,
  INK, CHARCOAL, SLATE, MIDGREY, LIGHTGREY, PALEGREY, ORG_EMAIL,
} from "./formKit.jsx";

const STEPS = [
  { key: "parties", label: "Parties & Property", icon: Users },
  { key: "terms", label: "Lease Terms", icon: Home },
  { key: "deposits", label: "Deposits", icon: DollarSign },
  { key: "conditions", label: "Conditions", icon: ListChecks },
  { key: "sign", label: "Review & Sign", icon: PenLine },
];

const emptyForm = {
  agreementDate: "", landlordName: "", tenant1Name: "", tenant2Name: "",
  propertyAddress: "", leaseCommencementDate: "", monthlyRent: "",
  securityDeposit: "", reservationDeposit: "", finalLeaseDeadline: "",
  conditionsAcknowledged: false,
  typedSignature: "", agreeToSign: false, signatureDate: "",
  signerEmail: "",
};

function AgreementToLeaseForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [submitState, setSubmitState] = useState("idle");
  const [resultMessage, setResultMessage] = useState("");
  const [resultLink, setResultLink] = useState(null);

  const draft = useDraftStorage("draft:agreement-to-lease", emptyForm, setForm);

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
    return `AGREEMENT TO LEASE
Pre-Lease Reservation Agreement — State of Tennessee
Submitted: ${new Date().toLocaleString()}

1. PARTIES
Agreement Date: ${f.agreementDate}
Landlord / Owner: ${f.landlordName}
Prospective Tenant: ${f.tenant1Name}
Prospective Tenant: ${f.tenant2Name}

2. PROPERTY
Property Address: ${f.propertyAddress}

3. FUTURE LEASE COMMITMENT
Lease Commencement Date: ${f.leaseCommencementDate}
The anticipated lease term shall be twelve (12) months unless otherwise agreed in writing.

4. MONTHLY RENT
Monthly Rent: ${f.monthlyRent}
Rent shall be due on the first day of each month beginning on the Lease Commencement Date.

5. SECURITY DEPOSIT
Security Deposit: ${f.securityDeposit}
Governed by the terms of the final Lease Agreement and applicable Tennessee law.

6. RESERVATION DEPOSIT
Reservation Deposit: ${f.reservationDeposit}
This Reservation Deposit reserves the property exclusively for Tenant and is credited toward the Security Deposit or first month's rent at move-in, unless Tenant fails to execute the final Lease Agreement or occupy the property without legal justification, in which case it may be forfeited as liquidated damages to the extent permitted by Tennessee law.

7. EXECUTION OF FINAL LEASE
Final Lease Execution Deadline: ${f.finalLeaseDeadline}
The final lease shall contain the standard terms and conditions customarily used by Landlord.

8. CONDITIONS
This Agreement is contingent upon satisfactory background screening, income verification, identity verification, payment of all required deposits, and compliance with all application requirements.
Conditions acknowledged by Tenant: ${f.conditionsAcknowledged ? "Yes" : "No"}

9. GOVERNING LAW
This Agreement shall be governed by and interpreted according to the laws of the State of Tennessee.

10. SIGNATURE
Signed by (Tenant): ${f.tenant1Name}
Typed signature: ${f.typedSignature}
Date signed: ${f.signatureDate}
Signer email: ${f.signerEmail}
By signing, the tenant confirmed agreement to the terms above.
`;
  }, [form]);

  const handleSubmit = async () => {
    setSubmitState("sending");
    setResultMessage("");
    setResultLink(null);
    const docText = buildDocumentText();
    const dateLabel = form.signatureDate || todayStr();
    const docTitle = `Agreement to Lease - ${form.tenant1Name || "Tenant"} - ${dateLabel}`;

    try {
      const data = await submitToDrive({
        docTitle, docText, signerEmail: form.signerEmail,
        shareMessage: "Attached is the completed and signed Agreement to Lease.",
      });
      draft.clear();
      setResultMessage(`This agreement was saved and shared with ${form.signerEmail} and ${ORG_EMAIL}.`);
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
      title: "AGREEMENT TO LEASE",
      subtitle: `Pre-Lease Reservation Agreement — Submitted: ${new Date().toLocaleString()}`,
      docText: buildDocumentText(),
      fileName: `Agreement_to_Lease_${(form.tenant1Name || "tenant").replace(/\s+/g, "_")}.pdf`,
    });
  };

  const startOver = () => {
    setForm(emptyForm);
    setSubmitState("idle");
    setStep(0);
    draft.clear();
  };

  const canSubmit =
    form.tenant1Name && form.signerEmail && form.agreeToSign && form.typedSignature.trim().length > 1;

  if (submitState === "success") {
    return (
      <SuccessScreen
        resultMessage={resultMessage}
        resultLink={resultLink}
        signerEmail={form.signerEmail}
        onDownload={downloadCopy}
        onStartOver={startOver}
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: PALEGREY }}>
      <AppHeader eyebrow="IJAM HOUSING" title="Agreement to Lease" step={step} totalSteps={STEPS.length} restoredNotice={draft.restoredNotice} />

      <div className="max-w-2xl mx-auto px-5 py-6">
        <div className="flex items-center gap-2 mb-6">
          {React.createElement(STEPS[step].icon, { size: 18, color: SLATE })}
          <span className="text-[13px] font-bold tracking-wide" style={{ color: SLATE }}>
            STEP {step + 1} OF {STEPS.length} — {STEPS[step].label.toUpperCase()}
          </span>
        </div>

        <div className="bg-white rounded-xl border p-5 sm:p-6" style={{ borderColor: LIGHTGREY }}>
          {STEPS[step].key === "parties" && (
            <>
              <SectionHeading num="1" title="Parties & Property" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Agreement Date"><TextInput type="date" value={form.agreementDate} onChange={set("agreementDate")} /></Field>
                <Field label="Landlord / Owner" required><TextInput value={form.landlordName} onChange={set("landlordName")} /></Field>
                <Field label="Prospective Tenant (you)" span={2} required><TextInput value={form.tenant1Name} onChange={set("tenant1Name")} /></Field>
                <Field label="Prospective Tenant (co-tenant, if any)" span={2}><TextInput value={form.tenant2Name} onChange={set("tenant2Name")} /></Field>
                <Field label="Property Address" span={2} required><TextInput value={form.propertyAddress} onChange={set("propertyAddress")} /></Field>
              </div>
            </>
          )}

          {STEPS[step].key === "terms" && (
            <>
              <SectionHeading num="2" title="Future Lease Commitment" />
              <Callout>This sets when the real lease will start, and locks in the rent so it can't change on you later.</Callout>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Lease Commencement Date" required><TextInput type="date" value={form.leaseCommencementDate} onChange={set("leaseCommencementDate")} /></Field>
                <Field label="Monthly Rent" required><TextInput value={form.monthlyRent} onChange={set("monthlyRent")} placeholder="$" /></Field>
                <Field label="Final Lease Execution Deadline" span={2}><TextInput type="date" value={form.finalLeaseDeadline} onChange={set("finalLeaseDeadline")} /></Field>
              </div>
            </>
          )}

          {STEPS[step].key === "deposits" && (
            <>
              <SectionHeading num="3" title="Deposits" />
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Field label="Security Deposit" required><TextInput value={form.securityDeposit} onChange={set("securityDeposit")} placeholder="$" /></Field>
                <Field label="Reservation Deposit" required><TextInput value={form.reservationDeposit} onChange={set("reservationDeposit")} placeholder="$" /></Field>
              </div>
              <Callout>The reservation deposit holds the unit just for you. It's normally credited toward your security deposit or first month's rent — but if you back out without a valid reason, it may be forfeited.</Callout>
            </>
          )}

          {STEPS[step].key === "conditions" && (
            <>
              <SectionHeading num="4" title="Conditions" />
              <p className="text-[14px] mb-4" style={{ color: INK }}>
                This agreement is contingent on the following, which must be satisfied before the final lease is signed:
              </p>
              <ul className="text-[14px] mb-5 space-y-1.5" style={{ color: INK }}>
                <li>— Satisfactory background screening</li>
                <li>— Income verification</li>
                <li>— Identity verification</li>
                <li>— Payment of all required deposits</li>
                <li>— Compliance with all application requirements</li>
              </ul>
              <label className="flex items-start gap-3 p-4 rounded-md" style={{ backgroundColor: PALEGREY }}>
                <input type="checkbox" checked={form.conditionsAcknowledged} onChange={set("conditionsAcknowledged")} className="mt-1 w-4 h-4" />
                <span className="text-[14px]" style={{ color: INK }}>I understand and agree to these conditions.</span>
              </label>
            </>
          )}

          {STEPS[step].key === "sign" && (
            <>
              <SectionHeading num="5" title="Review & Sign" />
              <Callout>Signing below confirms you agree to reserve this property under the terms above, including the reservation deposit terms.</Callout>

              <Field label="Email to send your signed copy to" required>
                <TextInput type="email" value={form.signerEmail} onChange={set("signerEmail")} placeholder="you@email.com" />
              </Field>

              <div className="mt-5">
                <SignatureField value={form.typedSignature} onChange={set("typedSignature")} />
              </div>

              <div className="mt-4">
                <Field label="Date"><TextInput type="date" value={form.signatureDate || todayStr()} onChange={set("signatureDate")} /></Field>
              </div>

              <label className="flex items-start gap-3 mt-5 p-4 rounded-md" style={{ backgroundColor: PALEGREY }}>
                <input type="checkbox" checked={form.agreeToSign} onChange={set("agreeToSign")} className="mt-1 w-4 h-4" />
                <span className="text-[14px]" style={{ color: INK }}>
                  I agree this counts as my electronic signature, and that I have read and agree to the terms of this Agreement to Lease.
                </span>
              </label>

              {submitState === "error" && <SubmitErrorBox message={resultMessage} onDownload={downloadCopy} />}

              <SubmitButton canSubmit={canSubmit} submitState={submitState} onClick={handleSubmit} label="Sign & Submit Agreement" />
            </>
          )}
        </div>

        <NavButtons canGoBack={canGoBack} onBack={() => setStep((s) => s - 1)} onNext={() => canGoNext && setStep((s) => s + 1)} isLastStep={isSignStep} />

        <p className="text-center text-[12px] mt-6" style={{ color: MIDGREY }}>Your progress is saved automatically in this browser as you go.</p>
      </div>
    </div>
  );
}

export default function AgreementToLeaseApp() {
  return (
    <ErrorBoundary>
      <AgreementToLeaseForm />
    </ErrorBoundary>
  );
}
