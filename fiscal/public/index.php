<?php
declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use Woobar\Fiscal\FiscalApi;

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($path === '/health') {
    echo json_encode([
        'status' => 'ok',
        'lib' => 'sped-nfe',
        'php' => PHP_VERSION,
    ]);
    exit;
}

$token = (string) (getenv('FISCAL_TOKEN') ?: '');
if ($token === '') {
    http_response_code(503);
    echo json_encode(['status' => 'erro', 'codigo' => '0', 'motivo' => 'FISCAL_TOKEN não configurado']);
    exit;
}

$provided = (string) ($_SERVER['HTTP_X_FISCAL_TOKEN'] ?? '');
if (!hash_equals($token, $provided)) {
    http_response_code(401);
    echo json_encode(['status' => 'erro', 'codigo' => '0', 'motivo' => 'Token inválido']);
    exit;
}

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'erro', 'codigo' => '0', 'motivo' => 'Método não permitido']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw !== false && $raw !== null ? $raw : '[]', true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['status' => 'erro', 'codigo' => '0', 'motivo' => 'JSON inválido']);
    exit;
}

try {
    $api = new FiscalApi();
    $result = match ($path) {
        '/status' => $api->status($data),
        '/nfce/emitir' => $api->emitir($data),
        '/nfce/cancelar' => $api->cancelar($data),
        '/nfce/inutilizar' => $api->inutilizar($data),
        default => throw new RuntimeException('Rota não encontrada', 404),
    };
    echo json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    $code = $e->getCode() === 404 ? 404 : 500;
    http_response_code($code);
    echo json_encode([
        'status' => 'erro',
        'codigo' => '0',
        'motivo' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
