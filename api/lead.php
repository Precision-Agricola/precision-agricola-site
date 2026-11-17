<?php
/**
 * POST /api/lead.php — reenvía un lead al Google Form desde el servidor para
 * poder leer el código de respuesta. Portado de
 * themes/precision-agricola/pages/api-lead.htm (PR #41) como PHP suelto, sin
 * October, para que el sitio de Astro no dependa de él.
 *
 * Desde el navegador solo se puede enviar con fetch no-cors, cuya respuesta es
 * opaca: si Google rechazaba el envío (un entry.* que cambió, una opción
 * obligatoria que ya no existe), el visitante veía "gracias" y el lead se
 * perdía sin aviso (issue #35).
 *
 * Respuestas:
 *   200 {ok: true}                        Google aceptó la respuesta
 *   422 {ok: false, motivo: rechazado}    Google la rechazó: el formulario muestra error
 *   502 {ok: false, motivo: sin_conexion} no se pudo hablar con Google
 *   429 / 405 / 400                       el navegador cae al envío directo
 *
 * Solo 422 cambia lo que ve el visitante; todo lo demás deja que el navegador
 * envíe directo, como antes. Así este archivo nunca puede empeorar la captura.
 *
 * Prueba (debe responder 400 {"ok":false,"motivo":"vacio"} sin tocar el Form):
 *   curl -i -X POST -d 'foo=bar' https://beta.precisionagricola.com/api/lead.php
 */

// Misma URL que usa el sitio, ofuscada igual que allí (el repositorio es público).
const FORM_URL_B64 = 'aHR0cHM6Ly9kb2NzLmdvb2dsZS5jb20vZm9ybXMvZC9lLzFGQUlwUUxTZHVGVUxzSElVdmhQN1NBdGZPb1Y0MjJWTzVIUTVBNnZnQjVKMXQxV3k1ekZtcWV3L2Zvcm1SZXNwb25zZQ==';

// Un visitante real manda uno o dos; esto solo frena abuso del reenvío.
const MAX_POR_IP = 8;
const VENTANA_SEG = 600;
const MAX_CAMPOS = 30;
const MAX_LARGO = 4000;

function responder($datos, $estado = 200)
{
    http_response_code($estado);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex');
    echo json_encode($datos);
    exit;
}

/** Cuenta envíos por IP en archivos temporales; true si ya pasó el límite. */
function excedeLimite($ip)
{
    $archivo = sys_get_temp_dir() . '/pa_lead_' . sha1($ip . __FILE__);
    $ahora = time();
    $marcas = [];
    if (is_file($archivo)) {
        $marcas = array_filter(
            array_map('intval', explode(',', (string) @file_get_contents($archivo))),
            function ($t) use ($ahora) { return $t > $ahora - VENTANA_SEG; }
        );
    }
    if (count($marcas) >= MAX_POR_IP) {
        return true;
    }
    $marcas[] = $ahora;
    @file_put_contents($archivo, implode(',', $marcas), LOCK_EX);

    return false;
}

/**
 * PHP convierte los puntos de los nombres de campo en guiones bajos
 * (entry.123 → entry_123), así que el cuerpo se lee crudo. Solo pasan campos
 * entry.* del Form; se conservan repetidos y su orden.
 */
function camposDelForm($crudo)
{
    $pares = [];
    foreach (explode('&', (string) $crudo) as $par) {
        if ($par === '') continue;
        $partes = explode('=', $par, 2);
        $clave = urldecode($partes[0]);
        $valor = urldecode(isset($partes[1]) ? $partes[1] : '');
        if (!preg_match('/^entry\.\d+(\.other_option_response)?$/', $clave)) continue;
        $pares[] = [$clave, mb_substr($valor, 0, MAX_LARGO)];
        if (count($pares) >= MAX_CAMPOS) break;
    }

    return $pares;
}

function armarCuerpo($pares)
{
    return implode('&', array_map(function ($p) {
        return rawurlencode($p[0]) . '=' . rawurlencode($p[1]);
    }, $pares));
}

/** Código HTTP de Google, o 0 si no hubo conexión. */
function enviar($url, $cuerpo)
{
    if (!function_exists('curl_init')) {
        return 0;
    }
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $cuerpo,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT        => 8,
        CURLOPT_USERAGENT      => 'PrecisionAgricola/1.0 (+https://www.precisionagricola.com)',
    ]);
    curl_exec($ch);
    $codigo = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return $codigo;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    responder(['ok' => false, 'motivo' => 'metodo'], 405);
}

if (excedeLimite((string) ($_SERVER['REMOTE_ADDR'] ?? ''))) {
    responder(['ok' => false, 'motivo' => 'limite'], 429);
}

$pares = camposDelForm(file_get_contents('php://input'));
if (!$pares) {
    responder(['ok' => false, 'motivo' => 'vacio'], 400);
}

$codigo = enviar(base64_decode(FORM_URL_B64), armarCuerpo($pares));

if ($codigo >= 200 && $codigo < 300) {
    responder(['ok' => true]);
}
if ($codigo >= 400 && $codigo < 500) {
    // Sin valores: son datos personales. Las claves bastan para ver qué cambió.
    error_log('api/lead: el Google Form rechazó un lead (HTTP ' . $codigo . '). Campos: '
        . implode(', ', array_unique(array_column($pares, 0))));
    responder(['ok' => false, 'motivo' => 'rechazado'], 422);
}

error_log('api/lead: no se pudo contactar al Google Form (código ' . $codigo . ').');
responder(['ok' => false, 'motivo' => 'sin_conexion'], 502);
