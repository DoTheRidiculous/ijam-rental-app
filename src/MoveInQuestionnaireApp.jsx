import React, { useState, useCallback } from "react";
import { CalendarDays, BedDouble, Sofa, Refrigerator, Boxes, ClipboardList, Warehouse, ClipboardCheck } from "lucide-react";
import {
  ErrorBoundary, Field, TextInput, TextArea, YesNo, MultiSelect, SectionHeading, Callout,
  AppHeader, NavButtons, SuccessScreen, SubmitErrorBox, SubmitButton,
  useDraftStorage, downloadDocumentPdf, submitToDrive,
  INK, CHARCOAL, SLATE, MIDGREY, LIGHTGREY, PALEGREY, ORG_EMAIL,
} from "./formKit.jsx";

const STEPS = [
  { key: "timing", label: "Move-In Timing", icon: CalendarDays },
  { key: "bedroom", label: "Bedroom Furniture", icon: BedDouble },
  { key: "living", label: "Living Room Furniture", icon: Sofa },
  { key: "appliances", label: "Appliances", icon: Refrigerator },
  { key: "otherItems", label: "Other Large Items", icon: Boxes },
  { key: "sorting", label: "Sorting Your Items", icon: ClipboardList },
  { key: "beds", label: "Beds & Bedroom Setup", icon: BedDouble },
  { key: "storage", label: "Storage Planning", icon: Warehouse },
  { key: "review", label: "Review & Submit", icon: ClipboardCheck },
];

const BEDROOM_OPTIONS = [
  "Twin bed", "Full bed", "Queen bed", "King bed", "Mattress", "Box spring", "Bed frame",
  "Headboard", "Dresser", "Chest of drawers", "Nightstand(s)", "Desk", "Desk chair",
  "Vanity", "Shelving/bookcase", "Bedroom TV",
];

const LIVING_OPTIONS = [
  "Couch", "Sectional", "Loveseat", "Recliner", "Accent chairs", "Coffee table", "End tables",
  "TV", "TV stand / entertainment center", "Bookshelves", "Dining table", "Dining chairs",
];

const APPLIANCE_OPTIONS = ["Washer", "Dryer", "Refrigerator", "Freezer", "Microwave", "Air fryer", "Coffee maker"];

const OTHER_ITEM_OPTIONS = [
  "Large storage bins/totes", "Multiple boxes of belongings", "Exercise equipment", "Large mirrors",
  "Rugs", "Patio/outdoor furniture", "Bikes", "Tools", "Holiday decorations", "Large artwork",
  "Children's furniture/items", "Extra household supplies",
];

const emptyForm = {
  startMoveDate: "", fullyMovedInDate: "", movePreference: "", unavailableDates: "", needsMovingHelp: "",
  bedroomFurniture: [], bedroomFurnitureOther: "",
  livingRoomFurniture: [], livingRoomFurnitureOther: "",
  appliances: [], appliancesOther: "", washerDryerPlan: "",
  otherLargeItems: [], otherLargeItemsOther: "",
  bringingToApartment: "", mayBring: "", probablyStorage: "", sellDonateRelocate: "",
  numBeds: "", bedSizes: "", preferredBed: "", comfortableStoringBed: "", bedroomItemsToKeep: "",
  hasStorageUnit: "", storageUnitSize: "", storageUnitFullness: "", okArrangingStorage: "",
  itemsRequiringStorage: "", itemsRequiringClimateControl: "",
  respondentName: "", respondentEmail: "", confirmAccurate: false,
};

const QUERY_MAP = [
  ["tenant", "respondentName"],
  ["email", "respondentEmail"],
];

function toggleInArray(arr, value) {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function MoveInQuestionnaireForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [submitState, setSubmitState] = useState("idle");
  const [resultMessage, setResultMessage] = useState("");
  const [resultLink, setResultLink] = useState(null);

  const draft = useDraftStorage("draft:move-in-questionnaire", emptyForm, setForm, QUERY_MAP);

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

  const toggleMulti = (key) => (opt) =>
    setForm((f) => {
      const next = { ...f, [key]: toggleInArray(f[key], opt) };
      draft.save(next);
      return next;
    });

  const isLastStep = STEPS[step].key === "review";
  const canGoNext = step < STEPS.length - 1;
  const canGoBack = step > 0;

  const list = (items) => (items && items.length ? items.join(", ") : "None selected");

  const buildDocumentText = useCallback(() => {
    const f = form;
    return `MOVE-IN, FURNITURE & STORAGE QUESTIONNAIRE
Submitted: ${new Date().toLocaleString()}

1. MOVE-IN TIMING
Preferred start-moving date: ${f.startMoveDate}
Target fully moved-in date: ${f.fullyMovedInDate}
Move all at once or over several days: ${f.movePreference}
Dates unavailable to move: ${f.unavailableDates}
Needs help transporting/moving larger items: ${f.needsMovingHelp}

2. BEDROOM FURNITURE
Items owned: ${list(f.bedroomFurniture)}
Other bedroom furniture: ${f.bedroomFurnitureOther}

3. LIVING ROOM / COMMON AREA FURNITURE
Items owned: ${list(f.livingRoomFurniture)}
Other: ${f.livingRoomFurnitureOther}

4. APPLIANCES
Items owned: ${list(f.appliances)}
Other small appliances: ${f.appliancesOther}
Washer/dryer plan (the apartment already has a washer and dryer): ${f.washerDryerPlan}

5. OTHER LARGE ITEMS
Items owned: ${list(f.otherLargeItems)}
Other large items: ${f.otherLargeItemsOther}

6. ITEMS THAT MAY NEED STORAGE
Definitely bringing to the apartment: ${f.bringingToApartment}
May bring depending on what is already furnished: ${f.mayBring}
Probably needs to go into storage: ${f.probablyStorage}
May sell, donate, give away, or relocate: ${f.sellDonateRelocate}

7. BEDS & BEDROOM SETUP
Number of beds/mattresses owned: ${f.numBeds}
Sizes: ${f.bedSizes}
Preferred bed to use: ${f.preferredBed}
Comfortable storing current bed if one is already provided: ${f.comfortableStoringBed}
Bedroom items definitely want to keep/use: ${f.bedroomItemsToKeep}

8. STORAGE PLANNING
Currently has a storage unit: ${f.hasStorageUnit}
Storage unit size: ${f.storageUnitSize}
Approximately how full: ${f.storageUnitFullness}
OK with us arranging a storage unit if needed: ${f.okArrangingStorage}
Items requiring storage: ${f.itemsRequiringStorage}
Items requiring climate-controlled storage: ${f.itemsRequiringClimateControl}

9. RESPONDENT
Completed by: ${f.respondentName}
Email: ${f.respondentEmail}
Confirmed accurate as of submission date: ${f.confirmAccurate ? "Yes" : "No"}

This questionnaire is a planning tool, not a legal document. Once reviewed, we'll compare these items against what the apartment already provides to determine what to bring, what needs storage, whether a storage unit is needed and what size, and the best move-in timeline.
`;
  }, [form]);

  const handleSubmit = async () => {
    setSubmitState("sending");
    setResultMessage("");
    setResultLink(null);
    const docText = buildDocumentText();
    const docTitle = `Move-In Questionnaire - ${form.respondentName || "Respondent"}`;

    try {
      const data = await submitToDrive({
        docTitle, docText, signerEmail: form.respondentEmail, personName: form.respondentName,
        shareMessage: "Attached is the completed Move-In, Furniture & Storage Questionnaire.",
        endpoint: "/api/submit-questionnaire",
      });
      draft.clear();
      setResultMessage(
        data.updated
          ? `Your existing questionnaire was updated with these answers, and a copy was shared with ${form.respondentEmail} and ${ORG_EMAIL}.`
          : `This questionnaire was saved and shared with ${form.respondentEmail} and ${ORG_EMAIL}.`
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
      title: "MOVE-IN, FURNITURE & STORAGE QUESTIONNAIRE",
      subtitle: `Submitted: ${new Date().toLocaleString()}`,
      docText: buildDocumentText(),
      fileName: `Move_In_Questionnaire_${(form.respondentName || "respondent").replace(/\s+/g, "_")}.pdf`,
    });
  };

  const startOver = () => {
    setForm(emptyForm);
    setSubmitState("idle");
    setStep(0);
    draft.clear();
  };

  const canSubmit = form.respondentName && form.respondentEmail && form.confirmAccurate;

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
      <AppHeader eyebrow="IJAM HOUSING" title="Move-In & Storage Questionnaire" step={step} totalSteps={STEPS.length} noticeText={draft.noticeText} />

      <div className="max-w-2xl mx-auto px-5 py-6">
        <div className="flex items-center gap-2 mb-6">
          {React.createElement(STEPS[step].icon, { size: 18, color: SLATE })}
          <span className="text-[13px] font-bold tracking-wide" style={{ color: SLATE }}>
            STEP {step + 1} OF {STEPS.length} — {STEPS[step].label.toUpperCase()}
          </span>
        </div>

        <div className="bg-white rounded-xl border p-5 sm:p-6" style={{ borderColor: LIGHTGREY }}>
          {STEPS[step].key === "timing" && (
            <>
              <SectionHeading num="1" title="Move-In Timing" />
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Field label="Preferred start-moving date"><TextInput type="date" value={form.startMoveDate} onChange={set("startMoveDate")} /></Field>
                <Field label="Target fully moved-in date"><TextInput type="date" value={form.fullyMovedInDate} onChange={set("fullyMovedInDate")} /></Field>
              </div>
              <div className="flex flex-col gap-5">
                <Field label="Move everything at once, or over several days?">
                  <TextInput value={form.movePreference} onChange={set("movePreference")} placeholder="e.g. All at once" />
                </Field>
                <Field label="Any dates you're unavailable to move?">
                  <TextArea value={form.unavailableDates} onChange={set("unavailableDates")} rows={2} />
                </Field>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[14px]" style={{ color: INK }}>Will you need help transporting or moving larger items?</span>
                  <YesNo value={form.needsMovingHelp} onChange={setYesNo("needsMovingHelp")} />
                </div>
              </div>
            </>
          )}

          {STEPS[step].key === "bedroom" && (
            <>
              <SectionHeading num="2" title="Bedroom Furniture" />
              <p className="text-[14px] mb-4" style={{ color: INK }}>
                Tap everything you currently own, even if you're unsure whether you'll bring it.
              </p>
              <MultiSelect options={BEDROOM_OPTIONS} selected={form.bedroomFurniture} onToggle={toggleMulti("bedroomFurniture")} />
              <div className="mt-5">
                <Field label="Other bedroom furniture"><TextInput value={form.bedroomFurnitureOther} onChange={set("bedroomFurnitureOther")} /></Field>
              </div>
            </>
          )}

          {STEPS[step].key === "living" && (
            <>
              <SectionHeading num="3" title="Living Room / Common Area Furniture" />
              <MultiSelect options={LIVING_OPTIONS} selected={form.livingRoomFurniture} onToggle={toggleMulti("livingRoomFurniture")} />
              <div className="mt-5">
                <Field label="Other"><TextInput value={form.livingRoomFurnitureOther} onChange={set("livingRoomFurnitureOther")} /></Field>
              </div>
            </>
          )}

          {STEPS[step].key === "appliances" && (
            <>
              <SectionHeading num="4" title="Appliances" />
              <MultiSelect options={APPLIANCE_OPTIONS} selected={form.appliances} onToggle={toggleMulti("appliances")} />
              <div className="mt-5 mb-6">
                <Field label="Other small appliances"><TextInput value={form.appliancesOther} onChange={set("appliancesOther")} /></Field>
              </div>
              <Callout>
                Since the apartment already has a washer and dryer: do you plan to keep yours, put them in storage,
                keep them somewhere else, or consider selling/relocating them instead of storing them?
              </Callout>
              <Field label="Washer/dryer plan"><TextArea value={form.washerDryerPlan} onChange={set("washerDryerPlan")} rows={3} /></Field>
            </>
          )}

          {STEPS[step].key === "otherItems" && (
            <>
              <SectionHeading num="5" title="Other Large Items" />
              <MultiSelect options={OTHER_ITEM_OPTIONS} selected={form.otherLargeItems} onToggle={toggleMulti("otherLargeItems")} />
              <div className="mt-5">
                <Field label="Other large items"><TextInput value={form.otherLargeItemsOther} onChange={set("otherLargeItemsOther")} /></Field>
              </div>
            </>
          )}

          {STEPS[step].key === "sorting" && (
            <>
              <SectionHeading num="6" title="Items That May Need Storage" />
              <p className="text-[14px] mb-5" style={{ color: INK }}>
                For your larger items, sort them into the categories below — just list them out however makes sense to you.
              </p>
              <div className="flex flex-col gap-5">
                <Field label="Definitely bringing to the apartment"><TextArea value={form.bringingToApartment} onChange={set("bringingToApartment")} rows={2} /></Field>
                <Field label="May bring, depending on what's already furnished"><TextArea value={form.mayBring} onChange={set("mayBring")} rows={2} /></Field>
                <Field label="Probably needs to go into storage"><TextArea value={form.probablyStorage} onChange={set("probablyStorage")} rows={2} /></Field>
                <Field label="May sell, donate, give away, or relocate"><TextArea value={form.sellDonateRelocate} onChange={set("sellDonateRelocate")} rows={2} /></Field>
              </div>
            </>
          )}

          {STEPS[step].key === "beds" && (
            <>
              <SectionHeading num="7" title="Beds & Bedroom Setup" />
              <Callout>We still need to confirm exactly what furniture will remain in the apartment, so these help us plan ahead.</Callout>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <Field label="How many beds/mattresses do you currently own?"><TextInput value={form.numBeds} onChange={set("numBeds")} /></Field>
                <Field label="What sizes are they?"><TextInput value={form.bedSizes} onChange={set("bedSizes")} /></Field>
              </div>
              <div className="mb-5">
                <Field label="Which bed would you prefer to use?"><TextInput value={form.preferredBed} onChange={set("preferredBed")} /></Field>
              </div>
              <div className="flex items-center justify-between gap-4 mb-5">
                <span className="text-[14px]" style={{ color: INK }}>If a bed is already provided, comfortable storing your current bed?</span>
                <YesNo value={form.comfortableStoringBed} onChange={setYesNo("comfortableStoringBed")} />
              </div>
              <Field label="Bedroom items you definitely want to keep/use"><TextArea value={form.bedroomItemsToKeep} onChange={set("bedroomItemsToKeep")} rows={2} /></Field>
            </>
          )}

          {STEPS[step].key === "storage" && (
            <>
              <SectionHeading num="8" title="Storage Planning" />
              <div className="flex items-center justify-between gap-4 mb-5">
                <span className="text-[14px]" style={{ color: INK }}>Do you currently have a storage unit?</span>
                <YesNo value={form.hasStorageUnit} onChange={setYesNo("hasStorageUnit")} />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-5">
                <Field label="If yes, what size?"><TextInput value={form.storageUnitSize} onChange={set("storageUnitSize")} /></Field>
                <Field label="If yes, approximately how full?"><TextInput value={form.storageUnitFullness} onChange={set("storageUnitFullness")} /></Field>
              </div>
              <div className="flex items-center justify-between gap-4 mb-5">
                <span className="text-[14px]" style={{ color: INK }}>If you don't have storage, OK with us arranging a unit if needed?</span>
                <YesNo value={form.okArrangingStorage} onChange={setYesNo("okArrangingStorage")} />
              </div>
              <div className="flex flex-col gap-5">
                <Field label="Items that absolutely cannot be stored"><TextArea value={form.itemsRequiringStorage} onChange={set("itemsRequiringStorage")} rows={2} /></Field>
                <Field label="Items that need climate-controlled storage"><TextArea value={form.itemsRequiringClimateControl} onChange={set("itemsRequiringClimateControl")} rows={2} /></Field>
              </div>
            </>
          )}

          {STEPS[step].key === "review" && (
            <>
              <SectionHeading num="9" title="Review & Submit" />
              <Callout>
                Once we have this, we'll compare it against what's already in the apartment to figure out what to bring,
                what's already provided, what needs storage, and the best move-in timeline. Forgot something? Come back to
                this same link anytime and submit again with the same name — it'll update your existing answers instead
                of creating a duplicate.
              </Callout>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <Field label="Your Name" required><TextInput value={form.respondentName} onChange={set("respondentName")} /></Field>
                <Field label="Email to send a copy to" required><TextInput type="email" value={form.respondentEmail} onChange={set("respondentEmail")} /></Field>
              </div>

              <label className="flex items-start gap-3 p-4 rounded-md" style={{ backgroundColor: PALEGREY }}>
                <input type="checkbox" checked={form.confirmAccurate} onChange={set("confirmAccurate")} className="mt-1 w-4 h-4" />
                <span className="text-[14px]" style={{ color: INK }}>
                  This reflects my current belongings and preferences to the best of my knowledge as of today.
                </span>
              </label>

              {submitState === "error" && <SubmitErrorBox message={resultMessage} onDownload={downloadCopy} />}

              <SubmitButton canSubmit={canSubmit} submitState={submitState} onClick={handleSubmit} label="Submit Questionnaire" />
            </>
          )}
        </div>

        <NavButtons canGoBack={canGoBack} onBack={() => setStep((s) => s - 1)} onNext={() => canGoNext && setStep((s) => s + 1)} isLastStep={isLastStep} />

        <p className="text-center text-[12px] mt-6" style={{ color: MIDGREY }}>Your progress is saved automatically in this browser as you go.</p>
      </div>
    </div>
  );
}

export default function MoveInQuestionnaireApp() {
  return (
    <ErrorBoundary>
      <MoveInQuestionnaireForm />
    </ErrorBoundary>
  );
}
