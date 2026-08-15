import React, { useState, useRef } from "react";
import { Camera, X, Upload, Link2, Copy, Check, RotateCcw, AlertTriangle } from "lucide-react";
import { Field, TextInput, AppHeader, useDraftStorage, todayStr, INK, CHARCOAL, SLATE, MIDGREY, LIGHTGREY, PALEGREY, ORG_EMAIL } from "./formKit.jsx";

const QUERY_MAP = [
  ["tenant", "respondentName"],
  ["email", "respondentEmail"],
];

function compressImage(file, maxDim = 1600, quality = 0.75) {
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

export default function PhotoUploadApp() {
  const [form, setForm] = useState({ respondentName: "", respondentEmail: "" });
  const [photos, setPhotos] = useState([]); // { id, previewUrl, label, file }
  const [phase, setPhase] = useState("idle"); // idle | uploading | success | error
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [errorMessage, setErrorMessage] = useState("");
  const [resultLink, setResultLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  const draft = useDraftStorage("draft:item-photos-meta", form, setForm, QUERY_MAP);

  const setField = (key) => (e) => {
    const next = { ...form, [key]: e.target.value };
    setForm(next);
    draft.save(next);
  };

  const handleFiles = (fileList) => {
    const newPhotos = Array.from(fileList).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      label: "",
    }));
    setPhotos((p) => [...p, ...newPhotos]);
  };

  const removePhoto = (id) => setPhotos((p) => p.filter((ph) => ph.id !== id));
  const setLabel = (id, label) => setPhotos((p) => p.map((ph) => (ph.id === id ? { ...ph, label } : ph)));

  const canSubmit = form.respondentName.trim() && photos.length > 0 && phase !== "uploading";

  const handleSubmit = async () => {
    setPhase("uploading");
    setErrorMessage("");
    setProgress({ done: 0, total: photos.length });

    try {
      const folderTitle = `Item Photos - ${form.respondentName} - ${todayStr()}`;
      const folderRes = await fetch("/api/create-photo-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderTitle, signerEmail: form.respondentEmail }),
      });
      const folderData = await folderRes.json();
      if (!folderRes.ok) throw new Error(folderData.error || "Could not create the photo folder.");

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const compressed = await compressImage(photo.file);
        const safeLabel = (photo.label || `photo-${i + 1}`).replace(/[^\w\- ]+/g, "").trim() || `photo-${i + 1}`;
        const fileName = `${safeLabel}.jpg`;

        const uploadRes = await fetch("/api/upload-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId: folderData.folderId, fileName, imageBase64: compressed }),
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error || `Could not upload photo ${i + 1}.`);

        setProgress({ done: i + 1, total: photos.length });
      }

      draft.clear();
      setResultLink(folderData.link);
      setPhase("success");
    } catch (err) {
      setErrorMessage(err.message || "Something went wrong uploading these photos.");
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
    setPhotos([]);
    setPhase("idle");
    setProgress({ done: 0, total: 0 });
    setResultLink(null);
  };

  if (phase === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: PALEGREY }}>
        <div className="max-w-md w-full bg-white rounded-xl border p-8 text-center" style={{ borderColor: LIGHTGREY }}>
          <Check size={44} style={{ color: CHARCOAL }} className="mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2" style={{ color: CHARCOAL }}>Photos uploaded</h1>
          <p className="text-[14px] mb-5" style={{ color: SLATE }}>
            {photos.length} photo{photos.length === 1 ? "" : "s"} uploaded and shared with {ORG_EMAIL}.
          </p>
          <div className="text-[13px] font-mono p-3 rounded-md mb-3 break-all text-left" style={{ backgroundColor: PALEGREY, color: CHARCOAL, border: `1px solid ${LIGHTGREY}` }}>
            {resultLink}
          </div>
          <p className="text-[12px] mb-5" style={{ color: MIDGREY }}>
            This link is viewable by anyone who has it — no Google account needed. Safe to forward to anyone who needs to see the photos.
          </p>
          <div className="flex flex-col gap-2">
            <button onClick={copyLink} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-[14px] font-semibold text-white" style={{ backgroundColor: CHARCOAL }}>
              {copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy Viewing Link</>}
            </button>
            <a href={resultLink} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-[14px] font-semibold border" style={{ borderColor: LIGHTGREY, color: CHARCOAL }}>
              <Link2 size={16} /> Open Viewing Link
            </a>
            <button onClick={startOver} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-[14px] font-semibold border" style={{ borderColor: LIGHTGREY, color: CHARCOAL }}>
              <RotateCcw size={16} /> Upload More Photos
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: PALEGREY }}>
      <AppHeader eyebrow="IJAM HOUSING" title="Item Photos" step={0} totalSteps={1} noticeText={draft.noticeText} />

      <div className="max-w-2xl mx-auto px-5 py-6">
        <p className="text-[14px] mb-6" style={{ color: SLATE }}>
          Take or upload photos of your furniture and larger items so we know what they look like. You can label each one — that helps us match them up later.
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
            accept="image/*"
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
            <Camera size={20} /> Take or Choose Photos
          </button>

          {photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
              {photos.map((photo) => (
                <div key={photo.id} className="relative rounded-lg overflow-hidden border" style={{ borderColor: LIGHTGREY }}>
                  <img src={photo.previewUrl} alt="" className="w-full h-28 object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: "rgba(43,43,43,0.8)" }}
                  >
                    <X size={14} />
                  </button>
                  <input
                    value={photo.label}
                    onChange={(e) => setLabel(photo.id, e.target.value)}
                    placeholder="Label (e.g. Couch)"
                    className="w-full text-[12px] px-2 py-1.5 outline-none border-t"
                    style={{ borderColor: LIGHTGREY, color: INK }}
                  />
                </div>
              ))}
            </div>
          )}

          {photos.length === 0 && (
            <p className="text-center text-[13px]" style={{ color: MIDGREY }}>No photos added yet.</p>
          )}
        </div>

        {phase === "error" && (
          <div className="mt-5 p-4 rounded-md flex gap-3" style={{ backgroundColor: "#F5F0EE" }}>
            <AlertTriangle size={18} style={{ color: SLATE, flexShrink: 0 }} />
            <p className="text-[13px]" style={{ color: INK }}>{errorMessage} Your photos are still selected below — just try submitting again.</p>
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
            <><Upload size={18} /> Upload {photos.length > 0 ? `${photos.length} Photo${photos.length === 1 ? "" : "s"}` : "Photos"}</>
          )}
        </button>

        <p className="text-center text-[12px] mt-6" style={{ color: MIDGREY }}>Photos are uploaded straight to a shared folder — nothing is stored in this browser.</p>
      </div>
    </div>
  );
}
