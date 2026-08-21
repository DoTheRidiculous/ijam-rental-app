import React, { useState, useCallback } from "react";
import { Home, User, Building2, Briefcase, Users, ShieldCheck, DollarSign, PenLine } from "lucide-react";
import {
  ErrorBoundary, Field, TextInput, TextArea, YesNo, SectionHeading, Callout,
  AppHeader, NavButtons, SuccessScreen, SignatureField, SubmitErrorBox, SubmitButton,
  useDraftStorage, downloadDocumentPdf, submitToDrive, todayStr,
  INK, CHARCOAL, SLATE, MIDGREY, LIGHTGREY, PALEGREY, ORG_EMAIL,
} from "./formKit.jsx";

const STEPS = [
  { key: "property", label: "Property", icon: Home },
  { key: "applicant", label: "About You", icon: User },
  { key: "residence", label: "Residence History", icon: Building2 },
  { key: "employment", label: "Employment", icon: Briefcase },
  { key: "references", label: "References & Household", icon: Users },
  { key: "background", label: "Background", icon: ShieldCheck },
  { key: "fee", label: "Application Fee", icon: DollarSign },
  { key: "sign", label: "Review & Sign", icon: PenLine },
];

const emptyForm = {
  propertyAddress: "", unitNo: "", moveInDate: "", monthlyRent: "", leaseTermRequested: "",
  fullName: "", dob: "", ssn: "", phone: "", email: "", dlNumber: "", dlState: "", coApplicantName: "", coApplicantIncome: "",
  currAddress: "", currLandlordName: "", currLandlordPhone: "", currRent: "", currLength: "", reasonLeaving: "",
  priorAddress: "", priorLandlordName: "", priorLandlordPhone: "", priorLength: "",
  employer: "", position: "", employmentLength: "", supervisorName: "", employerPhone: "", grossIncome: "", otherIncome: "",
  ref1Name: "", ref1Phone: "", ref1Relationship: "", ref2Name: "", ref2Phone: "", ref2Relationship: "",
  occupants: "", pets: "",
  evicted: "", bankruptcy: "", felony: "", explanation: "",
  appFeeAcknowledged: false,
  typedSignature: "", agreeToSign: false, signatureDate: "",
  signerEmail: "",
};

// Query params a link can pre-fill, e.g. ?address=123+Main+St&rent=1200&tenant=Jane+Doe&email=jane@email.com
const QUERY_MAP = [
  ["address", "propertyAddress"],
  ["unit", "unitNo"],
  ["movein", "moveInDate"],
  ["rent", "monthlyRent"],
  ["term", "leaseTermRequested"],
  ["tenant", "fullName"],
  ["phone", "phone"],
  ["email", "email"],
  ["email", "signerEmail"],
];

function RentalApplicationForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [submitState, setSubmitState] = useState("idle");
  const [resultMessage, setResultMessage] = useState("");
  const [resultLink, setResultLink] = useState(null);

  const draft = useDraftStorage("draft:rental-application", emptyForm, setForm, QUERY_MAP);

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
    return `RENTAL APPLICATION
Submitted: ${new Date().toLocaleString()}

1. PROPERTY APPLIED FOR
Property Address: ${f.propertyAddress}
Unit / Apt No.: ${f.unitNo}
Desired Move-In Date: ${f.moveInDate}
Monthly Rent: ${f.monthlyRent}
Lease Term Requested: ${f.leaseTermRequested}

2. APPLICANT INFORMATION
Full Legal Name: ${f.fullName}
Date of Birth: ${f.dob}
Social Security No.: ${f.ssn}
Phone: ${f.phone}
Email: ${f.email}
Driver's License / State ID No.: ${f.dlNumber}
State Issued: ${f.dlState}
Co-Applicant Name: ${f.coApplicantName}
Co-Applicant Gross Monthly Income: ${f.coApplicantIncome}

3. CURRENT RESIDENCE
Current Address: ${f.currAddress}
Landlord Name: ${f.currLandlordName}
Landlord Phone: ${f.currLandlordPhone}
Monthly Rent: ${f.currRent}
Length of Residency: ${f.currLength}
Reason for Leaving: ${f.reasonLeaving}

4. PRIOR RESIDENCE
Prior Address: ${f.priorAddress}
Landlord Name: ${f.priorLandlordName}
Landlord Phone: ${f.priorLandlordPhone}
Length of Residency: ${f.priorLength}

5. EMPLOYMENT & INCOME
Current Employer: ${f.employer}
Position / Title: ${f.position}
Length of Employment: ${f.employmentLength}
Supervisor Name: ${f.supervisorName}
Employer Phone: ${f.employerPhone}
Gross Monthly Income: ${f.grossIncome}
Other Income: ${f.otherIncome}

6. PERSONAL REFERENCES
Reference 1: ${f.ref1Name} — ${f.ref1Phone} (${f.ref1Relationship})
Reference 2: ${f.ref2Name} — ${f.ref2Phone} (${f.ref2Relationship})

7. ADDITIONAL OCCUPANTS & PETS
Other Occupants: ${f.occupants}
Pets: ${f.pets}

8. BACKGROUND & AUTHORIZATION
Ever evicted or broken a lease: ${f.evicted}
Ever filed for bankruptcy: ${f.bankruptcy}
Ever convicted of a felony: ${f.felony}
Explanation (if any): ${f.explanation}
Applicant authorized a credit report and criminal background check as part of this application.

9. APPLICATION FEE
Applicant acknowledged the non-refundable application fee: ${f.appFeeAcknowledged ? "Yes" : "No"}

10. SIGNATURE
Signed by: ${f.fullName}
Typed signature: ${f.typedSignature}
Date signed: ${f.signatureDate}
Signer email: ${f.signerEmail}
By signing, the applicant certified that all information provided is true and complete to the best of their knowledge.
`;
  }, [form]);

  const handleSubmit = async () => {
    setSubmitState("sending");
    setResultMessage("");
    setResultLink(null);
    const docText = buildDocumentText();
    const dateLabel = form.signatureDate || todayStr();
    const docTitle = `Rental Application - ${form.fullName || "Applicant"} - ${dateLabel}`;

    try {
      const data = await submitToDrive({
        docTitle, docText, signerEmail: form.signerEmail, personName: form.fullName,
        shareMessage: "Attached is the completed and signed Rental Application.",
      });
      draft.clear();
      setResultMessage(`This application was saved and shared with ${form.signerEmail} and ${ORG_EMAIL}.`);
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
      title: "RENTAL APPLICATION",
      subtitle: `Submitted: ${new Date().toLocaleString()}`,
      docText: buildDocumentText(),
      fileName: `Rental_Application_${(form.fullName || "applicant").replace(/\s+/g, "_")}.pdf`,
    });
  };

  const startOver = () => {
    setForm(emptyForm);
    setSubmitState("idle");
    setStep(0);
    draft.clear();
  };

  const canSubmit =
    form.fullName && form.signerEmail && form.agreeToSign && form.typedSignature.trim().length > 1;

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
      <AppHeader eyebrow="IJAM HOUSING" title="Rental Application" step={step} totalSteps={STEPS.length} noticeText={draft.noticeText} />

      <div className="max-w-2xl mx-auto px-5 py-6">
        <div className="flex items-center gap-2 mb-6">
          {React.createElement(STEPS[step].icon, { size: 18, color: SLATE })}
          <span className="text-[13px] font-bold tracking-wide" style={{ color: SLATE }}>
            STEP {step + 1} OF {STEPS.length} — {STEPS[step].label.toUpperCase()}
          </span>
        </div>

        <div className="bg-white rounded-xl border p-5 sm:p-6" style={{ borderColor: LIGHTGREY }}>
          {STEPS[step].key === "property" && (
            <>
              <SectionHeading num="1" title="Property Applied For" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Property Address" span={2} required><TextInput value={form.propertyAddress} onChange={set("propertyAddress")} placeholder="123 Main St, Nashville, TN" /></Field>
                <Field label="Unit / Apt No."><TextInput value={form.unitNo} onChange={set("unitNo")} /></Field>
                <Field label="Desired Move-In Date"><TextInput type="date" value={form.moveInDate} onChange={set("moveInDate")} /></Field>
                <Field label="Monthly Rent"><TextInput value={form.monthlyRent} onChange={set("monthlyRent")} placeholder="$" /></Field>
                <Field label="Lease Term Requested"><TextInput value={form.leaseTermRequested} onChange={set("leaseTermRequested")} placeholder="12 months" /></Field>
              </div>
            </>
          )}

          {STEPS[step].key === "applicant" && (
            <>
              <SectionHeading num="2" title="Applicant Information" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Full Legal Name" span={2} required><TextInput value={form.fullName} onChange={set("fullName")} /></Field>
                <Field label="Date of Birth"><TextInput type="date" value={form.dob} onChange={set("dob")} /></Field>
                <Field label="Social Security No."><TextInput value={form.ssn} onChange={set("ssn")} placeholder="XXX-XX-XXXX" /></Field>
                <Field label="Phone" required><TextInput type="tel" value={form.phone} onChange={set("phone")} /></Field>
                <Field label="Email" required><TextInput type="email" value={form.email} onChange={set("email")} /></Field>
                <Field label="Driver's License / State ID No."><TextInput value={form.dlNumber} onChange={set("dlNumber")} /></Field>
                <Field label="State Issued"><TextInput value={form.dlState} onChange={set("dlState")} placeholder="TN" /></Field>
                <Field label="Co-Applicant Name (if any)"><TextInput value={form.coApplicantName} onChange={set("coApplicantName")} /></Field>
                <Field label="Co-Applicant Gross Monthly Income"><TextInput value={form.coApplicantIncome} onChange={set("coApplicantIncome")} placeholder="$" /></Field>
              </div>
            </>
          )}

          {STEPS[step].key === "residence" && (
            <>
              <SectionHeading num="3" title="Current Residence" />
              <div className="grid grid-cols-2 gap-4 mb-8">
                <Field label="Current Address" span={2} required><TextInput value={form.currAddress} onChange={set("currAddress")} /></Field>
                <Field label="Landlord Name"><TextInput value={form.currLandlordName} onChange={set("currLandlordName")} /></Field>
                <Field label="Landlord Phone"><TextInput type="tel" value={form.currLandlordPhone} onChange={set("currLandlordPhone")} /></Field>
                <Field label="Monthly Rent"><TextInput value={form.currRent} onChange={set("currRent")} /></Field>
                <Field label="Length of Residency"><TextInput value={form.currLength} onChange={set("currLength")} placeholder="2 years" /></Field>
                <Field label="Reason for Leaving" span={2}><TextArea value={form.reasonLeaving} onChange={set("reasonLeaving")} /></Field>
              </div>
              <SectionHeading num="4" title="Prior Residence (if under 2 years at current address)" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Prior Address" span={2}><TextInput value={form.priorAddress} onChange={set("priorAddress")} /></Field>
                <Field label="Landlord Name"><TextInput value={form.priorLandlordName} onChange={set("priorLandlordName")} /></Field>
                <Field label="Landlord Phone"><TextInput type="tel" value={form.priorLandlordPhone} onChange={set("priorLandlordPhone")} /></Field>
                <Field label="Length of Residency" span={2}><TextInput value={form.priorLength} onChange={set("priorLength")} /></Field>
              </div>
            </>
          )}

          {STEPS[step].key === "employment" && (
            <>
              <SectionHeading num="5" title="Employment & Income" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Current Employer" span={2} required><TextInput value={form.employer} onChange={set("employer")} /></Field>
                <Field label="Position / Title"><TextInput value={form.position} onChange={set("position")} /></Field>
                <Field label="Length of Employment"><TextInput value={form.employmentLength} onChange={set("employmentLength")} /></Field>
                <Field label="Supervisor Name"><TextInput value={form.supervisorName} onChange={set("supervisorName")} /></Field>
                <Field label="Employer Phone"><TextInput type="tel" value={form.employerPhone} onChange={set("employerPhone")} /></Field>
                <Field label="Gross Monthly Income" required><TextInput value={form.grossIncome} onChange={set("grossIncome")} placeholder="$" /></Field>
                <Field label="Other Income (source)"><TextInput value={form.otherIncome} onChange={set("otherIncome")} /></Field>
              </div>
            </>
          )}

          {STEPS[step].key === "references" && (
            <>
              <SectionHeading num="6" title="Personal References" />
              <div className="grid grid-cols-2 gap-4 mb-8">
                <Field label="Reference 1 — Name"><TextInput value={form.ref1Name} onChange={set("ref1Name")} /></Field>
                <Field label="Phone"><TextInput type="tel" value={form.ref1Phone} onChange={set("ref1Phone")} /></Field>
                <Field label="Relationship" span={2}><TextInput value={form.ref1Relationship} onChange={set("ref1Relationship")} /></Field>
                <Field label="Reference 2 — Name"><TextInput value={form.ref2Name} onChange={set("ref2Name")} /></Field>
                <Field label="Phone"><TextInput type="tel" value={form.ref2Phone} onChange={set("ref2Phone")} /></Field>
                <Field label="Relationship" span={2}><TextInput value={form.ref2Relationship} onChange={set("ref2Relationship")} /></Field>
              </div>
              <SectionHeading num="7" title="Additional Occupants & Pets" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Other Occupants (name, age)" span={2}><TextArea value={form.occupants} onChange={set("occupants")} rows={2} /></Field>
                <Field label="Pets (type, breed, weight)" span={2}><TextArea value={form.pets} onChange={set("pets")} rows={2} /></Field>
              </div>
            </>
          )}

          {STEPS[step].key === "background" && (
            <>
              <SectionHeading num="8" title="Background & Authorization" />
              <p className="text-[14px] mb-5" style={{ color: INK }}>
                By continuing, you authorize us to verify this information and to obtain a consumer credit report and criminal background check as part of evaluating this application.
              </p>
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[14px]" style={{ color: INK }}>Ever evicted, or broken a lease?</span>
                  <YesNo value={form.evicted} onChange={(v) => setForm((f) => { const n = { ...f, evicted: v }; draft.save(n); return n; })} />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[14px]" style={{ color: INK }}>Ever filed for bankruptcy?</span>
                  <YesNo value={form.bankruptcy} onChange={(v) => setForm((f) => { const n = { ...f, bankruptcy: v }; draft.save(n); return n; })} />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[14px]" style={{ color: INK }}>Ever convicted of a felony?</span>
                  <YesNo value={form.felony} onChange={(v) => setForm((f) => { const n = { ...f, felony: v }; draft.save(n); return n; })} />
                </div>
                <Field label="If yes to any of the above, please explain"><TextArea value={form.explanation} onChange={set("explanation")} /></Field>
              </div>
            </>
          )}

          {STEPS[step].key === "fee" && (
            <>
              <SectionHeading num="9" title="Application Fee" />
              <p className="text-[14px] mb-4" style={{ color: INK }}>
                A non-refundable application fee applies to cover the cost of screening. Payment instructions will be provided separately after you submit this application.
              </p>
              <label className="flex items-start gap-3 p-4 rounded-md" style={{ backgroundColor: PALEGREY }}>
                <input type="checkbox" checked={form.appFeeAcknowledged} onChange={set("appFeeAcknowledged")} className="mt-1 w-4 h-4" />
                <span className="text-[14px]" style={{ color: INK }}>I understand a non-refundable application fee applies to this application.</span>
              </label>
            </>
          )}

          {STEPS[step].key === "sign" && (
            <>
              <SectionHeading num="10" title="Review & Sign" />
              <Callout>Signing below confirms everything you entered is true and complete, and that you agree to a background and credit check.</Callout>

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
                  I agree this counts as my electronic signature, and that everything in this application is true and complete to the best of my knowledge.
                </span>
              </label>

              {submitState === "error" && <SubmitErrorBox message={resultMessage} onDownload={downloadCopy} />}

              <SubmitButton canSubmit={canSubmit} submitState={submitState} onClick={handleSubmit} label="Sign & Submit Application" />
            </>
          )}
        </div>

        <NavButtons canGoBack={canGoBack} onBack={() => setStep((s) => s - 1)} onNext={() => canGoNext && setStep((s) => s + 1)} isLastStep={isSignStep} />

        <p className="text-center text-[12px] mt-6" style={{ color: MIDGREY }}>Your progress is saved automatically in this browser as you go.</p>
      </div>
    </div>
  );
}

export default function RentalApplicationApp() {
  return (
    <ErrorBoundary>
      <RentalApplicationForm />
    </ErrorBoundary>
  );
}
