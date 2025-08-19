<?php
// api/orders.php
// Versie met DB save, Maker Email, Klant PDF & Klant Email

// --- DEBUG CODE IS NU UITGECOMMENTARIEERD ---
// ini_set('display_errors', 1);
// ini_set('display_startup_errors', 1);
// error_reporting(E_ALL);
// --- EINDE DEBUG CODE ---

// --- Composer Autoloader & Use statements ---
$autoloaderPath = __DIR__ . '/../vendor/autoload.php';
if (!file_exists($autoloaderPath)) {
    http_response_code(500); header('Content-Type: application/json'); header('Access-Control-Allow-Origin: *');
    error_log("FATAL ERROR: Composer autoloader not found at " . $autoloaderPath);
    echo json_encode(['status' => 'error', 'message' => 'Internal server configuration error (Autoloader).']);
    exit;
}
require $autoloaderPath;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException; // Alias om conflict met algemene Exception te voorkomen
use Mpdf\Mpdf;
use Mpdf\Output\Destination;

// --- Database Configuratie ---
$db_host = 'localhost';
$db_name = 'likeabilly';
$db_user = 'robnolten';
$db_pass = 'jg247A9e~'; 
$db_charset = 'utf8mb4';
// ---------------------------


// --- Standaard Headers ---
header('Content-Type: application/json');
// !! PAS CORS AAN VOOR PRODUCTIE naar 'https://likeabilly.nl' !!
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Preflight request afhandelen
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { http_response_code(200); exit(); }

// Check request methode
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']); exit();
}

// Ontvang en decodeer JSON data
$jsonPayload = file_get_contents('php://input');
$data = json_decode($jsonPayload, true);

// Validatie van JSON
if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400); error_log("Invalid JSON received: " . json_last_error_msg());
    echo json_encode(['status' => 'error', 'message' => 'Invalid data format received.']); exit();
}
if (empty($data) || !isset($data['configuration']) || !isset($data['customer'])) {
     http_response_code(400); error_log("Incomplete data received: " . $jsonPayload);
     echo json_encode(['status' => 'error', 'message' => 'Incomplete data received.']); exit();
}

// --- Hoofdlogica ---
$dsn = "mysql:host=$db_host;dbname=$db_name;charset=$db_charset";
$options = [ PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false ];

$orderId = null;
$emailToMakerStatus = '(Not Attempted)';
$emailToCustomerStatus = '(Not Attempted)';
$pdfGenerated = false;

try {
     // 1. DB Verbinding & Insert
     $pdo = new PDO($dsn, $db_user, $db_pass, $options);
     $customer = $data['customer'];
     $config = $data['configuration'];
     $configJson = json_encode($config);
     $price = $config['calculatedPrice'] ?? 0.00;
     $sql = "INSERT INTO orders (customer_name, customer_email, customer_address, customer_zip, customer_city, customer_phone, customer_notes, create_account, configuration_json, price, status, order_date) VALUES (:name, :email, :address, :zip, :city, :phone, :notes, :create_account, :config_json, :price, :status, NOW())";
     $stmt = $pdo->prepare($sql);
     $status_default = 'received';
     $create_account_bool = !empty($customer['createAccount']);
     $params = [
         ':name' => $customer['name'], ':email' => $customer['email'], ':address' => $customer['address'],
         ':zip' => $customer['zip'], ':city' => $customer['city'], ':phone' => $customer['phone'] ?? null,
         ':notes' => $customer['notes'] ?? null, ':create_account' => $create_account_bool ? 1 : 0,
         ':config_json' => $configJson, ':price' => $price, ':status' => $status_default
     ];
     $stmt->execute($params);
     $orderId = $pdo->lastInsertId();

     if (!$orderId) { throw new \Exception("Failed to retrieve order ID after insert."); }

     // --- Order succesvol opgeslagen, ga verder ---

     // 2. Genereer Onderdelenlijst
     $partsListArray = generatePartsList($config);
     $partsListString = formatPartsListForEmail($partsListArray);

     // 3. E-mail naar Meubelmaker
     $mailMaker = new PHPMailer(true);
     try {
         // Configureer $mailMaker (zelfde SMTP instellingen als hieronder voor klant)
         $mailMaker->isSMTP();
         $mailMaker->Host       = 'mail.hostingserver.nl';
         $mailMaker->SMTPAuth   = true;
         $mailMaker->Username   = 'rob@likeabilly.nl';
         $mailMaker->Password   = '55!ejWo21'; // <-- !! VERVANG DIT !!
         $mailMaker->CharSet    = 'UTF-8';
         $mailMaker->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS; // Kies SMTPS/465 of STARTTLS/587
         $mailMaker->Port       = 465;

         $mailMaker->setFrom('rob@likeabilly.nl', 'Likeabilly Webshop');
         $mailMaker->addAddress('rob@likeabilly.nl', 'Meubelmaker Rob'); // Aanpassen!

         $mailMaker->isHTML(false);
         $mailMaker->Subject = "Nieuwe Likeabilly Bestelling: #" . $orderId;
         $mailBodyMaker = "Bestelling #{$orderId} van {$customer['name']} ({$customer['email']}).\n\n";
         $mailBodyMaker .= "Klantgegevens:\n" . // ... voeg meer klantgegevens toe ...
                           "Adres: " . ($customer['address'] ?? '-') . ", " . ($customer['zip'] ?? '-') . " " . ($customer['city'] ?? '-') . "\n\n";
         $mailBodyMaker .= $partsListString;
         $mailMaker->Body = $mailBodyMaker;
         $mailMaker->send();
         $emailToMakerStatus = 'Sent';
     } catch (PHPMailerException $e_mail_maker) {
         error_log("Mailer Error (Maker) Order {$orderId}: {$mailMaker->ErrorInfo}");
         $emailToMakerStatus = 'FAILED';
     }

     // 4. Genereer PDF voor Klant
     $pdfContent = null;
     $pdfTempDir = __DIR__ . '/../tmp'; // Pad naar beschrijfbare temp map
     if (!is_dir($pdfTempDir)) { mkdir($pdfTempDir, 0775, true); } // Probeer map aan te maken

     try {
         $companyName = "Likeabilly V.O.F."; // Voorbeeld
         $companyAddress = "Voorbeeldstraat 1, 1234 AB Schiedam";
         $companyVat = "NL123456789B01";
         $companyKvK = "12345678";
         $orderDate = date('d-m-Y H:i');

         // Simpele HTML Template (kan veel uitgebreider)
         $html = <<<HTML
         <!DOCTYPE html><html><head><meta charset="UTF-8"><title>Order {$orderId}</title>
         <style> body { font-family: sans-serif; } h1, h2 { color: #4f46e5; } hr { border: 0; border-top: 1px solid #eee; margin: 1em 0; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } </style>
         </head><body>
         <h1>Orderbevestiging #{$orderId}</h1>
         <p><strong>{$companyName}</strong><br>{$companyAddress}<br>BTW: {$companyVat} | KVK: {$companyKvK}</p>
         <hr>
         <p><strong>Klant:</strong><br>
         {$customer['name']}<br>
         {$customer['address']}<br>
         {$customer['zip']} {$customer['city']}<br>
         E-mail: {$customer['email']}<br>
         Telefoon: {$customer['phone'] ?? '-'}</p>
         <hr>
         <p><strong>Orderdatum:</strong> {$orderDate}</p>
         <hr>
         <h2>Uw Configuratie:</h2>
         <table>
           <tr><th>Optie</th><th>Waarde</th></tr>
           <tr><td>Breedte</td><td>{$config['inputWidth']} cm</td></tr>
           <tr><td>Hoogte</td><td>{$config['inputHeight']} cm</td></tr>
           <tr><td>Diepte</td><td>{$config['inputDepth']} cm</td></tr>
           <tr><td>Materiaal</td><td>{$config['material']}</td></tr>
           <tr><td>Planken</td><td>{$config['calculatedTotalShelfCount']}</td></tr>
           <tr><td>Tussenschotten</td><td>{$config['calculatedNumberOfDividers']}</td></tr>
           <tr><td>Indeling</td><td>{$config['isCustomLayout'] ? 'Aangepast' : 'Standaard'}</td></tr>
           </table>
         <hr>
         <h2>Prijs:</h2>
         <p><strong>Totaal (incl. BTW): € {$price}</strong></p>
         <hr>
         <p>Bedankt voor uw bestelling!</p>
         </body></html>
         HTML;

         $mpdf = new Mpdf(['tempDir' => $pdfTempDir, 'mode' => 'utf-8', 'format' => 'A4']);
         $mpdf->WriteHTML($html);
         $pdfContent = $mpdf->Output('', Destination::STRING_RETURN); // PDF als string
         $pdfGenerated = true;

     } catch (\Mpdf\MpdfException $e_pdf) {
         error_log("mPDF Error for Order {$orderId}: " . $e_pdf->getMessage());
         $emailToCustomerStatus = '(PDF generation failed!)';
     } catch (\Throwable $e_general_pdf) {
         error_log("General Error during PDF generation for Order {$orderId}: " . $e_general_pdf->getMessage());
         $emailToCustomerStatus = '(PDF generation failed!)';
     }

     // 5. E-mail naar Klant (met PDF)
     if ($pdfGenerated && $pdfContent) {
         $mailCustomer = new PHPMailer(true);
         try {
             // Gebruik dezelfde SMTP instellingen als voor de maker mail
             $mailCustomer->isSMTP();
             $mailCustomer->Host       = 'mail.hostingserver.nl';
             $mailCustomer->SMTPAuth   = true;
             $mailCustomer->Username   = 'rob@likeabilly.nl';
             $mailCustomer->Password   = '55!ejWo21'; // <-- !! VERVANG DIT !!
             $mailCustomer->CharSet    = 'UTF-8';
             $mailCustomer->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
             $mailCustomer->Port       = 465;
             // OF $mailCustomer->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS; $mailCustomer->Port = 587;

             $mailCustomer->setFrom('rob@likeabilly.nl', 'Likeabilly Webshop');
             $mailCustomer->addAddress($customer['email'], $customer['name']); // Naar de klant

             $mailCustomer->Subject = "Likeabilly Bestelling Bevestiging #" . $orderId;
             $mailCustomer->Body    = "Beste " . ($customer['name'] ?? 'klant') . ",\n\nBedankt voor uw bestelling!\n\nBijgevoegd vindt u de details van uw bestelling (Nr. {$orderId}).\n\nMet vriendelijke groet,\nTeam Likeabilly";
             $mailCustomer->addStringAttachment($pdfContent, 'Likeabilly_Bestelling_' . $orderId . '.pdf'); // PDF toevoegen

             $mailCustomer->send();
             $emailToCustomerStatus = 'Sent';

         } catch (PHPMailerException $e_mail_customer) {
             error_log("Mailer Error (Customer) for Order {$orderId}: {$mailCustomer->ErrorInfo}");
             $emailToCustomerStatus = 'FAILED';
         }
     } else {
         // PDF generatie was al mislukt, dus geen mail verstuurd
         if ($emailToCustomerStatus === '(Not Attempted)') { // Alleen als er nog geen PDF fout was
             $emailToCustomerStatus = '(Not Sent - PDF Error)';
         }
     }

     // --- Succesvolle Afronding ---
     $successMessage = "Order saved. Maker email: {$emailToMakerStatus}. Customer email: {$emailToCustomerStatus}.";
     http_response_code(200);
     echo json_encode([
         'status' => 'success',
         'message' => $successMessage,
         'orderId' => $orderId
     ]);
     exit;

} catch (\PDOException $e_db) {
     // Database fout (PRODUCTIE VEILIG)
     http_response_code(500);
     error_log("Database Error: " . $e_db->getMessage() . "..."); // Log details
     echo json_encode(['status' => 'error', 'message' => 'Failed to save order (DB Error).']); // Generiek
     exit();
} catch (\Throwable $e_general) {
    // Algemene fout (PRODUCTIE VEILIG)
     http_response_code(500);
     error_log("General Error: " . $e_general->getMessage() . "..."); // Log details
     echo json_encode(['status' => 'error', 'message' => 'An unexpected error occurred.']); // Generiek
     exit();
}

// --- FUNCTIE DEFINITIES ---
function generatePartsList(array $config): array { /* ... ongewijzigd ... */ }
function formatPartsListForEmail(array $partsList): string { /* ... ongewijzigd ... */ }

// Geen sluitende ?> nodig