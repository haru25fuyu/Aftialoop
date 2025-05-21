<?php
header("Access-Control-Allow-Origin: https://dev.animaloop.jp");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");

$baseDir = realpath(__DIR__ . '/../');  // ← ここが基準になるルート
$targetDir = isset($_GET['dir']) ? realpath($_GET['dir']) : $baseDir;

if (!$targetDir || strpos($targetDir, $baseDir) !== 0) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid path"]);
    exit;
}

function listDir($dir, $baseDir)
{
    $items = [];
    foreach (scandir($dir) as $item) {
        if ($item === '.' || $item === '..') continue;
        $path = $dir . DIRECTORY_SEPARATOR . $item;
        $isDir = is_dir($path);

        $relativePath = ltrim(str_replace($baseDir, '', realpath($path)), '/');

        $items[] = [
            'name' => $item,
            'path' => $relativePath, // ← 相対パスに変換
            'type' => $isDir ? 'directory' : 'file',
            'children' => $isDir ? listDir($path, $baseDir) : null
        ];
    }
    return $items;
}

header("Content-Type: application/json");
echo json_encode(listDir($targetDir, $baseDir));
