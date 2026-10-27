<?php
// Database settings for api.php.
//
// Defaults match a fresh XAMPP install (user "root", no password).
// On a cloud host, set environment variables instead of editing this file:
//   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS
// or create config.local.php (git-ignored) that returns the same array.

$config = [
    'host' => getenv('DB_HOST') ?: '127.0.0.1',
    'port' => getenv('DB_PORT') ?: '3306',
    'name' => getenv('DB_NAME') ?: 'library_db',
    'user' => getenv('DB_USER') ?: 'root',
    'pass' => getenv('DB_PASS') !== false ? getenv('DB_PASS') : '',
];

$local = __DIR__ . '/config.local.php';
if (is_file($local)) {
    $config = array_merge($config, require $local);
}

return $config;
