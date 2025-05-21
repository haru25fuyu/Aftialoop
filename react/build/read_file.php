<?php
header("Access-Control-Allow-Origin: https://dev.aftialoop.com");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

$baseDir = realpath(__DIR__ . '/../');  // ルートディレクトリ（編集を許可する範囲）
$relPath = $_GET['file'];
$targetPath = realpath($baseDir . '/' . $relPath);

// 安全確認
if (!$targetPath || strpos($targetPath, $baseDir) !== 0) {
  http_response_code(403);
  echo "Access denied";
  exit;
}

if (!file_exists($targetPath)) {
  http_response_code(404);
  echo "Not found";
  exit;
}

echo file_get_contents($targetPath);