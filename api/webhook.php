<?php
// api/webhook.php
// Webhook endpoint om Mollie betalingsstatus-updates te verwerken

// Error logging configureren (optioneel, afhankelijk van je error logging configuratie)
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);
ini_set('error_log', __DIR__ . '/webhook_error.log');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Enkel POST requests toestaan
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method.']);
    exit;
}

// Lees de JSON payload van Mollie
$inputJSON = file_get_contents('php://input');
$data = json_decode($inputJSON, true);

if (!$data || !isset($data['id'])) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid payload or missing payment id.']);
    exit;
}

$paymentId = $data['id'];
error_log("Webhook triggered for payment ID: " . $paymentId);

// Initializeer de Mollie API client
$mollieApiKey = 'test_QEq8MPduhc5wD6K3EWwrwTHCx7RWjs';
$mollie = new \Mollie\Api\MollieApiClient();
$mollie->setApiKey($mollieApiKey);

try {
    // Haal de betaling op
    $payment = $mollie->payments->get($paymentId);
    $status = $payment->status; // Voorbeeld: "paid", "failed", "open", etc.
    error_log("Retrieved payment status: " . $status);

    // Haal de order ID op uit de payment metadata
    if (isset($payment->metadata->order_id)) {
        $orderId = $payment->metadata->order_id;
    } else {
        error_log("Webhook Error: Order ID not found in payment metadata.");
        $orderId = null;
    }

    // Als een order ID beschikbaar is, werk de order in de database bij
    if ($orderId) {
        // Database configuratie (zorg dat deze overeenkomt met wat je in orders.php gebruikt)
        $db_host = 'localhost';
        $db_port = '3306';
        $db_name = 'likeabilly_db';
        $db_user = 'root';
        $db_pass = 'root';
        $charset = 'utf8mb4';
        $dsn = "mysql:host=$db_host;port=$db_port;dbname=$db_name;charset=$charset";

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];

        $pdo = new PDO($dsn, $db_user, $db_pass, $options);

        // Werk orderstatus bij op basis van de Mollie betalingsstatus
        $sql = "UPDATE orders SET status = :status WHERE id = :order_id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':status' => $status, 
            ':order_id' => $orderId
        ]);
        error_log("Webhook updated order ID {$orderId} with status: {$status}");
    } else {
        error_log("Webhook Warning: No order ID to update.");
    }

    // Stuur een 200 OK response terug naar Mollie
    http_response_code(200);
    echo json_encode(['status' => 'success', 'message' => 'Webhook processed successfully.']);
    exit;
} catch (Exception $e) {
    error_log("Webhook error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Webhook processing failed.']);
    exit;
}