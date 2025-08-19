<?php
// /api/mollie-webhook.php

// --- Error Logging (consistent met orders.php) ---
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);
// Gebruik een apart logbestand voor webhooks, dat is overzichtelijker
ini_set('error_log', __DIR__ . '/webhook_error.log');
error_log("Webhook called: " . date('Y-m-d H:i:s'));
// Log de ontvangen POST data van Mollie (kan helpen bij debuggen)
error_log("Webhook POST data: " . print_r($_POST, true));

// --- Composer Autoloader ---
$autoloaderPath = __DIR__ . '/../vendor/autoload.php'; // Pas pad aan indien nodig
if (!file_exists($autoloaderPath)) {
    http_response_code(500);
    error_log("FATAL ERROR: Composer autoloader not found at " . $autoloaderPath);
    // Belangrijk: Geen echo hier, Mollie verwacht alleen een HTTP status code.
    exit;
}
require $autoloaderPath;

// --- Database Configuratie (exact dezelfde als in orders.php!) ---
$db_host = 'localhost'; // Gebruik 127.0.0.1 om TCP/IP af te dwingen
$db_port = '3306';      // Standaard MySQL poort (pas aan indien MAMP anders gebruikt)
$db_name = 'likeabilly_db'; // De database naam die je hebt aangemaakt
$db_user = 'root';      // Standaard MAMP gebruiker
$db_pass = 'root';      // Standaard MAMP wachtwoord
$charset = 'utf8mb4';

$dsn = "mysql:host=$db_host;port=$db_port;dbname=$db_name;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Gooi exceptions bij fouten
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Haal data op als associative arrays
    PDO::ATTR_EMULATE_PREPARES   => false,                  // Gebruik echte prepared statements
];
// ---------------------------

// --- Mollie API Key (exact dezelfde als in orders.php!) ---
// !!! VERVANG DIT MET JE ECHTE TEST/LIVE API KEY !!! NOOIT HARDCODEN IN PRODUCTIE
$mollieApiKey = "test_QEq8MPduhc5wD6K3EWwrwTHCx7RWjs"; // Gebruik dezelfde key!

// --- Mollie Webhook Verwerking ---
try {
    // Stap 1: Controleer of de 'id' parameter is meegestuurd door Mollie
    if (!isset($_POST["id"])) {
        // Mollie stuurt geen ID mee? Vreemd, maar we kunnen niets doen.
        http_response_code(400); // Bad Request
        error_log("Webhook Error: Missing 'id' parameter in POST request from Mollie.");
        exit;
    }
    $paymentId = $_POST["id"];
    error_log("Webhook received for Mollie Payment ID: " . $paymentId);

    // Stap 2: Initialiseer de Mollie API Client
    $mollie = new \Mollie\Api\MollieApiClient();
    $mollie->setApiKey($mollieApiKey);

    // Stap 3: Haal de specifieke betaling op bij Mollie
    $payment = $mollie->payments->get($paymentId);
    error_log("Fetched Mollie payment details. Current status: " . $payment->status);

    // Stap 4: Haal ons interne order ID uit de metadata die we eerder meegaven
    // Belangrijk: Controleer of metadata en de order_id key bestaan!
    if (empty($payment->metadata) || !isset($payment->metadata->order_id) || empty($payment->metadata->order_id)) {
         http_response_code(400); // Bad Request - We kunnen niet zonder order ID
         error_log("Webhook Error: Missing or empty 'order_id' in metadata for Mollie payment " . $paymentId);
         exit;
    }
    $internal_order_id = $payment->metadata->order_id;
    error_log("Internal Order ID from metadata: " . $internal_order_id);

    // Stap 5: Bepaal de nieuwe status voor ONZE database op basis van de Mollie status
    $newDbStatus = null; // We updaten alleen als we een relevante status zien

    if ($payment->isPaid() && !$payment->hasRefunds() && !$payment->hasChargebacks()) {
        // Betaling is succesvol afgerond!
        $newDbStatus = 'paid'; // Of 'completed', wat voor jou logisch is
        error_log("Payment is PAID for Order ID: {$internal_order_id}");
        // Optioneel: Verstuur hier de definitieve orderbevestiging/factuur naar de klant
        // send_final_confirmation_email($internal_order_id);

    } elseif ($payment->isFailed()) {
        $newDbStatus = 'failed';
        error_log("Payment FAILED for Order ID: {$internal_order_id}");
    } elseif ($payment->isExpired()) {
        $newDbStatus = 'expired';
        error_log("Payment EXPIRED for Order ID: {$internal_order_id}");
    } elseif ($payment->isCanceled()) {
        $newDbStatus = 'canceled';
        error_log("Payment CANCELED for Order ID: {$internal_order_id}");
    } elseif ($payment->isOpen() || $payment->isPending()) {
         // Betaling staat nog open (bv. gebruiker is bij iDEAL bank) of wacht op actie (overschrijving).
         // De status in de DB was al 'pending' bij aanmaken, dus we hoeven meestal niets te updaten.
         error_log("Payment status is '{$payment->status}' for Order ID: {$internal_order_id}. No DB status change needed from webhook at this time.");
    } else {
        // Andere Mollie statussen (refunded, chargeback, etc.)
        // Voeg hier eventueel logica toe als je deze specifiek wilt behandelen
        error_log("Unhandled Mollie payment status '{$payment->status}' detected for Order ID: {$internal_order_id}. No DB status change applied.");
    }

    // Stap 6: Update de order status in de database ALS een nieuwe status is bepaald
    if ($newDbStatus !== null) {
        error_log("Attempting to update database status to '{$newDbStatus}' for Order ID: {$internal_order_id}");
        try {
            // Maak database verbinding
            $pdo = new PDO($dsn, $db_user, $db_pass, $options);

            // Bereid de update query voor. Update alleen als de status NOG 'pending' is
            // (of eventueel andere statussen die je wilt overschrijven).
            $sql_update_status = "UPDATE orders SET status = :status WHERE id = :order_id AND (status = 'pending' OR status = 'open' OR status = 'pending_payment')";
            $stmt_update_status = $pdo->prepare($sql_update_status);

            // Voer de update uit
            $stmt_update_status->execute([
                ':status' => $newDbStatus,
                ':order_id' => $internal_order_id
            ]);

            $rowCount = $stmt_update_status->rowCount();
            if ($rowCount > 0) {
                 error_log("DATABASE UPDATE SUCCESS: Status for Order ID {$internal_order_id} updated to '{$newDbStatus}'.");
            } else {
                 // Dit kan gebeuren als de webhook vaker wordt aangeroepen of als de status al anders was. Meestal geen probleem.
                 error_log("DATABASE UPDATE INFO: Status update for Order ID {$internal_order_id} to '{$newDbStatus}' affected 0 rows. (Status might have been updated previously or wasn't pending/open).");
            }

        } catch (\PDOException $e_db_update) {
            // Log de database fout! Essentieel voor debuggen.
            error_log("!!! DATABASE UPDATE ERROR (Webhook Status): Failed to update status for Order ID {$internal_order_id}. Error: " . $e_db_update->getMessage());
            // BELANGRIJK: Stuur *toch* 200 OK terug naar Mollie, anders blijven ze het proberen.
            // Je moet de fout handmatig oplossen op basis van de logs.
            http_response_code(200);
            echo "Database update failed, but webhook acknowledged."; // Optionele body
            exit;
        }
    } else {
         error_log("No relevant status change detected from Mollie status '{$payment->status}'. No database update performed for Order ID: {$internal_order_id}.");
    }

    // Stap 7: Stuur 200 OK terug naar Mollie
    // Dit is essentieel, anders blijft Mollie de webhook aanroepen.
    http_response_code(200);
    echo "Webhook processed successfully."; // Optionele body
    exit;

} catch (\Mollie\Api\Exceptions\ApiException $e_mollie_api) {
    // Fout bij het communiceren met de Mollie API (bv. ongeldige payment ID)
    error_log("Webhook Mollie API Error: " . $e_mollie_api->getMessage() . " | Field: " . $e_mollie_api->getField());
    http_response_code(500); // Internal Server Error
    exit; // Geen echo
} catch (\Throwable $e) {
    // Algemene onverwachte fout in het script
    error_log("Webhook General Error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
    http_response_code(500); // Internal Server Error
    exit; // Geen echo
}
?>