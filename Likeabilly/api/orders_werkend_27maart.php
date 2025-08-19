<?php
// api/orders.php
// Pad naar Composer autoloader (vanuit /httpdocs/api/ naar /httpdocs/vendor/autoload.php)
$autoloaderPath = __DIR__ . '/../vendor/autoload.php';

// Controleer of de autoloader bestaat voordat we hem includen
if (!file_exists($autoloaderPath)) {
    // Headers zijn nog niet gezet, dus we kunnen ze nu zetten voor de foutmelding
    http_response_code(500); // Internal Server Error
    header('Content-Type: application/json');
    // Sta CORS toe voor de foutmelding
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    echo json_encode([
        'status' => 'error',
        'message' => 'FATAL ERROR: Composer autoloader not found.',
        'checked_path' => realpath(__DIR__ . '/..') . '/vendor/autoload.php' // Toon het volledige pad dat gecheckt is
    ]);
    exit; // Stop direct, verder gaan heeft geen zin
}
// Als het bestand bestaat, laad het dan
require $autoloaderPath;

// Gebruik de PHPMailer classes (nodig voor later)
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

// --- Database Configuratie ---
$db_host = 'localhost';
$db_name = 'likeabilly';
$db_user = 'robnolten';
$db_pass = 'jg247A9e~'; 
$db_charset = 'utf8mb4';
// ---------------------------

// Standaard headers
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Aanpassen voor productie!
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Preflight request afhandelen
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check request methode
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method. Only POST is allowed.']);
    exit();
}

// Ontvang en decodeer JSON data
$jsonPayload = file_get_contents('php://input');
$data = json_decode($jsonPayload, true);

// Validatie van JSON
if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON received: ' . json_last_error_msg()]);
    exit();
}
if (empty($data) || !isset($data['configuration']) || !isset($data['customer'])) {
     http_response_code(400);
     echo json_encode(['status' => 'error', 'message' => 'Incomplete data received. Missing configuration or customer info.']);
     exit();
}

// --- Database Verbinding & Data Opslag ---
$dsn = "mysql:host=$db_host;dbname=$db_name;charset=$db_charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

$orderId = null; // Initialiseer orderId

try {
     // 1. Maak verbinding
     $pdo = new PDO($dsn, $db_user, $db_pass, $options);

     // 2. Haal data uit de ontvangen array
     $customer = $data['customer'];
     $config = $data['configuration'];

     // 3. Bereid data voor
     $configJson = json_encode($config);
     $price = $config['calculatedPrice'] ?? 0.00;

     // 4. Bereid SQL INSERT statement voor
     $sql = "INSERT INTO orders (
                 customer_name, customer_email, customer_address, customer_zip,
                 customer_city, customer_phone, customer_notes, create_account,
                 configuration_json, price, status, order_date
             ) VALUES (
                 :name, :email, :address, :zip,
                 :city, :phone, :notes, :create_account,
                 :config_json, :price, :status, NOW()
             )";
     $stmt = $pdo->prepare($sql);

     // 5. Bind waarden (gebruik execute met array)
     $status_default = 'received';
     $create_account_bool = !empty($customer['createAccount']);
     $customer_phone = $customer['phone'] ?? null;
     $customer_notes = $customer['notes'] ?? null;

     $params = [
         ':name' => $customer['name'],
         ':email' => $customer['email'],
         ':address' => $customer['address'],
         ':zip' => $customer['zip'],
         ':city' => $customer['city'],
         ':phone' => $customer_phone,
         ':notes' => $customer_notes,
         ':create_account' => $create_account_bool ? 1 : 0, // Boolean naar 0/1
         ':config_json' => $configJson,
         ':price' => $price,
         ':status' => $status_default
     ];

     // 6. Voer het statement uit
     $stmt->execute($params);

     // 7. Haal het ID van de zojuist ingevoegde order op
     $orderId = $pdo->lastInsertId();

    // $config = $data['configuration']; // Is al beschikbaar
    // $customer = $data['customer']; // Is al beschikbaar
    $partsListArray = generatePartsList($config);
    $partsListString = formatPartsListForEmail($partsListArray);
    
// --- START E-MAIL BLOK ---
$successMessage = 'Order saved (Email status unknown).'; // Default bericht
$mail = new PHPMailer(true); // Enable exceptions

try {
    // --- Server settings ---
    // $mail->SMTPDebug = SMTP::DEBUG_SERVER; // Zet aan voor uitgebreide logs bij problemen
    $mail->isSMTP();
    $mail->Host       = 'mail.hostingserver.nl';         // Je domein of specifieke SMTP host provider
    $mail->SMTPAuth   = true;
    $mail->Username   = 'rob@likeabilly.nl';     // Je e-mailadres account op de server
    $mail->Password   = '55!ejWo21';
    $mail->CharSet    = 'UTF-8';                 // Voor correcte weergave tekens

    // --- KIES DE JUISTE POORT & ENCRYPTIE (Controleer bij hoster!) ---
    // Optie 1: Poort 465 met SMTPS (SSL/TLS) - Vaak gebruikt
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS; // Probeer eerst STARTTLS
    $mail->Port       = 465;                          // Poort van je hoster

    // Optie 2: Poort 587 met STARTTLS - Ook vaak gebruikt
    // Haal commentaar weg bij volgende 2 regels als je 587 gebruikt, en commentarieer 465/SMTPS uit
    // $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    // $mail->Port       = 587;
    // ---------------------------------------------------------------

    // --- Ontvanger(s) & Afzender ---
    // Gebruik een afzenderadres van je eigen domein (@likeabilly.nl) ivm spamfilters
    $mail->setFrom('rob@likeabilly.nl', 'Likeabilly Webshop');
    // Optioneel: waar antwoorden naartoe moeten
    // $mail->addReplyTo('info@likeabilly.nl', 'Informatie');
    // De ontvanger (meubelmaker) - gebruik het juiste adres
    $mail->addAddress('rob@likeabilly.nl', 'Meubelmaker Rob'); // Test: stuur naar jezelf

    // --- Inhoud ---
    $mail->isHTML(false); // Plain text e-mail
    $mail->Subject = "Nieuwe Likeabilly Bestelling: #" . $orderId;

    // Stel de body samen
    $mailBody = "Nieuwe bestelling ontvangen (ID: {$orderId})\n\n";
    $mailBody .= "Klantgegevens:\n";
    $mailBody .= "Naam: " . ($customer['name'] ?? 'n.v.t.') . "\n";
    $mailBody .= "E-mail: " . ($customer['email'] ?? 'n.v.t.') . "\n";
    $mailBody .= "Adres: " . ($customer['address'] ?? 'n.v.t.') . "\n";
    $mailBody .= "Postcode: " . ($customer['zip'] ?? 'n.v.t.') . "\n";
    $mailBody .= "Plaats: " . ($customer['city'] ?? 'n.v.t.') . "\n";
    $mailBody .= "Telefoon: " . ($customer['phone'] ?? 'n.v.t.') . "\n";
    $mailBody .= "Account aanmaken: " . ($customer['createAccount'] ? 'Ja' : 'Nee') . "\n"; // Toegevoegd
    $mailBody .= "Opmerkingen: " . (!empty($customer['notes']) ? $customer['notes'] : 'Geen') . "\n\n";

    $mailBody .= "Configuratie Overzicht:\n";
    $mailBody .= "- Breedte: " . ($config['inputWidth'] ?? '?') . " cm, Hoogte: " . ($config['inputHeight'] ?? '?') . " cm, Diepte: " . ($config['inputDepth'] ?? '?') . " cm\n";
    $mailBody .= "- Materiaal: " . ($config['material'] ?? '?') . "\n";
    $mailBody .= "- Aantal Planken: " . ($config['calculatedTotalShelfCount'] ?? '?') . "\n";
    $mailBody .= "- Tussenschotten: " . ($config['calculatedNumberOfDividers'] ?? '?') . "\n";
    $mailBody .= "- Indeling: " . (isset($config['isCustomLayout']) && $config['isCustomLayout'] ? 'Aangepast' : 'Standaard') . "\n";
    $mailBody .= "- Prijs: Euro " . ($config['calculatedPrice'] ?? '?') . "\n\n";

    $mailBody .= $partsListString; // Voeg de onderdelenlijst string toe

    $mail->Body = $mailBody;

    // Verstuur de e-mail
    $mail->send();
    $successMessage = 'Order saved and production email sent.'; // Update bericht bij succes

        } catch (Exception $e_mail) {
            // Log de fout server-side
            error_log("Mailer Error for Order {$orderId}: {$mail->ErrorInfo}");
            // Update bericht bij mislukken (script gaat wel door!)
            $successMessage = 'Order saved BUT production email failed! Check server logs.';
        }
    // --- EINDE E-MAIL BLOK ---


     // 8. Stuur succesvol antwoord terug
     http_response_code(200);
     echo json_encode([
         'status' => 'success',
         'message' => $successMessage, // Gebruik de variabele uit het mailblok
         'orderId' => $orderId
     ]);
     exit;

} catch (\PDOException $e) {
     // Vang database fouten op
     http_response_code(500);
     error_log("Database Error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
     // Stuur TIJDELIJKE gedetailleerde fout
     echo json_encode([
         'status' => 'error',
         'message' => 'Database Error: ' . $e->getMessage() // TEMPORARY!
     ]);
     exit();
} catch (\Throwable $e) {
    // Vang andere onverwachte fouten op
     http_response_code(500);
     error_log("General Error: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
     // Stuur TIJDELIJKE gedetailleerde fout
     echo json_encode([
         'status' => 'error',
         'message' => 'General Error: ' . $e->getMessage() // TEMPORARY!
     ]);
     exit();
}

// --- FUNCTIE DEFINITIES ---

/**
 * Genereert onderdelenlijst (AANNAMES!) - Controleer/Pas aan!
 */
function generatePartsList(array $config): array {
    $parts = [];
    $width = floatval($config['inputWidth'] ?? 80);
    $height = floatval($config['inputHeight'] ?? 200);
    $depth = floatval($config['inputDepth'] ?? 40);
    $material = $config['material'] ?? 'onbekend';
    $shelvesPerCompartment = intval($config['shelvesPerCompartment'] ?? 0);
    $dividers = intval($config['calculatedNumberOfDividers'] ?? 0);
    $thickness = floatval($config['shelfThickness'] ?? 1.8);
    $kickboardHeight = floatval($config['kickboardHeight'] ?? 10);

    $innerWidth = $width - (2 * $thickness);
    $innerDepth = $depth - $thickness; // Aanname
    $dividerHeight = $height - 2 * $thickness; // Aanname
    $compartmentInnerWidth = $dividers > 0 ? ($innerWidth - ($dividers * $thickness)) / ($dividers + 1) : $innerWidth;
    $totalShelfCount = $shelvesPerCompartment * ($dividers + 1);

    $parts[] = ['name' => 'Zijpaneel', 'qty' => 2, 'dim1' => $height, 'dim2' => $depth, 'material' => $material];
    $parts[] = ['name' => 'Bovenplank', 'qty' => 1, 'dim1' => $width, 'dim2' => $depth, 'material' => $material];
    $parts[] = ['name' => 'Bodemplank', 'qty' => 1, 'dim1' => $width, 'dim2' => $depth, 'material' => $material]; // Check of dit klopt tov innerWidth/innerDepth
    if ($shelvesPerCompartment > 0) { $parts[] = ['name' => 'Legplank', 'qty' => $totalShelfCount, 'dim1' => $compartmentInnerWidth, 'dim2' => $innerDepth, 'material' => $material]; }
    if ($dividers > 0) { $parts[] = ['name' => 'Tussenschot', 'qty' => $dividers, 'dim1' => $dividerHeight, 'dim2' => $innerDepth, 'material' => $material]; }
    $parts[] = ['name' => 'Kickboard (plint)', 'qty' => 1, 'dim1' => $innerWidth, 'dim2' => $kickboardHeight, 'material' => $material];
    $backWidth = $width - (2 * 0.9); $backHeight = $height - (2 * 0.9); // Aanname sponning
    $parts[] = ['name' => 'Achterwand', 'qty' => 1, 'dim1' => $backWidth, 'dim2' => $backHeight, 'material' => 'HDF 3mm'];

    foreach ($parts as $i => $part) {
        if (isset($part['dim1']) && isset($part['dim2'])) { $parts[$i]['dimensions'] = sprintf("%.1f x %.1f cm", $part['dim1'], $part['dim2']); }
        else { $parts[$i]['dimensions'] = 'N/A'; }
    }
    return $parts;
}

/**
 * Formatteert onderdelenlijst voor e-mail
 */
function formatPartsListForEmail(array $partsList): string {
    $output = "Onderdelenlijst:\n--------------------------------------------------\n";
    $output .= str_pad("Aantal", 8) . str_pad("Onderdeel", 25) . str_pad("Afmeting", 20) . "Materiaal\n";
    $output .= "--------------------------------------------------\n";
    foreach ($partsList as $part) {
        $output .= str_pad(($part['qty'] ?? '?') . "x", 8);
        $output .= str_pad($part['name'] ?? 'Onbekend', 25);
        $output .= str_pad($part['dimensions'] ?? 'N/A', 20);
        $output .= ($part['material'] ?? '?') . "\n";
    }
    $output .= "--------------------------------------------------\n";
    return $output;
}

// Geen sluitende ?> tag nodig aan het einde van een puur PHP bestand