import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./Landing.jsx";
import LinkBuilder from "./LinkBuilder.jsx";
import RentalApplicationApp from "./RentalApplicationApp.jsx";
import AgreementToLeaseApp from "./AgreementToLeaseApp.jsx";
import ResidentialLeaseApp from "./ResidentialLeaseApp.jsx";
import MoveInQuestionnaireApp from "./MoveInQuestionnaireApp.jsx";
import PhotoUploadApp from "./PhotoUploadApp.jsx";
import FindPhotos from "./FindPhotos.jsx";
import StorageDonationConsentApp from "./StorageDonationConsentApp.jsx";
import MoveSupportApp from "./MoveSupportApp.jsx";
import DocumentSearchApp from "./DocumentSearchApp.jsx";
import PropertyLoanAgreementApp from "./PropertyLoanAgreementApp.jsx";
import DashboardApp from "./DashboardApp.jsx";
import EmailTemplatesApp from "./EmailTemplatesApp.jsx";
import ProofOfIncomeApp from "./ProofOfIncomeApp.jsx";
import FaqApp from "./FaqApp.jsx";
import { StaffGate } from "./formKit.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<StaffGate><Landing /></StaffGate>} />
        <Route path="/create-link" element={<StaffGate><LinkBuilder /></StaffGate>} />
        <Route path="/rental-application" element={<RentalApplicationApp />} />
        <Route path="/agreement-to-lease" element={<AgreementToLeaseApp />} />
        <Route path="/residential-lease" element={<ResidentialLeaseApp />} />
        <Route path="/move-in-questionnaire" element={<MoveInQuestionnaireApp />} />
        <Route path="/item-photos" element={<PhotoUploadApp />} />
        <Route path="/find-photos" element={<StaffGate><FindPhotos /></StaffGate>} />
        <Route path="/storage-donation-consent" element={<StorageDonationConsentApp />} />
        <Route path="/move-support" element={<MoveSupportApp />} />
        <Route path="/find-documents" element={<StaffGate><DocumentSearchApp /></StaffGate>} />
        <Route path="/property-loan-agreement" element={<PropertyLoanAgreementApp />} />
        <Route path="/dashboard" element={<StaffGate><DashboardApp /></StaffGate>} />
        <Route path="/email-templates" element={<StaffGate><EmailTemplatesApp /></StaffGate>} />
        <Route path="/proof-of-income" element={<ProofOfIncomeApp />} />
        <Route path="/faq" element={<FaqApp />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
