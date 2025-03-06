<?php
header('Content-Type: application/json');
include 'config.php';

$email = filter_var($_GET['email'] ?? '', FILTER_SANITIZE_EMAIL);

if (!$email) {
    echo json_encode(['paid' => false, 'status' => 'no_email', 'error' => 'No email provided']);
    exit;
}

$stmt = $pdo->prepare("SELECT payment_status FROM paid_customers WHERE email = ?");
$stmt->execute([$email]);
$result = $stmt->fetch(PDO::FETCH_ASSOC);

if ($result) {
    if ($result['payment_status'] === 'completed') {
        echo json_encode(['paid' => true, 'status' => 'completed']);
    } else {
        echo json_encode(['paid' => false, 'status' => 'pending']);
    }
} else {
    // Neue E-Mail: Als "pending" speichern
    $stmt = $pdo->prepare("INSERT INTO paid_customers (email, payment_status, payment_date) VALUES (?, 'pending', NOW())");
    $stmt->execute([$email]);
    echo json_encode(['paid' => false, 'status' => 'pending']);
}
?>
