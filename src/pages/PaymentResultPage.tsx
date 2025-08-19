// src/pages/PaymentResultPage.tsx
import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom'; // Importeer Link & useSearchParams

const PaymentResultPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  // Optioneel: Haal orderId uit de URL (die we meegaven in de redirectUrl)
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    // Je zou hier een effect kunnen toevoegen dat na een paar seconden
    // de status van de order opvraagt bij je backend,
    // maar voor nu vertrouwen we op de webhook en de e-mailbevestiging.
    if (orderId) {
      console.log("Payment redirect received for Order ID:", orderId);
      // Voorbeeld: setTimeout(() => fetchOrderStatus(orderId), 3000);
    }
  }, [orderId]);

  return (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh', // Neem volledige hoogte
        padding: '40px',
        textAlign: 'center',
        color: '#333', // Donkergrijs voor leesbaarheid
        background: 'linear-gradient(to bottom right, #eff6ff, #fdf4ff, #fce7f3)', // Lichte gradient achtergrond
        fontFamily: "'Poppins', sans-serif" // Zorg dat het Poppins font ook hier werkt
     }}>

      <h1 style={{ color: '#4f46e5', marginBottom: '25px' }}>Verwerken van Betaling</h1>

      <p style={{ marginBottom: '15px', fontSize: '1.1em', maxWidth: '600px' }}>
        Bedankt voor je bestelling{orderId ? ` met nummer #${orderId}` : ''}! We verwerken momenteel je betaling.
      </p>
      <p style={{ marginBottom: '30px', fontSize: '1.0em', maxWidth: '600px' }}>
        Je ontvangt binnen enkele ogenblikken een orderbevestiging per e-mail zodra de betaling definitief is verwerkt. Controleer eventueel ook je spamfolder.
      </p>

       {/* Laadindicator */}
       <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
           <div style={{
               border: '5px solid rgba(79, 70, 229, 0.15)', // Iets dikker, lichter
               borderLeftColor: '#4f46e5', // Indigo kleur
               borderRadius: '50%',
               width: '50px',
               height: '50px',
               animation: 'spin 1.2s linear infinite'
           }}></div>
           <style>{`
               @keyframes spin {
                   to { transform: rotate(360deg); }
               }
           `}</style>
       </div>

      <Link
        to="/" // Link naar de hoofdpagina/configurator
        style={{
            display: 'inline-block',
            padding: '12px 25px',
            backgroundColor: '#4f46e5', // Indigo
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '500',
            transition: 'background-color 0.3s ease',
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#4338ca')} // Iets donkerder bij hover
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#4f46e5')}
       >
         Terug naar de website
       </Link>

    </div>
  );
};

export default PaymentResultPage;