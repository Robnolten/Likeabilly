<?php
// api/orders.php - DEFINITIEVE VERSIE MET ALLE STAPPEN ACTIEF

// --- Debug en Error Logging ---
ini_set('display_errors', 0); // Voor productie
error_reporting(E_ALL);

// --- Composer Autoloader & Use statements ---
$autoloaderPath = __DIR__ . '/../vendor/autoload.php';
if (!file_exists($autoloaderPath)) {
    http_response_code(500); 
    header('Content-Type: application/json'); 
    header('Access-Control-Allow-Origin: *');
    error_log("FATAL ERROR: Composer autoloader not found at " . $autoloaderPath);
    echo json_encode(['status' => 'error', 'message' => 'Internal server configuration error (Autoloader).']);
    exit;
}
require $autoloaderPath;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;
use Mpdf\Mpdf;
use Mpdf\Output\Destination;
use Mpdf\Config\ConfigVariables;
use Mpdf\Config\FontVariables;

// --- Database Configuratie ---
$db_host = 'localhost';
$db_name = 'likeabilly';
$db_user = 'robnolten';
$db_pass = 'jg247A9e~'; // <-- !! VERVANG DIT IN PRODUCTIE !!
$db_charset = 'utf8mb4';
// ---------------------------

// --- Standaard Headers ---
header('Content-Type: application/json');
// !! PAS CORS AAN VOOR PRODUCTIE !!
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Preflight & Method Check
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') { 
    http_response_code(200); 
    exit(); 
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { 
    http_response_code(405); 
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']); 
    exit(); 
}

// Ontvang en decodeer JSON data
$jsonPayload = file_get_contents('php://input');
$data = json_decode($jsonPayload, true);

// Validatie van JSON
if ($data === null && json_last_error() !== JSON_ERROR_NONE) { 
    http_response_code(400); 
    error_log("Invalid JSON: " . json_last_error_msg()); 
    echo json_encode(['status' => 'error', 'message' => 'Invalid data format received.']); 
    exit(); 
}
if (empty($data) || !isset($data['configuration']) || !isset($data['customer'])) { 
    http_response_code(400); 
    error_log("Incomplete data: " . $jsonPayload); 
    echo json_encode(['status' => 'error', 'message' => 'Incomplete data received.']); 
    exit(); 
}

// --- Hoofdlogica ---
$dsn = "mysql:host=$db_host;dbname=$db_name;charset=$db_charset";
$options = [ 
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, 
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, 
    PDO::ATTR_EMULATE_PREPARES => false 
];

$orderId = null;
$emailToMakerStatus = '(Not Attempted)';
$emailToCustomerStatus = '(Not Attempted)';
$pdfGenerated = false;
$finalSuccessMessage = 'Order processing initiated.'; // Start bericht

try {
    // 1. DB Verbinding & Insert
    $pdo = new PDO($dsn, $db_user, $db_pass, $options);
    $customer = $data['customer']; 
    $config = $data['configuration'];
    $configJson = json_encode($config); 
    
    if ($configJson === false) { 
        throw new \Exception("JSON encode failed: " . json_last_error_msg()); 
    }
    
    $price = $config['calculatedPrice'] ?? 0.00;
    $sql = "INSERT INTO orders (customer_name, customer_email, customer_address, customer_zip, customer_city, customer_phone, customer_notes, create_account, configuration_json, price, status, order_date) VALUES (:name, :email, :address, :zip, :city, :phone, :notes, :create_account, :config_json, :price, :status, NOW())";
    $stmt = $pdo->prepare($sql);
    $status_default = 'received'; 
    $create_account_bool = !empty($customer['createAccount']);
    $params = [ 
        ':name' => $customer['name'] ?? '', 
        ':email' => $customer['email'] ?? '', 
        ':address' => $customer['address'] ?? '', 
        ':zip' => $customer['zip'] ?? '', 
        ':city' => $customer['city'] ?? '', 
        ':phone' => $customer['phone'] ?? null, 
        ':notes' => $customer['notes'] ?? null, 
        ':create_account' => $create_account_bool ? 1 : 0, 
        ':config_json' => $configJson, 
        ':price' => $price, 
        ':status' => $status_default 
    ];
    $stmt->execute($params);
    $orderId = $pdo->lastInsertId();
    
    if (!$orderId) { 
        throw new \Exception("Failed to retrieve order ID after insert."); 
    }

    // --- Stap 1: Genereer Parts List ---
    $partsListArray = generatePartsList($config);
    $partsListString = formatPartsListForEmail($partsListArray);

    // --- Stap 2: E-mail naar Maker ---
    $emailToMakerStatus = '(Attempted, Unknown Error)';
    $mailMaker = new PHPMailer(true);
    try {
        // --- SMTP Settings ---
        $mailMaker->isSMTP();
        $mailMaker->Host       = 'mail.hostingserver.nl';
        $mailMaker->SMTPAuth   = true;
        $mailMaker->Username   = 'rob@likeabilly.nl';
        $mailMaker->Password   = '55!ejWo21'; // <-- !! VERVANG DIT IN PRODUCTIE !!
        $mailMaker->CharSet    = 'UTF-8';
        $mailMaker->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $mailMaker->Port       = 465;

        $mailMaker->setFrom('rob@likeabilly.nl', 'Likeabilly Webshop');
        $mailMaker->addAddress('rob@likeabilly.nl', 'Meubelmaker Rob');
        $mailMaker->isHTML(false);
        $mailMaker->Subject = "Nieuwe Likeabilly Bestelling: #" . $orderId;
        
        // Gedetailleerde e-mail inhoud voor maker
        $mailBodyMaker = "Bestelling #{$orderId} ontvangen op " . date('d-m-Y H:i') . "\n\n";
        $mailBodyMaker .= "Klantgegevens:\n";
        $mailBodyMaker .= "Naam: " . ($customer['name'] ?? '-') . "\n";
        $mailBodyMaker .= "E-mail: " . ($customer['email'] ?? '-') . "\n";
        $mailBodyMaker .= "Adres: " . ($customer['address'] ?? '-') . ", " . ($customer['zip'] ?? '-') . " " . ($customer['city'] ?? '-') . "\n";
        $mailBodyMaker .= "Telefoon: " . ($customer['phone'] ?? '-') . "\n";
        $mailBodyMaker .= "Account aanmaken: " . ($create_account_bool ? 'Ja' : 'Nee') . "\n";
        $mailBodyMaker .= "Opmerkingen: " . (!empty($customer['notes']) ? $customer['notes'] : '-') . "\n\n";
        $mailBodyMaker .= $partsListString; // Onderdelenlijst
        
        $mailMaker->Body = $mailBodyMaker;
        $mailMaker->send();
        $emailToMakerStatus = 'Sent';
    } catch (PHPMailerException $e_mail_maker) {
        error_log("Mailer Error (Maker) Order {$orderId}: {$mailMaker->ErrorInfo}");
        $emailToMakerStatus = 'FAILED';
    }

    // --- Stap 3: PDF Generatie & E-mail Klant ---
    $emailToCustomerStatus = '(Not Attempted)';
    $pdfGenerated = false;
    $pdfContent = null;
    $pdfTempDir = __DIR__ . '/../tmp';
    
    if (!is_dir($pdfTempDir)) { 
        @mkdir($pdfTempDir, 0775, true); 
    }

    if (is_writable($pdfTempDir)) {
        try {
            // Bedrijfsinformatie
            $companyName = "Likeabilly V.O.F."; 
            $companyAddress = "Voorbeeldstraat 1, 1234 AB Schiedam"; 
            $companyVat = "NL123456789B01"; 
            $companyKvK = "12345678"; 
            $orderDate = date('d-m-Y H:i');
            
            // Configuratie-specifieke info
            $width = $config['inputWidth'] ?? '?';
            $height = $config['inputHeight'] ?? '?';
            $depth = $config['inputDepth'] ?? '?';
            $material = $config['material'] ?? 'Standaard';
            $layoutType = isset($config['isCustomLayout']) && $config['isCustomLayout'] ? 'Aangepast' : 'Standaard';
            
            // HTML Template
            $html = <<<HTML
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Order {$orderId}</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.5; color: #333; }
                    h1, h2 { color: #444; }
                    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                </style>
            </head>
            <body>
                <h1>Orderbevestiging #{$orderId}</h1>
                
                <p>
                    <strong>{$companyName}</strong><br>
                    {$companyAddress}<br>
                    KvK: {$companyKvK}<br>
                    BTW: {$companyVat}
                </p>
                <hr>
                
                <p>
                    <strong>Klant:</strong><br>
                    {$customer['name'] ?? '-'}<br>
                    {$customer['address'] ?? '-'}<br>
                    {$customer['zip'] ?? '-'} {$customer['city'] ?? '-'}<br>
                    {$customer['email'] ?? '-'}<br>
                    Tel: {$customer['phone'] ?? '-'}
                </p>
                <hr>
                
                <p><strong>Orderdatum:</strong> {$orderDate}</p>
                <hr>
                
                <h2>Uw Configuratie:</h2>
                <table>
                    <tr><th>Optie</th><th>Waarde</th></tr>
                    <tr><td>Breedte</td><td>{$width} cm</td></tr>
                    <tr><td>Hoogte</td><td>{$height} cm</td></tr>
                    <tr><td>Diepte</td><td>{$depth} cm</td></tr>
                    <tr><td>Materiaal</td><td>{$material}</td></tr>
                    <tr><td>Indeling</td><td>{$layoutType}</td></tr>
                </table>
                
                <hr>
                <h2>Prijs:</h2>
                <p><strong>Totaal (incl. BTW): € {$price}</strong></p>
                <hr>
                
                <p>Bedankt voor uw bestelling bij Likeabilly! We nemen spoedig contact met u op om de levering te bespreken.</p>
                <p>Heeft u vragen? Neem gerust contact op via info@likeabilly.nl</p>
            </body>
            </html>
            HTML;

            // mPDF Generatie
            $defaultConfig = (new ConfigVariables())->getDefaults(); 
            $fontDirs = $defaultConfig['fontDir'];
            $defaultFontConfig = (new FontVariables())->getDefaults(); 
            $fontData = $defaultFontConfig['fontdata'];
            
            $mpdf = new Mpdf([
                'tempDir' => $pdfTempDir, 
                'mode' => 'utf-8', 
                'format' => 'A4'
            ]);
            
            $mpdf->WriteHTML($html);
            $pdfContent = $mpdf->Output('', Destination::STRING_RETURN);
            $pdfGenerated = true;
            $emailToCustomerStatus = '(PDF Generated)';
        } catch (\Mpdf\MpdfException | \Throwable $e_pdf) { 
            error_log("PDF Error Order {$orderId}: " . $e_pdf->getMessage()); 
            $emailToCustomerStatus = '(PDF generation FAILED!)'; 
        }
    } else { 
        error_log("mPDF Error: Temp directory not writable: " . $pdfTempDir); 
        $emailToCustomerStatus = '(PDF generation skipped: Temp dir issue)'; 
    }

    // Verstuur mail naar klant alleen als PDF gelukt is
    if ($pdfGenerated && $pdfContent) {
        $mailCustomer = new PHPMailer(true);
        try {
            $mailCustomer->isSMTP(); 
            $mailCustomer->Host = 'mail.hostingserver.nl'; 
            $mailCustomer->SMTPAuth = true;
            $mailCustomer->Username = 'rob@likeabilly.nl'; 
            $mailCustomer->Password = '55!ejWo21'; // <-- !! VERVANG DIT IN PRODUCTIE !!
            $mailCustomer->CharSet = 'UTF-8'; 
            $mailCustomer->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS; 
            $mailCustomer->Port = 465;

            $mailCustomer->setFrom('rob@likeabilly.nl', 'Likeabilly Webshop');
            $mailCustomer->addAddress($customer['email'], $customer['name']); // Naar de klant!
            $mailCustomer->Subject = "Likeabilly Bestelling Bevestiging #" . $orderId;
            
            // E-mail body voor klant
            $customerBody = "Beste " . ($customer['name'] ?? 'klant') . ",\n\n";
            $customerBody .= "Bedankt voor uw bestelling bij Likeabilly!\n\n";
            $customerBody .= "Uw bestelnummer is: #{$orderId}\n";
            $customerBody .= "Orderdatum: " . date('d-m-Y H:i') . "\n\n";
            $customerBody .= "We hebben uw bestelling ontvangen en zullen deze zo spoedig mogelijk verwerken.\n";
            $customerBody .= "In de bijlage vindt u een PDF met alle details van uw bestelling.\n\n";
            $customerBody .= "Heeft u vragen? Neem gerust contact met ons op.\n\n";
            $customerBody .= "Met vriendelijke groet,\n";
            $customerBody .= "Likeabilly Team\n\n";
            $customerBody .= "info@likeabilly.nl\n";
            
            $mailCustomer->Body = $customerBody;
            $mailCustomer->addStringAttachment($pdfContent, 'Likeabilly_Bestelling_' . $orderId . '.pdf'); // PDF toevoegen
            $mailCustomer->send();
            $emailToCustomerStatus = 'Sent';
        } catch (PHPMailerException $e_mail_customer) { 
            error_log("Mailer Error (Customer) Order {$orderId}: {$mailCustomer->ErrorInfo}"); 
            $emailToCustomerStatus = 'FAILED'; 
        }
    } else { 
        if ($emailToCustomerStatus === '(Not Attempted)' || $emailToCustomerStatus === '(PDF Generated)') { 
            $emailToCustomerStatus = '(Not Sent - PDF Error/Not Generated)'; 
        } 
    }

    // --- Finale Succesboodschap (met alle statussen) ---
    $finalSuccessMessage = "Order #{$orderId} saved. Maker email: {$emailToMakerStatus}. Customer email/PDF: {$emailToCustomerStatus}.";

    http_response_code(200);
    echo json_encode([
        'status' => 'success',
        'message' => $finalSuccessMessage,
        'orderId' => $orderId
    ]);
    exit; // Stop na succes

} catch (\PDOException $e_db) {
    error_log("Database error for order: " . $e_db->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error', 
        'message' => 'Er is een probleem opgetreden bij het opslaan van uw bestelling. Probeer het later opnieuw of neem contact met ons op.'
    ]);
    exit();
} catch (\Throwable $e_general) {
    error_log("General error processing order: " . $e_general->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error', 
        'message' => 'Er is een probleem opgetreden bij het verwerken van uw bestelling. Probeer het later opnieuw of neem contact met ons op.'
    ]);
    exit();
}

// --- FUNCTIE DEFINITIES ---
function generatePartsList(array $config): array {
    $parts = [];
    try {
        $width = floatval($config['inputWidth'] ?? 80);
        $height = floatval($config['inputHeight'] ?? 200);
        $depth = floatval($config['inputDepth'] ?? 40);
        $material = $config['material'] ?? 'onbekend';
        $shelvesPerCompartment = intval($config['shelvesPerCompartment'] ?? 0);
        $dividers = isset($config['calculatedNumberOfDividers']) 
            ? intval($config['calculatedNumberOfDividers']) 
            : ($width > 80 ? floor(($width - 1) / 80) : 0);
        $thickness = floatval($config['shelfThickness'] ?? 1.8);
        $kickboardHeight = floatval($config['kickboardHeight'] ?? 10);
        
        if ($thickness <= 0) $thickness = 1.8;

        $innerWidth = $width - (2 * $thickness);
        $innerDepth = $depth - $thickness;
        $dividerHeight = $height - 2 * $thickness;
        $numCompartments = $dividers + 1;
        
        if ($numCompartments <= 0) $numCompartments = 1;
        
        $compartmentInnerWidth = $dividers > 0 
            ? ($innerWidth - ($dividers * $thickness)) / $numCompartments 
            : $innerWidth;
            
        if ($compartmentInnerWidth < 0) $compartmentInnerWidth = 0;
        
        $totalShelfCount = $shelvesPerCompartment * $numCompartments;

        // Voeg onderdelen toe
        if ($height > 0 && $depth > 0) { 
            $parts[] = [
                'name' => 'Zijpaneel', 
                'qty' => 2, 
                'dim1' => $height, 
                'dim2' => $depth, 
                'material' => $material
            ]; 
        }
        
        if ($width > 0 && $depth > 0) { 
            $parts[] = [
                'name' => 'Bovenplank', 
                'qty' => 1, 
                'dim1' => $width, 
                'dim2' => $depth, 
                'material' => $material
            ]; 
        }
        
        if ($innerWidth > 0 && $depth > 0) { 
            $parts[] = [
                'name' => 'Bodemplank', 
                'qty' => 1, 
                'dim1' => $innerWidth, 
                'dim2' => $depth - $thickness, 
                'material' => $material
            ]; 
        } else { 
            $parts[] = [
                'name' => 'Bodemplank', 
                'qty' => 1, 
                'dim1' => $width, 
                'dim2' => $depth, 
                'material' => $material
            ];
        }
        
        if ($shelvesPerCompartment > 0 && $compartmentInnerWidth > 0 && $innerDepth > 0) { 
            $parts[] = [
                'name' => 'Legplank', 
                'qty' => $totalShelfCount, 
                'dim1' => $compartmentInnerWidth, 
                'dim2' => $innerDepth, 
                'material' => $material
            ]; 
        }
        
        if ($dividers > 0 && $dividerHeight > 0 && $innerDepth > 0) { 
            $parts[] = [
                'name' => 'Tussenschot', 
                'qty' => $dividers, 
                'dim1' => $dividerHeight, 
                'dim2' => $innerDepth, 
                'material' => $material
            ]; 
        }
        
        if ($innerWidth > 0 && $kickboardHeight > 0) { 
            $parts[] = [
                'name' => 'Kickboard (plint)', 
                'qty' => 1, 
                'dim1' => $innerWidth, 
                'dim2' => $kickboardHeight, 
                'material' => $material
            ]; 
        }
        
        $backWidth = $width - (2 * 0.9); 
        $backHeight = $height - (2 * 0.9);
        
        if ($backWidth > 0 && $backHeight > 0) { 
            $parts[] = [
                'name' => 'Achterwand', 
                'qty' => 1, 
                'dim1' => $backWidth, 
                'dim2' => $backHeight, 
                'material' => 'HDF 3mm'
            ]; 
        }

        // Bereken dimensies string voor elk onderdeel
        foreach ($parts as $i => $part) { 
            if (isset($part['dim1']) && isset($part['dim2'])) { 
                $parts[$i]['dimensions'] = sprintf("%.1f x %.1f cm", $part['dim1'], $part['dim2']); 
            } else { 
                $parts[$i]['dimensions'] = 'N/A'; 
            } 
        }
    } catch (\Throwable $e) { 
        error_log("Error inside generatePartsList: " . $e->getMessage()); 
        return []; 
    }
    return $parts;
}

function formatPartsListForEmail(array $partsList): string {
    $output = "Onderdelenlijst:\n";
    $output .= "--------------------------------------------------\n";
    $output .= str_pad("Aantal", 8) . str_pad("Onderdeel", 25) . str_pad("Afmeting", 20) . "Materiaal\n";
    $output .= "--------------------------------------------------\n";
    
    if (empty($partsList)) {
        $output .= "Geen onderdelen gegenereerd.\n";
    } else {
        foreach ($partsList as $part) {
            $qty = isset($part['qty']) ? $part['qty'] . 'x' : '?x';
            $name = $part['name'] ?? 'Onbekend';
            $dims = $part['dimensions'] ?? 'N/A';
            $mat = $part['material'] ?? '?';
            
            try { 
                $output .= str_pad((string)$qty, 8) . str_pad((string)$name, 25) . str_pad((string)$dims, 20) . (string)$mat . "\n"; 
            } catch (\Throwable $e_strpad) { 
                error_log("Error formatting part: " . $e_strpad->getMessage()); 
                $output .= "Error formatting part\n"; 
            }
        }
    }
    
    $output .= "--------------------------------------------------\n";
    return $output;
}