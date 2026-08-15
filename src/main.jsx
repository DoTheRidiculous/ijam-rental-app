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
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/create-link" element={<LinkBuilder />} />
        <Route path="/rental-application" element={<RentalApplicationApp />} />
        <Route path="/agreement-to-lease" element={<AgreementToLeaseApp />} />
        <Route path="/residential-lease" element={<ResidentialLeaseApp />} />
        <Route path="/move-in-questionnaire" element={<MoveInQuestionnaireApp />} />
        <Route path="/item-photos" element={<PhotoUploadApp />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
