// src/components/MolliePaymentForm.tsx
import React, { useEffect, useRef, useState } from 'react';

// Declareer het Mollie object globaal
declare global {
  interface Window { Mollie?: any; }
}

// Definieer de properties
interface MolliePaymentFormProps {
  paymentId: string;
  profileId: string;
  onPaymentComplete?: (payload: { token: string; paymentId: string }) => void;
  onPaymentError?: (error: any) => void;
}

const MolliePaymentForm: React.FC<MolliePaymentFormProps> = ({
  paymentId,
  profileId,
  onPaymentComplete,
  onPaymentError,
}) => {
  // State
  const [mollie, setMollie] = useState<any>(null);
  const [isComponentReady, setIsComponentReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  // NIEUWE CODE (invoegen):
    const paymentMethodsRef = useRef<HTMLDivElement>(null); // Ref voor de betaalmethoden container

  // Effect 1: Initialiseer Mollie
  useEffect(() => {
    if (window.Mollie) {
      try {
        console.log("MolliePaymentForm: Initializing Mollie with Profile ID:", profileId);
        const mollieInstance = window.Mollie(profileId, {
          locale: 'nl_NL',
          testmode: true,
        });
        setMollie(mollieInstance);
        console.log("MolliePaymentForm: Mollie initialized");
      } catch (initError) {
         console.error("MolliePaymentForm: Failed to initialize Mollie:", initError);
         setError("Kon Mollie niet initialiseren.");
         if (onPaymentError) onPaymentError(initError);
      }
    } else {
      console.error("MolliePaymentForm: Mollie.js script not loaded!");
      setError("Mollie script niet gevonden. Is het geladen in de HTML?");
    }
  }, [profileId]);

 // NIEUWE CODE (invoegen):
// Effect 2: Maak en mount de 'paymentMethods' component
useEffect(() => {
    console.log("MolliePaymentForm: Effect 2 triggered. Mollie initialized:", !!mollie, "PaymentID received:", paymentId);
  
    // Controleer of Mollie is geïnitialiseerd, paymentId er is, en de ref voor de container bestaat
    if (mollie && paymentId && paymentMethodsRef.current) {
        console.log("MolliePaymentForm: Conditions met for mounting paymentMethods. Creating component...");
        setIsComponentReady(false); // Zet klaar-status uit tijdens laden
        setError(null);
        let paymentMethodsComponent: any = null; // Houd referentie bij voor unmount
  
        try {
            // Maak de 'paymentMethods' component aan
            paymentMethodsComponent = mollie.createComponent('paymentMethods');
            console.log("MolliePaymentForm: paymentMethods component created.");
  
            // Mount de component in de div met de ref
            paymentMethodsComponent.mount(paymentMethodsRef.current);
            console.log("MolliePaymentForm: paymentMethods component mounted.");
  
            // Voeg event listener toe voor fouten binnen de component (bv. ongeldige selectie)
            paymentMethodsComponent.on('change', (event: any) => {
                if (event.error && event.touched) {
                    console.error("Mollie paymentMethods component error:", event.error);
                    setError(event.error.message);
                    if (onPaymentError) onPaymentError(event.error);
                } else {
                    setError(null); // Reset fout als deze is opgelost
                }
            });
  
            // Component is klaar om te tonen/gebruiken
            setIsComponentReady(true);
            console.log("MolliePaymentForm: paymentMethods component ready.");
  
            // Cleanup functie: unmount de component als de parent unmount of dependencies veranderen
            return () => {
                if (paymentMethodsComponent) {
                    console.log("MolliePaymentForm: Unmounting paymentMethods component.");
                    try {
                        paymentMethodsComponent.unmount();
                    } catch (e) {
                        console.warn("MolliePaymentForm: Error unmounting paymentMethods component:", e);
                    }
                }
                setIsComponentReady(false); // Zet klaar-status terug
            };
  
        } catch (componentError) {
            console.error("MolliePaymentForm: ERROR creating/mounting paymentMethods component:", componentError);
            setError("Fout bij laden betaalmethoden.");
            if (onPaymentError) onPaymentError(componentError);
        }
  
    } else {
        // Log waarom de component niet kon mounten
        console.log("MolliePaymentForm: Conditions NOT met for mounting paymentMethods. Mollie ready:", !!mollie, "PaymentID:", paymentId, "Ref ready:", !!paymentMethodsRef.current);
    }
  }, [mollie, paymentId, onPaymentError]); // Dependencies blijven hetzelfde


  // Functie handlePaymentSubmit (ongewijzigd)
  const handlePaymentSubmit = async (event: React.FormEvent) => {
      event.preventDefault();
      setError(null);
      if (!mollie || !isComponentReady) {
        setError("Betaalformulier is nog niet klaar.");
        return;
      }
      console.log("MolliePaymentForm: Creating Mollie token...");
      try {
          const { token, error: tokenError } = await mollie.createToken();
          if (tokenError) {
              console.error("MolliePaymentForm: Token creation error:", tokenError);
              setError(tokenError.message);
              if (onPaymentError) onPaymentError(tokenError);
              return;
          }
          console.log("MolliePaymentForm: Token received:", token);
          if (onPaymentComplete) {
            onPaymentComplete({ token, paymentId });
          } else {
             alert(`Betaling Token: ${token} voor Payment ID: ${paymentId}. Stuur dit naar je backend!`);
          }
      } catch (e) {
          console.error("MolliePaymentForm: Error during token creation:", e);
          setError("Kon betaalgegevens niet verwerken.");
          if (onPaymentError) onPaymentError(e);
      }
  };

// JSX return (Aangepast voor Mollie 'paymentMethods' component)
return (
    <form onSubmit={handlePaymentSubmit} className="mollie-payment-form space-y-4 p-1">

      {/* Container voor de Mollie Betaalmethoden Component */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Kies uw betaalmethode:
        </label>
        <div
          id="mollie-payment-methods" // Een ID voor de container
          ref={paymentMethodsRef}    // De ref die we eerder hebben aangemaakt
          className="p-1 border border-gray-200 rounded-md shadow-sm min-h-[50px]" // Basis styling
        >
          {/* Mollie 'paymentMethods' component mount hier */}
          {!isComponentReady && <p className="text-sm text-gray-500 p-2">Betaalmethoden laden...</p>}
        </div>
      </div>

      {/* Toon Foutmeldingen (van Mollie Components of token creatie) */}
      {error && (
        <div className="text-red-600 text-sm mt-2 p-2 bg-red-50 rounded border border-red-200" role="alert">
          {error}
        </div>
      )}

      {/* Betaalknop */}
      <button
        type="submit"
        // Knop is uitgeschakeld tot de betaalmethoden component klaar is
        // en er geen validatiefout is vanuit de component.
        disabled={!isComponentReady || !!error}
        className="w-full mt-4 px-4 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
      >
         {/* De tekst op de knop is generiek; de 'paymentMethods' component regelt de actie */}
         {isComponentReady ? 'Ga verder met betalen' : 'Betaalmethoden laden...'}
      </button>

    </form>
  );
};

export default MolliePaymentForm;