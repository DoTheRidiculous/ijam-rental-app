import React, { useState, useEffect, useRef } from "react";
import { jsPDF } from "jspdf";
import { Loader2, AlertTriangle, CheckCircle2, Download, RotateCcw, ChevronLeft, ChevronRight, Type, PenLine } from "lucide-react";

// ---------- Design tokens (matches the IJAM Housing document series) ----------
export const INK = "#1A1A1A";
export const CHARCOAL = "#2B2B2B";
export const SLATE = "#595959";
export const MIDGREY = "#8C8C8C";
export const LIGHTGREY = "#D9D9D9";
export const PALEGREY = "#F2F2F2";
export const ORG_EMAIL = "admin@dotheridiculous.co";

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ---------- Small UI atoms ----------
export function Field({ label, children, span = 1, required = false }) {
  return (
    <div style={{ gridColumn: span === 2 ? "span 2" : "span 1" }} className="flex flex-col gap-1.5">
      <label className="text-[13px] font-semibold tracking-wide" style={{ color: SLATE }}>
        {label}
        {required && <span style={{ color: MIDGREY }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass = "w-full rounded-md border px-3 py-2.5 text-[15px] outline-none transition-colors";
const inputStyle = { borderColor: LIGHTGREY, color: INK, backgroundColor: "#FFFFFF" };

export function TextInput(props) {
  return (
    <input
      {...props}
      className={inputClass}
      style={{
        ...inputStyle,
        color: props.disabled ? MIDGREY : INK,
        backgroundColor: props.disabled ? PALEGREY : "#FFFFFF",
      }}
      onFocus={(e) => !props.disabled && (e.target.style.borderColor = CHARCOAL)}
      onBlur={(e) => (e.target.style.borderColor = LIGHTGREY)}
    />
  );
}

export function TextArea(props) {
  return (
    <textarea
      {...props}
      rows={props.rows || 3}
      className={inputClass + " resize-none"}
      style={{
        ...inputStyle,
        color: props.disabled ? MIDGREY : INK,
        backgroundColor: props.disabled ? PALEGREY : "#FFFFFF",
      }}
      onFocus={(e) => !props.disabled && (e.target.style.borderColor = CHARCOAL)}
      onBlur={(e) => (e.target.style.borderColor = LIGHTGREY)}
    />
  );
}

export function YesNo({ value, onChange }) {
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

export function SectionHeading({ num, title }) {
  return (
    <div className="mb-5 pb-2" style={{ borderBottom: `1px solid ${LIGHTGREY}` }}>
      <span className="text-[13px] font-bold mr-2" style={{ color: MIDGREY }}>{num}</span>
      <span className="text-[15px] font-bold tracking-wide" style={{ color: CHARCOAL }}>{title.toUpperCase()}</span>
    </div>
  );
}

export function MultiSelect({ options, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            type="button"
            key={opt}
            onClick={() => onToggle(opt)}
            className="px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors"
            style={
              active
                ? { backgroundColor: CHARCOAL, color: "#fff", borderColor: CHARCOAL }
                : { backgroundColor: "#fff", color: SLATE, borderColor: LIGHTGREY }
            }
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function Callout({ children }) {
  return (
    <div className="mb-6 p-4 rounded-md text-[13px] leading-relaxed" style={{ backgroundColor: PALEGREY, color: SLATE }}>
      <span className="font-bold italic" style={{ color: SLATE }}>In plain terms: </span>
      <span className="italic">{children}</span>
    </div>
  );
}

// ---------- Error boundary ----------
export class ErrorBoundary extends React.Component {
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

// ---------- Draft autosave (localStorage) + link prefill ----------
// queryFieldMap: array of [queryParamKey, formFieldKey] pairs. A query key can
// map to more than one form field (e.g. ?email= filling both a contact email
// and the signer email).
export function useKnownNames() {
  const [names, setNames] = useState([]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/list-known-names")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data && Array.isArray(data.names)) setNames(data.names);
      })
      .catch(() => { /* autocomplete is a nice-to-have — fail silently */ });
    return () => { cancelled = true; };
  }, []);
  return names;
}

export function useDraftStorage(storageKey, emptyForm, setForm, queryFieldMap) {
  const [restoredNotice, setRestoredNotice] = useState(false);
  const [prefilledNotice, setPrefilledNotice] = useState(false);
  const storageAvailable = typeof window !== "undefined" && !!window.localStorage;

  useEffect(() => {
    // 1. A prefilled link takes priority over any old draft in this browser.
    if (queryFieldMap && queryFieldMap.length && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const seed = {};
      let matched = false;
      queryFieldMap.forEach(([queryKey, formKey]) => {
        const v = params.get(queryKey);
        if (v) {
          seed[formKey] = typeof emptyForm[formKey] === "boolean" ? v === "true" : v;
          matched = true;
        }
      });
      if (matched) {
        setForm((f) => ({ ...f, ...seed }));
        setPrefilledNotice(true);
        return;
      }
    }
    // 2. Otherwise, restore any saved draft for this browser/device.
    if (!storageAvailable) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        setForm({ ...emptyForm, ...JSON.parse(raw) });
        setRestoredNotice(true);
      }
    } catch (e) { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = (form) => {
    if (!storageAvailable) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(form));
    } catch (e) { /* ignore */ }
  };

  const clear = () => {
    if (!storageAvailable) return;
    try {
      window.localStorage.removeItem(storageKey);
    } catch (e) { /* ignore */ }
  };

  const noticeText = prefilledNotice
    ? "Some details were pre-filled for you — double check them before submitting."
    : restoredNotice
    ? "Your previous progress was restored."
    : null;

  return { restoredNotice, prefilledNotice, noticeText, save, clear, storageAvailable };
}

// ---------- PDF export ----------
export function downloadDocumentPdf({ title, subtitle, docText, fileName }) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const marginL = 56;
  const marginR = 56;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginL - marginR;
  let y = 64;

  const CHARCOAL_RGB = [43, 43, 43];
  const SLATE_RGB = [89, 89, 89];
  const INK_RGB = [26, 26, 26];
  const LIGHTGREY_RGB = [217, 217, 217];

  const ensureSpace = (needed) => {
    if (y + needed > pageHeight - 56) {
      doc.addPage();
      y = 64;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...CHARCOAL_RGB);
  doc.text(title, marginL, y);
  y += 18;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(...SLATE_RGB);
  doc.text(subtitle, marginL, y);
  y += 10;
  doc.setDrawColor(...CHARCOAL_RGB);
  doc.setLineWidth(1.4);
  doc.line(marginL, y, pageWidth - marginR, y);
  y += 22;

  const lines = docText.split("\n");
  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();
    const isSectionHeader = /^\d+\.\s[A-Z0-9&\-/ ]+$/.test(line);
    const isBlank = line.trim().length === 0;

    if (isBlank) {
      y += 8;
      return;
    }

    if (isSectionHeader) {
      ensureSpace(26);
      y += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(...CHARCOAL_RGB);
      doc.text(line, marginL, y);
      y += 4;
      doc.setDrawColor(...LIGHTGREY_RGB);
      doc.setLineWidth(0.75);
      doc.line(marginL, y + 4, pageWidth - marginR, y + 4);
      y += 16;
      return;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK_RGB);
    const wrapped = doc.splitTextToSize(line, contentWidth);
    wrapped.forEach((wLine) => {
      ensureSpace(14);
      doc.text(wLine, marginL, y);
      y += 14;
    });
  });

  doc.save(fileName);
}

// ---------- Drive submission ----------
export async function submitToDrive({ docTitle, docText, signerEmail, shareMessage, endpoint = "/api/submit-application" }) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ docTitle, docText, signerEmail, shareMessage }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

// ---------- Layout shell ----------
export function AppHeader({ eyebrow, title, step, totalSteps, noticeText }) {
  return (
    <div className="bg-white border-b" style={{ borderColor: LIGHTGREY }}>
      <div className="max-w-2xl mx-auto px-5 py-5">
        <p className="text-[12px] font-bold tracking-[0.15em] mb-1" style={{ color: MIDGREY }}>{eyebrow}</p>
        <h1 className="text-2xl font-bold" style={{ color: CHARCOAL }}>{title}</h1>
        {noticeText && <p className="text-[12px] mt-1" style={{ color: MIDGREY }}>{noticeText}</p>}
      </div>
      <div className="max-w-2xl mx-auto px-5 pb-4 flex gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className="h-1 flex-1 rounded-full" style={{ backgroundColor: i <= step ? CHARCOAL : LIGHTGREY }} />
        ))}
      </div>
    </div>
  );
}

export function NavButtons({ canGoBack, onBack, onNext, isLastStep }) {
  if (isLastStep) {
    return (
      <div className="flex justify-start mt-5">
        <button onClick={onBack} className="flex items-center gap-1.5 px-4 py-2.5 rounded-md text-[14px] font-semibold border" style={{ borderColor: LIGHTGREY, color: CHARCOAL }}>
          <ChevronLeft size={16} /> Back
        </button>
      </div>
    );
  }
  return (
    <div className="flex justify-between mt-5">
      <button
        onClick={onBack}
        disabled={!canGoBack}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-md text-[14px] font-semibold border"
        style={{ borderColor: LIGHTGREY, color: canGoBack ? CHARCOAL : LIGHTGREY }}
      >
        <ChevronLeft size={16} /> Back
      </button>
      <button onClick={onNext} className="flex items-center gap-1.5 px-5 py-2.5 rounded-md text-[14px] font-semibold text-white" style={{ backgroundColor: CHARCOAL }}>
        Next <ChevronRight size={16} />
      </button>
    </div>
  );
}

export function SuccessScreen({ resultMessage, resultLink, signerEmail, onDownload, onStartOver }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: PALEGREY }}>
      <div className="max-w-md w-full bg-white rounded-xl border p-8 text-center" style={{ borderColor: LIGHTGREY }}>
        <CheckCircle2 size={44} style={{ color: CHARCOAL }} className="mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2" style={{ color: CHARCOAL }}>Submitted</h1>
        <p className="text-[14px] mb-4" style={{ color: SLATE }}>{resultMessage}</p>
        {resultLink && (
          <a href={resultLink} target="_blank" rel="noreferrer" className="inline-block mb-4 text-[14px] font-semibold underline" style={{ color: CHARCOAL }}>
            View document in Google Drive
          </a>
        )}
        <p className="text-[13px] mb-6" style={{ color: MIDGREY }}>
          A copy has been sent to {signerEmail} and {ORG_EMAIL}.
        </p>
        <div className="flex flex-col gap-2">
          <button onClick={onDownload} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-[14px] font-semibold border" style={{ borderColor: LIGHTGREY, color: CHARCOAL }}>
            <Download size={16} /> Download a PDF copy
          </button>
          <button onClick={onStartOver} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-[14px] font-semibold text-white" style={{ backgroundColor: CHARCOAL }}>
            <RotateCcw size={16} /> Start a new submission
          </button>
        </div>
      </div>
    </div>
  );
}

export function SignatureField({ value, onChange, disabled = false }) {
  return (
    <Field label="Type your full legal name as your signature" required>
      <input
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder="Your full name"
        className="w-full rounded-md border px-3 py-3 text-2xl outline-none"
        style={{
          fontFamily: "'Brush Script MT', cursive",
          borderColor: LIGHTGREY,
          color: disabled ? MIDGREY : INK,
          backgroundColor: disabled ? PALEGREY : "#fff",
        }}
      />
    </Field>
  );
}

export function SubmitErrorBox({ message, onDownload }) {
  return (
    <div className="mt-5 p-4 rounded-md flex gap-3" style={{ backgroundColor: "#F5F0EE" }}>
      <AlertTriangle size={18} style={{ color: SLATE, flexShrink: 0 }} />
      <div>
        <p className="text-[13px]" style={{ color: INK }}>{message}</p>
        <button onClick={onDownload} className="text-[13px] font-semibold underline mt-2" style={{ color: CHARCOAL }}>
          Download a copy now
        </button>
      </div>
    </div>
  );
}

export function SubmitButton({ canSubmit, submitState, onClick, label = "Sign & Submit" }) {
  return (
    <button
      onClick={onClick}
      disabled={!canSubmit || submitState === "sending"}
      className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-md text-[15px] font-bold text-white transition-opacity"
      style={{ backgroundColor: CHARCOAL, opacity: !canSubmit ? 0.4 : 1 }}
    >
      {submitState === "sending" ? (
        <>
          <Loader2 size={18} className="animate-spin" /> Sending to Google Drive…
        </>
      ) : (
        <>
          <PenLine size={18} /> {label}
        </>
      )}
    </button>
  );
}
