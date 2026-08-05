import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Home, User, Building2, Briefcase, Users, ShieldCheck, DollarSign,
  PenLine, ChevronLeft, ChevronRight, CheckCircle2, Loader2, AlertTriangle,
  RotateCcw, Download, Type
} from "lucide-react";

// ---------- Design tokens (matches the IJAM Housing document series) ----------
const INK = "#1A1A1A";
const CHARCOAL = "#2B2B2B";
const SLATE = "#595959";
const MIDGREY = "#8C8C8C";
const LIGHTGREY = "#D9D9D9";
const PALEGREY = "#F2F2F2";
const ORG_EMAIL = "Ijamhousing@gmail.com";

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
  fullName: "", dob: "", ssn: "", phone: "", email: "", dlNumber: "", dlState: "", coApplicantName: "",
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

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ---------- Small UI atoms ----------
function Field({ label, children, span = 1, required = false }) {
  return (
    <div style={{ gridColumn: span === 2 ? "span 2" : "span 1" }} className="flex flex-col gap-1.5">
      <label className="text-[13px] font-semibold tracking-wide" style={{ color: SLATE }}>
        {label}{required && <span style={{ color: MIDGREY }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-md border px-3 py-2.5 text-[15px] outline-none transition-colors focus:ring-2";
const inputStyle = {
  borderColor: LIGHTGREY,
  color: INK,
  backgroundColor: "#FFFFFF",
};

function TextInput(props) {
  return (
    <input
      {...props}
      className={inputClass}
      style={{ ...inputStyle, "--tw-ring-color": CHARCOAL }}
      onFocus={(e) => (e.target.style.borderColor = CHARCOAL)}
      onBlur={(e) => (e.target.style.borderColor = LIGHTGREY)}
    />
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      rows={props.rows || 3}
      className={inputClass + " resize-none"}
      style={{ ...inputStyle }}
      onFocus={(e) => (e.target.style.borderColor = CHARCOAL)}
      onBlur={(e) => (e.target.style.borderColor = LIGHTGREY)}
    />
  );
}

function YesNo({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {["Yes", "No"].map((opt) => (
        <button
          type="button"
          key={opt}
          onClick={() => onChange(opt)}
          className="px-4 py-2 rounded-md text-sm font-medium border transition-colors"
          style={
            value === opt
              ? { backgroundColor: CHARCOAL, color: "#fff", borderColor: CHARCOAL }
              : { backgroundColor: "#fff", color: SLATE, borderColor: LIGHTGREY }
          }
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function SectionHeading({ num, title }) {
  return (
    <div className="mb-5 pb-2" style={{ borderBottom: `1px solid ${LIGHTGREY}` }}>
      <span className="text-[13px] font-bold mr-2" style={{ color: MIDGREY }}>{num}</span>
      <span className="text-[15px] font-bold tracking-wide" style={{ color: CHARCOAL }}>{title.toUpperCase()}</span>
    </div>
  );
}

// ---------- Error boundary (so a bug shows a message instead of a blank screen) ----------
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", backgroundColor: PALEGREY, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, background: "#fff", border: `1px solid ${LIGHTGREY}`, borderRadius: 12, padding: 28 }}>
            <h1 style={{ color: CHARCOAL, fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Something went wrong loading this form</h1>
            <p style={{ color: SLATE, fontSize: 13, marginBottom: 12 }}>
              {String(this.state.error && this.state.error.message ? this.state.error.message : this.state.error)}
            </p>
            <button
              onClick={() => this.setState({ error: null })}
              style={{ backgroundColor: CHARCOAL, color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600 }}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------- Main App ----------
function RentalApplicationForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [submitState, setSubmitState] = useState("idle"); // idle | sending | success | error
  const [resultMessage, setResultMessage] = useState("");
  const [resultLink, setResultLink] = useState(null);
  const [restoredNotice, setRestoredNotice] = useState(false);

  const set = (key) => (e) => {
    const val = e && e.target ? (e.target.type === "checkbox" ? e.target.checked : e.target.value) : e;
    setForm((f) => ({ ...f, [key]: val }));
  };

  const storageAvailable = typeof window !== "undefined" && !!window.localStorage;

  // Restore draft
  useEffect(() => {
    if (!storageAvailable) return;
    try {
      const raw = window.localStorage.getItem("draft:rental-application");
      if (raw) {
        setForm({ ...emptyForm, ...JSON.parse(raw) });
        setRestoredNotice(true);
      }
    } catch (e) {
      // no draft saved yet, or storage unavailable — safe to ignore
    }
  }, []);

  // Autosave draft
  useEffect(() => {
    if (!storageAvailable) return;
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem("draft:rental-application", JSON.stringify(form));
      } catch (e) {
        // storage not available in this environment — safe to ignore
      }
    }, 500);
    return () => clearTimeout(t);
  }, [form]);

  const isSignStep = STEPS[step].key === "sign";
  const canGoNext = step < STEPS.length - 1;
  const canGoBack = step > 0;

  const buildDocumentText = useCallback(() => {
    const f = form;
    const sig = `Typed signature: ${f.typedSignature}`;
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
${sig}
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
      const response = await fetch("/api/submit-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docTitle,
          docText,
          signerEmail: form.signerEmail,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);

      // Save a permanent local record regardless of Drive outcome
      if (storageAvailable) {
        try {
          window.localStorage.setItem(
            `submission:${Date.now()}`,
            JSON.stringify({ form, submittedAt: new Date().toISOString(), driveLink: data.link })
          );
          window.localStorage.removeItem("draft:rental-application");
        } catch (e) {
          // non-critical — the Drive submission already succeeded
        }
      }

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
    const blob = new Blob([buildDocumentText()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Rental_Application_${(form.fullName || "applicant").replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const startOver = () => {
    setForm(emptyForm);
    setSubmitState("idle");
    setStep(0);
    if (storageAvailable) {
      try {
        window.localStorage.removeItem("draft:rental-application");
      } catch (e) { /* ignore */ }
    }
  };

  const canSubmit =
    form.fullName &&
    form.signerEmail &&
    form.agreeToSign &&
    form.typedSignature.trim().length > 1;

  // ---------- Success screen ----------
  if (submitState === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: PALEGREY }}>
        <div className="max-w-md w-full bg-white rounded-xl border p-8 text-center" style={{ borderColor: LIGHTGREY }}>
          <CheckCircle2 size={44} style={{ color: CHARCOAL }} className="mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2" style={{ color: CHARCOAL }}>Application submitted</h1>
          <p className="text-[14px] mb-4" style={{ color: SLATE }}>{resultMessage}</p>
          {resultLink && (
            <a
              href={resultLink} target="_blank" rel="noreferrer"
              className="inline-block mb-4 text-[14px] font-semibold underline"
              style={{ color: CHARCOAL }}
            >
              View document in Google Drive
            </a>
          )}
          <p className="text-[13px] mb-6" style={{ color: MIDGREY }}>
            A copy has been sent to {form.signerEmail} and {ORG_EMAIL}.
          </p>
          <div className="flex flex-col gap-2">
            <button onClick={downloadCopy} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-[14px] font-semibold border" style={{ borderColor: LIGHTGREY, color: CHARCOAL }}>
              <Download size={16} /> Download a copy
            </button>
            <button onClick={startOver} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-[14px] font-semibold text-white" style={{ backgroundColor: CHARCOAL }}>
              <RotateCcw size={16} /> Start a new application
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: PALEGREY }}>
      {/* Header */}
      <div className="bg-white border-b" style={{ borderColor: LIGHTGREY }}>
        <div className="max-w-2xl mx-auto px-5 py-5">
          <p className="text-[12px] font-bold tracking-[0.15em] mb-1" style={{ color: MIDGREY }}>IJAM HOUSING</p>
          <h1 className="text-2xl font-bold" style={{ color: CHARCOAL }}>Rental Application</h1>
          {restoredNotice && (
            <p className="text-[12px] mt-1" style={{ color: MIDGREY }}>Your previous progress was restored.</p>
          )}
        </div>
        {/* Progress */}
        <div className="max-w-2xl mx-auto px-5 pb-4 flex gap-1">
          {STEPS.map((s, i) => (
            <div key={s.key} className="h-1 flex-1 rounded-full" style={{ backgroundColor: i <= step ? CHARCOAL : LIGHTGREY }} />
          ))}
        </div>
      </div>

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
                <Field label="Property Address" span={2} required>
                  <TextInput value={form.propertyAddress} onChange={set("propertyAddress")} placeholder="123 Main St, Nashville, TN" />
                </Field>
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
                <Field label="Full Legal Name" span={2} required>
                  <TextInput value={form.fullName} onChange={set("fullName")} />
                </Field>
                <Field label="Date of Birth"><TextInput type="date" value={form.dob} onChange={set("dob")} /></Field>
                <Field label="Social Security No."><TextInput value={form.ssn} onChange={set("ssn")} placeholder="XXX-XX-XXXX" /></Field>
                <Field label="Phone" required><TextInput type="tel" value={form.phone} onChange={set("phone")} /></Field>
                <Field label="Email" required><TextInput type="email" value={form.email} onChange={set("email")} /></Field>
                <Field label="Driver's License / State ID No."><TextInput value={form.dlNumber} onChange={set("dlNumber")} /></Field>
                <Field label="State Issued"><TextInput value={form.dlState} onChange={set("dlState")} placeholder="TN" /></Field>
                <Field label="Co-Applicant Name (if any)" span={2}><TextInput value={form.coApplicantName} onChange={set("coApplicantName")} /></Field>
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
                  <YesNo value={form.evicted} onChange={(v) => setForm((f) => ({ ...f, evicted: v }))} />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[14px]" style={{ color: INK }}>Ever filed for bankruptcy?</span>
                  <YesNo value={form.bankruptcy} onChange={(v) => setForm((f) => ({ ...f, bankruptcy: v }))} />
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[14px]" style={{ color: INK }}>Ever convicted of a felony?</span>
                  <YesNo value={form.felony} onChange={(v) => setForm((f) => ({ ...f, felony: v }))} />
                </div>
                <Field label="If yes to any of the above, please explain">
                  <TextArea value={form.explanation} onChange={set("explanation")} />
                </Field>
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
              <div className="mb-6 p-4 rounded-md text-[13px] leading-relaxed" style={{ backgroundColor: PALEGREY, color: SLATE }}>
                <span className="font-bold italic" style={{ color: SLATE }}>In plain terms: </span>
                <span className="italic">Signing below confirms everything you entered is true and complete, and that you agree to a background and credit check.</span>
              </div>

              <Field label="Email to send your signed copy to" required>
                <TextInput type="email" value={form.signerEmail} onChange={set("signerEmail")} placeholder="you@email.com" />
              </Field>

              <div className="mt-5 mb-1 flex items-center gap-1.5">
                <Type size={14} color={SLATE} />
                <span className="text-[13px] font-semibold" style={{ color: SLATE }}>Your signature</span>
              </div>
              <Field label="Type your full legal name as your signature" required>
                <input
                  value={form.typedSignature}
                  onChange={set("typedSignature")}
                  placeholder="Your full name"
                  className="w-full rounded-md border px-3 py-3 text-2xl outline-none"
                  style={{ fontFamily: "'Brush Script MT', cursive", borderColor: LIGHTGREY, color: INK }}
                />
              </Field>

              <div className="mt-4">
                <Field label="Date">
                  <TextInput type="date" value={form.signatureDate || todayStr()} onChange={set("signatureDate")} />
                </Field>
              </div>

              <label className="flex items-start gap-3 mt-5 p-4 rounded-md" style={{ backgroundColor: PALEGREY }}>
                <input type="checkbox" checked={form.agreeToSign} onChange={set("agreeToSign")} className="mt-1 w-4 h-4" />
                <span className="text-[14px]" style={{ color: INK }}>
                  I agree this counts as my electronic signature, and that everything in this application is true and complete to the best of my knowledge.
                </span>
              </label>

              {submitState === "error" && (
                <div className="mt-5 p-4 rounded-md flex gap-3" style={{ backgroundColor: "#F5F0EE" }}>
                  <AlertTriangle size={18} style={{ color: SLATE, flexShrink: 0 }} />
                  <div>
                    <p className="text-[13px]" style={{ color: INK }}>{resultMessage}</p>
                    <button onClick={downloadCopy} className="text-[13px] font-semibold underline mt-2" style={{ color: CHARCOAL }}>
                      Download a copy now
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!canSubmit || submitState === "sending"}
                className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-md text-[15px] font-bold text-white transition-opacity"
                style={{ backgroundColor: CHARCOAL, opacity: !canSubmit ? 0.4 : 1 }}
              >
                {submitState === "sending" ? (
                  <><Loader2 size={18} className="animate-spin" /> Sending to Google Drive…</>
                ) : (
                  <><PenLine size={18} /> Sign & Submit Application</>
                )}
              </button>
            </>
          )}
        </div>

        {/* Nav buttons */}
        {!isSignStep && (
          <div className="flex justify-between mt-5">
            <button
              onClick={() => canGoBack && setStep((s) => s - 1)}
              disabled={!canGoBack}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-md text-[14px] font-semibold border"
              style={{ borderColor: LIGHTGREY, color: canGoBack ? CHARCOAL : LIGHTGREY }}
            >
              <ChevronLeft size={16} /> Back
            </button>
            <button
              onClick={() => canGoNext && setStep((s) => s + 1)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-md text-[14px] font-semibold text-white"
              style={{ backgroundColor: CHARCOAL }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
        {isSignStep && (
          <div className="flex justify-start mt-5">
            <button
              onClick={() => setStep((s) => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-md text-[14px] font-semibold border"
              style={{ borderColor: LIGHTGREY, color: CHARCOAL }}
            >
              <ChevronLeft size={16} /> Back
            </button>
          </div>
        )}

        <p className="text-center text-[12px] mt-6" style={{ color: MIDGREY }}>
          Your progress is saved automatically in this browser as you go.
        </p>
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
