import React, { useState, useCallback } from "react";
import { Users, Home, DollarSign, PawPrint, FileText, PenLine } from "lucide-react";
import {
  ErrorBoundary, Field, TextInput, TextArea, SectionHeading, Callout,
  AppHeader, NavButtons, SuccessScreen, SignatureField, SubmitErrorBox, SubmitButton,
  useDraftStorage, downloadDocumentPdf, submitToDrive, todayStr,
  INK, CHARCOAL, SLATE, MIDGREY, LIGHTGREY, PALEGREY, ORG_EMAIL,
} from "./formKit.jsx";

const STEPS = [
  { key: "parties", label: "Parties & Premises", icon: Users },
  { key: "term", label: "Lease Term & Rent", icon: Home },
  { key: "deposit", label: "Deposit & Utilities", icon: DollarSign },
  { key: "occupants", label: "Occupants & Pets", icon: PawPrint },
  { key: "additional", label: "Additional Terms", icon: FileText },
  { key: "sign", label: "Review & Sign", icon: PenLine },
];

const emptyForm = {
  leaseDate: "", landlordName: "", tenant1Name: "", tenant2Name: "",
  premisesAddress: "", commencementDate: "", expirationDate: "", leaseTerm: "",
  monthlyRent: "", dueDate: "", lateFee: "", gracePeriod: "",
  securityDeposit: "", utilitiesIncluded: "",
  additionalOccupants: "", pets: "",
  additionalTerms: "",
  typedSignature: "", agreeToSign: false, signatureDate: "",
  signerEmail: "",
};

function ResidentialLeaseForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [submitState, setSubmitState] = useState("idle");
  const [resultMessage, setResultMessage] = useState("");
  const [resultLink, setResultLink] = useState(null);

  const draft = useDraftStorage("draft:residential-lease", emptyForm, setForm);

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
    return `RESIDENTIAL LEASE AGREEMENT
State of Tennessee
Submitted: ${new Date().toLocaleString()}

1. PARTIES
Lease Date: ${f.leaseDate}
Landlord / Owner: ${f.landlordName}
Tenant: ${f.tenant1Name}
Tenant: ${f.tenant2Name}

2. PREMISES
Premises Address: ${f.premisesAddress}
For use as a private residence only.

3. LEASE TERM
Commencement Date: ${f.commencementDate}
Expiration Date: ${f.expirationDate}
Lease Term: ${f.leaseTerm}

4. RENT
Monthly Rent: ${f.monthlyRent}
Due Date: ${f.dueDate}
Late Fee: ${f.lateFee}
Grace Period: ${f.gracePeriod}

5. SECURITY DEPOSIT
Security Deposit Amount: ${f.securityDeposit}
Held and returned in accordance with Tennessee law.

6. UTILITIES
Utilities Included in Rent: ${f.utilitiesIncluded}

7. OCCUPANTS & USE OF PREMISES
Additional Occupants: ${f.additionalOccupants}

8. PETS
Approved Pet(s) / Pet Deposit: ${f.pets}

9. MAINTENANCE, ALTERATIONS & ENTRY
Tenant shall maintain the Premises and promptly report needed repairs. Landlord shall maintain the Premises in a fit and habitable condition. No alterations without Landlord's written consent. Landlord may enter with reasonable notice, except in emergencies.

10. ASSIGNMENT & SUBLETTING
No assignment or subletting without Landlord's prior written consent.

11. DEFAULT, INSURANCE & NOTICES
Default is governed by Tennessee law. Landlord's insurance does not cover Tenant's personal property; renter's insurance is encouraged. All notices must be in writing.

12. GOVERNING LAW
This Lease shall be governed by and interpreted according to the laws of the State of Tennessee.

13. ADDITIONAL PROVISIONS
${f.additionalTerms}

14. SIGNATURE
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
    const docTitle = `Residential Lease - ${form.tenant1Name || "Tenant"} - ${dateLabel}`;

    try {
      const data = await submitToDrive({
        docTitle, docText, signerEmail: form.signerEmail,
        shareMessage: "Attached is the completed and signed Residential Lease Agreement.",
      });
      draft.clear();
      setResultMessage(`This lease was saved and shared with ${form.signerEmail} and ${ORG_EMAIL}.`);
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
      title: "RESIDENTIAL LEASE AGREEMENT",
      subtitle: `State of Tennessee — Submitted: ${new Date().toLocaleString()}`,
      docText: buildDocumentText(),
      fileName: `Residential_Lease_${(form.tenant1Name || "tenant").replace(/\s+/g, "_")}.pdf`,
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
      <AppHeader eyebrow="IJAM HOUSING" title="Residential Lease" step={step} totalSteps={STEPS.length} restoredNotice={draft.restoredNotice} />

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
              <SectionHeading num="1" title="Parties & Premises" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Lease Date"><TextInput type="date" value={form.leaseDate} onChange={set("leaseDate")} /></Field>
                <Field label="Landlord / Owner" required><TextInput value={form.landlordName} onChange={set("landlordName")} /></Field>
                <Field label="Tenant (you)" span={2} required><TextInput value={form.tenant1Name} onChange={set("tenant1Name")} /></Field>
                <Field label="Tenant (co-tenant, if any)" span={2}><TextInput value={form.tenant2Name} onChange={set("tenant2Name")} /></Field>
                <Field label="Premises Address" span={2} required><TextInput value={form.premisesAddress} onChange={set("premisesAddress")} /></Field>
              </div>
            </>
          )}

          {STEPS[step].key === "term" && (
            <>
              <SectionHeading num="2" title="Lease Term" />
              <div className="grid grid-cols-2 gap-4 mb-8">
                <Field label="Commencement Date" required><TextInput type="date" value={form.commencementDate} onChange={set("commencementDate")} /></Field>
                <Field label="Expiration Date" required><TextInput type="date" value={form.expirationDate} onChange={set("expirationDate")} /></Field>
                <Field label="Lease Term" span={2}><TextInput value={form.leaseTerm} onChange={set("leaseTerm")} placeholder="12 months" /></Field>
              </div>
              <SectionHeading num="3" title="Rent" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Monthly Rent" required><TextInput value={form.monthlyRent} onChange={set("monthlyRent")} placeholder="$" /></Field>
                <Field label="Due Date"><TextInput value={form.dueDate} onChange={set("dueDate")} placeholder="1st of each month" /></Field>
                <Field label="Late Fee"><TextInput value={form.lateFee} onChange={set("lateFee")} placeholder="$" /></Field>
                <Field label="Grace Period"><TextInput value={form.gracePeriod} onChange={set("gracePeriod")} placeholder="5 days" /></Field>
              </div>
            </>
          )}

          {STEPS[step].key === "deposit" && (
            <>
              <SectionHeading num="4" title="Security Deposit" />
              <div className="grid grid-cols-2 gap-4 mb-8">
                <Field label="Security Deposit Amount" span={2} required><TextInput value={form.securityDeposit} onChange={set("securityDeposit")} placeholder="$" /></Field>
              </div>
              <SectionHeading num="5" title="Utilities" />
              <Field label="Utilities Included in Rent, if any"><TextArea value={form.utilitiesIncluded} onChange={set("utilitiesIncluded")} rows={2} /></Field>
            </>
          )}

          {STEPS[step].key === "occupants" && (
            <>
              <SectionHeading num="6" title="Occupants & Use of Premises" />
              <Field label="Additional Occupants (name, age)"><TextArea value={form.additionalOccupants} onChange={set("additionalOccupants")} rows={2} /></Field>
              <div className="mt-6">
                <SectionHeading num="7" title="Pets" />
                <Field label="Approved Pet(s) / Pet Deposit"><TextArea value={form.pets} onChange={set("pets")} rows={2} /></Field>
              </div>
            </>
          )}

          {STEPS[step].key === "additional" && (
            <>
              <SectionHeading num="13" title="Additional Provisions" />
              <Callout>Standard clauses (maintenance, entry, assignment, default, insurance, governing law) are already included in the full agreement — anything unit-specific goes here.</Callout>
              <Field label="Additional Terms"><TextArea value={form.additionalTerms} onChange={set("additionalTerms")} rows={5} /></Field>
            </>
          )}

          {STEPS[step].key === "sign" && (
            <>
              <SectionHeading num="14" title="Review & Sign" />
              <Callout>Signing below confirms you've read and agree to this lease, including the standard maintenance, entry, and default terms.</Callout>

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
                  I agree this counts as my electronic signature, and that I have read and agree to this Residential Lease Agreement.
                </span>
              </label>

              {submitState === "error" && <SubmitErrorBox message={resultMessage} onDownload={downloadCopy} />}

              <SubmitButton canSubmit={canSubmit} submitState={submitState} onClick={handleSubmit} label="Sign & Submit Lease" />
            </>
          )}
        </div>

        <NavButtons canGoBack={canGoBack} onBack={() => setStep((s) => s - 1)} onNext={() => canGoNext && setStep((s) => s + 1)} isLastStep={isSignStep} />

        <p className="text-center text-[12px] mt-6" style={{ color: MIDGREY }}>Your progress is saved automatically in this browser as you go.</p>
      </div>
    </div>
  );
}

export default function ResidentialLeaseApp() {
  return (
    <ErrorBoundary>
      <ResidentialLeaseForm />
    </ErrorBoundary>
  );
}
