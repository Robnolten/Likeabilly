<?php
// /api/create-payment.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Voor lokale ontwikkeling, pas dit aan in productie
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Afhandelen van preflight OPTIONS verzoeken
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log de ontvangen gegevens (voor debugging)
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);
error_log('Ontvangen bestelgegevens: ' . print_r($input, true));

// Controleer of het een POST verzoek is
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode([
        'success' => false,
        'message' => 'Alleen POST verzoeken zijn toegestaan'
    ]);
    exit;
}

// Simuleer een succesvolle respons met een unieke sessionId
echo json_encode([
    'success' => true,
    'sessionId' => 'test_' . uniqid(),
    'message' => 'Mock betaalsessie aangemaakt'
]);