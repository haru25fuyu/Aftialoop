<?php
header("Access-Control-Allow-Origin: https://dev.aftialoop.com");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$baseDir = realpath(__DIR__ . '/../');
$input = json_decode(file_get_contents('php://input'), true);
$relPath = $input['path'] ?? '';
$content = $input['content'] ?? '';

$targetPath = realpath($baseDir . '/' . $relPath);

// セキュリティチェック
if (!$targetPath || strpos($targetPath, $baseDir) !== 0) {
    http_response_code(403);
    echo "Access denied";
    exit;
}

// 書き込み実行
file_put_contents($targetPath, $content);
echo "Saved successfully";