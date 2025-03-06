<?php
include 'config.php';

// Sanitize the email from the GET parameter
$email = filter_var($_GET['email'] ?? '', FILTER_SANITIZE_EMAIL);

if ($email) {
    echo "<h1>Thank You for Your Payment!</h1>";
    echo "<p>Please return to the page and re-enter your email to unlock the CSV export.</p>";
    echo "<p>If you encounter any issues, send your Ko-fi transaction ID to <a href='mailto:support@bitlager.de'>support@bitlager.de</a>.</p>";
    echo "<a href='https://json2table.de/?email=" . urlencode($email) . "'>Back to the Page</a>";
} else {
    echo "<p>Error: No email provided.</p>";
}
?>
