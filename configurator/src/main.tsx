// src/main.tsx (of src/index.tsx)

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom'; // <-- TOEGEVOEGD

import App from './App'; // Je bestaande configurator component
import PaymentResultPage from './pages/PaymentResultPage'; // <-- TOEGEVOEGD
import './index.css'; // Importeer je hoofd CSS bestand (Tailwind etc.)

// Zoek de container in je HTML-pagina
const container = document.getElementById('react-app-container'); // <-- GEWIJZIGD: We gebruiken 'react-app-container' uit je index.html

if (container) {
  // Render de app met de router structuur
  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      {/* --- START WIJZIGING --- */}
      <BrowserRouter>
        <Routes>
          {/* Route voor de configurator (hoofdpagina van de React app) */}
          <Route path="/" element={<App />} />

          {/* Route voor de Mollie redirect pagina */}
          <Route path="/bedankt" element={<PaymentResultPage />} />

          {/* Voeg hier eventueel andere React-specifieke routes toe */}

        </Routes>
      </BrowserRouter>
      {/* --- EINDE WIJZIGING --- */}
    </React.StrictMode>
  );
} else {
  console.error('Container element niet gevonden! Controleer of er een element is met id="react-app-container" in je index.html');
}