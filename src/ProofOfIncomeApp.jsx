import React, { useState, useRef } from "react";
import { FileUp, X, Upload, Link2, Copy, Check, RotateCcw, AlertTriangle, File as FileIcon } from "lucide-react";
import { Field, TextInput, AppHeader, useDraftStorage, todayStr, INK, CHARCOAL, SLATE, MIDGREY, LIGHTGREY, PALEGREY, ORG_EMAIL } from "./formKit.jsx";

const QUERY_MAP = [
  ["tenant", "respondentName"],
  ["email", "respondentEmail"],
];

const MAX_FILE_BYTES = 6 * 1024 * 1024; // 6MB — comfortably under the request size limit

function compressImage(file, maxDim = 1800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          } else {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Could not read that image."));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

function sanitizeLabel(label, fallback) {
  return (label || fallback).replace(/[^\w\- ]+/g, "").trim() || fallback;
}

export default function ProofOfIncomeApp() {
  const [form, setForm] = useState({ respondentName: "", respondentEmail: "" });
  const [docs, setDocs] = useState([]); // { id, previewUrl, label, file, isImage }
  const [phase, setPhase] = useState("idle"); // idle | uploading | success | error
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [errorMessage, setErrorMessage] = useState("");
  const [resultLink, setResultLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  const draft = useDraftStorage("draft:proof-of-income-meta", form, setForm, QUERY_MAP);

  const setField = (key) => (e) => {
    const next = { ...form, [key]: e.target.value };
    setForm(next);
    draft.save(next);
  };

  const handleFiles = (fileList) => {
    const tooLarge = [];
    const accepted = Array.from(fileList).filter((f) => {
      if (f.size > MAX_FILE_BYTES) {
        tooLarge.push(f.name);
        return false;
      }
      return true;
    });
    if (tooLarge.length > 0) {
      setErrorMessage(`${tooLarge.join(", ")} ${tooLarge.length === 1 ? "is" : "are"} too large (6MB max per file).`);
    }
    const newDocs = accepted.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      isImage: file.type.startsWith("image/"),
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      label: "",
    }));
    setDocs((d) => [...d, ...newDocs]);
  };

  const removeDoc = (id) => setDocs((d) => d.filter((doc) => doc.id !== id));
  const setLabel = (id, label) => setDocs((d) => d.map((doc) => (doc.id === id ? { ...doc, label } : doc)));

  const canSubmit = form.respondentName.trim() && docs.length > 0 && phase !== "uploading";

  const handleSubmit = async () => {
    setPhase("uploading");
    setErrorMessage("");
    setProgress({ done: 0, total: docs.length });

    try {
      const folderRes = await fetch("/api/create-photo-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          respondentName: form.respondentName,
          signerEmail: form.respondentEmail,
          docType: "Proof of Income",
        }),
      });
      const folderData = await folderRes.json();
      if (!folderRes.ok) throw new Error(folderData.error || "Could not create the upload folder.");

      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        const isPdf = doc.file.type === "application/pdf";
        const dataUrl = doc.isImage ? await compressImage(doc.file) : await readAsDataUrl(doc.file);
        const safeLabel = sanitizeLabel(doc.label, `document-${i + 1}`);
        const ext = isPdf ? "pdf" : doc.isImage ? "jpg" : (doc.file.name.split(".").pop() || "file");
        const fileName = `${safeLabel} - ${todayStr()} (${Date.now()}-${i}).${ext}`;
        const mimeType = isPdf ? "application/pdf" : doc.isImage ? "image/jpeg" : (doc.file.type || "application/octet-stream");

        const uploadRes = await fetch("/api/upload-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId: folderData.folderId, fileName, imageBase64: dataUrl, mimeType }),
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || `Could not upload ${safeLabel}.`);

        setProgress({ done: i + 1, total: docs.length });
      }

      draft.clear();
      setResultLink(folderData.link);
      setPhase("success");
    } catch (err) {
      setErrorMessage(err.message || "Something went wrong uploading these documents.");
      setPhase("error");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(resultLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) { /* clipboard unavailable */ }
  };

  const startOver = () => {
    setDocs([]);
    setPhase("idle");
    setProgress({ done: 0, total: 0 });
    setResultLink(null);
  };

  if (phase === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: PALEGREY }}>
        <div className="max-w-md w-full bg-white rounded-xl border p-8 text-center" style={{ borderColor: LIGHTGREY }}>
          <Check size={44} style={{ color: CHARCOAL }} className="mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2" style={{ color: CHARCOAL }}>Documents uploaded</h1>
          <p className="text-[14px] mb-5" style={{ color: SLATE }}>
            {docs.length} document{docs.length === 1 ? "" : "s"} uploaded and shared with {ORG_EMAIL}.
          </p>
          <p className="text-[12px] mb-5" style={{ color: MIDGREY }}>
            This folder is private and only accessible to staff — not a public link, since it may contain sensitive financial information.
            Forgot something? Come back to this same page anytime and upload more using the same name — they'll be added to this same folder.
          </p>
          <div className="flex flex-col gap-2">
            <button onClick={startOver} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-[14px] font-semibold text-white" style={{ backgroundColor: CHARCOAL }}>
              <RotateCcw size={16} /> Upload More Documents
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: PALEGREY }}>
      <AppHeader eyebrow="IJAM HOUSING" title="Proof of Income" step={0} totalSteps={1} noticeText={draft.noticeText} />

      <div className="max-w-2xl mx-auto px-5 py-6">
        <p className="text-[14px] mb-6" style={{ color: SLATE }}>
          Upload pay stubs, an offer letter, benefit statements, or anything else that shows your income. PDFs and photos both work — you can label each one.
        </p>

        <div className="bg-white rounded-xl border p-5 sm:p-6 mb-5" style={{ borderColor: LIGHTGREY }}>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Your Name" required>
              <TextInput value={form.respondentName} onChange={setField("respondentName")} />
            </Field>
            <Field label="Your Email (optional)">
              <TextInput type="email" value={form.respondentEmail} onChange={setField("respondentEmail")} placeholder="you@email.com" />
            </Field>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-5 sm:p-6" style={{ borderColor: LIGHTGREY }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-md text-[15px] font-bold border-2 border-dashed mb-5"
            style={{ borderColor: LIGHTGREY, color: SLATE }}
          >
            <FileUp size={20} /> Add PDFs or Photos
          </button>

          {docs.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
              {docs.map((doc) => (
                <div key={doc.id} className="relative rounded-lg overflow-hidden border" style={{ borderColor: LIGHTGREY }}>
                  {doc.isImage ? (
                    <img src={doc.previewUrl} alt="" className="w-full h-28 object-cover" />
                  ) : (
                    <div className="w-full h-28 flex flex-col items-center justify-center gap-1" style={{ backgroundColor: PALEGREY }}>
                      <FileIcon size={26} color={MIDGREY} />
                      <span className="text-[10px] px-2 text-center truncate w-full" style={{ color: MIDGREY }}>{doc.file.name}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeDoc(doc.id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: "rgba(43,43,43,0.8)" }}
                  >
                    <X size={14} />
                  </button>
                  <input
                    value={doc.label}
                    onChange={(e) => setLabel(doc.id, e.target.value)}
                    placeholder="Label (e.g. May pay stub)"
                    className="w-full text-[12px] px-2 py-1.5 outline-none border-t"
                    style={{ borderColor: LIGHTGREY, color: INK }}
                  />
                </div>
              ))}
            </div>
          )}

          {docs.length === 0 && (
            <p className="text-center text-[13px]" style={{ color: MIDGREY }}>No documents added yet.</p>
          )}
        </div>

        {(phase === "error" || errorMessage) && (
          <div className="mt-5 p-4 rounded-md flex gap-3" style={{ backgroundColor: "#F5F0EE" }}>
            <AlertTriangle size={18} style={{ color: SLATE, flexShrink: 0 }} />
            <p className="text-[13px]" style={{ color: INK }}>{errorMessage}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-md text-[15px] font-bold text-white transition-opacity"
          style={{ backgroundColor: CHARCOAL, opacity: !canSubmit ? 0.4 : 1 }}
        >
          {phase === "uploading" ? (
            <>Uploading {progress.done} of {progress.total}…</>
          ) : (
            <><Upload size={18} /> Upload {docs.length > 0 ? `${docs.length} Document${docs.length === 1 ? "" : "s"}` : "Documents"}</>
          )}
        </button>

        <p className="text-center text-[12px] mt-6" style={{ color: MIDGREY }}>
          Uploaded straight to a private, staff-only folder — nothing is stored in this browser, and this isn't a public link like the Item Photos folder.
        </p>
      </div>
    </div>
  );
}
