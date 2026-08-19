#!/usr/bin/env bash
#
# bootstrap.sh — deja este proyecto listo para trabajar en una máquina nueva.
#
#   bash .claude/skills/setup-local/scripts/bootstrap.sh              # instalacion completa
#   bash .claude/skills/setup-local/scripts/bootstrap.sh --skip-db    # sin tocar MySQL (ver nota)
#   bash .claude/skills/setup-local/scripts/bootstrap.sh --port 8080  # otro puerto para la prueba
#
# Es idempotente: correlo las veces que haga falta, no rompe lo que ya este bien.
# Cuando algo falla, dice exactamente que hacer a mano.
#
# Nota sobre --skip-db: MySQL hace falta aunque el sitio publico no muestre
# datos. Con la base caida y la cache fria, October se cuelga intentando
# conectarse y paginas como / y /bioreactores no llegan a responder.

set -uo pipefail

SKIP_DB=0
PORT=8877
DB_NAME="precision_agricola"

while [ $# -gt 0 ]; do
    case "$1" in
        --skip-db) SKIP_DB=1; shift ;;
        --port)    PORT="${2:-8877}"; shift 2 ;;
        --db-name) DB_NAME="${2:-precision_agricola}"; shift 2 ;;
        -h|--help) sed -n '2,14p' "$0"; exit 0 ;;
        *) echo "Opcion desconocida: $1"; exit 2 ;;
    esac
done

N_OK=0
N_AVISO=0
N_FALLA=0

ok()     { printf '  [ok]    %s\n' "$*"; N_OK=$((N_OK+1)); }
aviso()  { printf '  [aviso] %s\n' "$*"; N_AVISO=$((N_AVISO+1)); }
falla()  { printf '  [FALLA] %s\n' "$*"; N_FALLA=$((N_FALLA+1)); }
info()   { printf '          %s\n' "$*"; }
titulo() { printf '\n== %s ==\n' "$*"; }

# ---------------------------------------------------------------
# 0. Raiz del repositorio
# ---------------------------------------------------------------
titulo "0. Ubicacion del proyecto"
RAIZ="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$RAIZ" ] || [ ! -f "$RAIZ/artisan" ]; then
    falla "No estamos dentro del repositorio."
    info  "Situate en la carpeta del proyecto (la que contiene 'artisan') y repite."
    exit 1
fi
cd "$RAIZ" || exit 1
ok "Repositorio en $RAIZ"

case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*) ES_WINDOWS=1 ;;
    *) ES_WINDOWS=0 ;;
esac

# ---------------------------------------------------------------
# 1. Interprete de PHP
#    October CMS 2.x corre sobre Laravel 6, que soporta PHP 7.2 a 8.0.
#    PHP 8.1 o superior NO sirve. Lo probado en este proyecto es 7.4.
# ---------------------------------------------------------------
titulo "1. PHP"

version_de() { "$1" -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;' 2>/dev/null; }

sirve() {
    case "$(version_de "$1")" in
        7.2|7.3|7.4|8.0) return 0 ;;
        *) return 1 ;;
    esac
}

CANDIDATOS=""
[ -n "${PA_PHP:-}" ] && CANDIDATOS="$CANDIDATOS $PA_PHP"
if command -v php >/dev/null 2>&1; then
    CANDIDATOS="$CANDIDATOS $(command -v php)"
fi
for patron in \
    /c/laragon/bin/php/php-7.4*/php.exe \
    /c/laragon/bin/php/*/php.exe \
    /c/xampp/php/php.exe \
    /c/wamp64/bin/php/php7.4*/php.exe \
    /opt/homebrew/opt/php@7.4/bin/php \
    /usr/local/opt/php@7.4/bin/php \
    /usr/bin/php7.4 \
    /usr/bin/php
do
    [ -x "$patron" ] && CANDIDATOS="$CANDIDATOS $patron"
done

PHP_BIN=""
# Preferimos 7.4 exacto, que es lo que corre en produccion.
for c in $CANDIDATOS; do
    if [ "$(version_de "$c")" = "7.4" ]; then PHP_BIN="$c"; break; fi
done
if [ -z "$PHP_BIN" ]; then
    for c in $CANDIDATOS; do
        if sirve "$c"; then PHP_BIN="$c"; break; fi
    done
fi

if [ -z "$PHP_BIN" ]; then
    falla "No encontre un PHP utilizable (hace falta 7.2 a 8.0; lo probado es 7.4)."
    info  "Instala Laragon en Windows, o 'brew install php@7.4' en macOS."
    info  "Si ya lo tienes en otra ruta:  PA_PHP=/ruta/a/php bash $0"
    exit 1
fi
ok "PHP $("$PHP_BIN" -r 'echo PHP_VERSION;') en $PHP_BIN"

FALTANTES=""
for ext in pdo_mysql mbstring curl gd openssl json fileinfo zip tokenizer xml ctype; do
    "$PHP_BIN" -m 2>/dev/null | grep -qi "^${ext}$" || FALTANTES="$FALTANTES $ext"
done
if [ -n "$FALTANTES" ]; then
    aviso "Faltan extensiones de PHP:$FALTANTES"
    info  "Activalas en el php.ini de esa instalacion y repite."
else
    ok "Extensiones de PHP completas"
fi

# ---------------------------------------------------------------
# 2. Atajos php / artisan
#    La ruta a php.exe cambia en cada maquina. En vez de editar
#    .claude/launch.json (versionado, provoca conflictos), creamos
#    atajos locales que .gitignore ya ignora.
# ---------------------------------------------------------------
titulo "2. Atajos locales de php y artisan"
if [ "$ES_WINDOWS" = "1" ]; then
    RUTA_WIN="$(cygpath -w "$PHP_BIN" 2>/dev/null || echo "$PHP_BIN")"
    printf '@echo off\r\n"%s" %%*\r\n' "$RUTA_WIN" > php.bat
    printf '@echo off\r\n"%s" artisan %%*\r\n' "$RUTA_WIN" > artisan.bat
    ok "php.bat y artisan.bat creados (git los ignora)"
    info "Desde ahora puedes escribir:  .\\artisan.bat serve"
else
    ok "En macOS o Linux no hacen falta atajos"
    info "Usa directamente:  $PHP_BIN artisan serve"
fi

# ---------------------------------------------------------------
# 3. Dependencias
#    vendor/ esta versionado en este repo, asi que NO se corre
#    composer install. Solo comprobamos que llego completo.
# ---------------------------------------------------------------
titulo "3. Dependencias"
if [ -f vendor/autoload.php ] && [ -d vendor/laravel/framework ]; then
    ok "vendor/ presente (viene versionado, no hace falta composer install)"
else
    falla "Falta vendor/ o esta incompleto."
    info  "Deberia venir en el clon. Prueba:  git checkout -- vendor"
fi

# ---------------------------------------------------------------
# 4. Archivo .env
# ---------------------------------------------------------------
titulo "4. Configuracion (.env)"
if [ -f .env ]; then
    ok ".env ya existe (no lo toco)"
else
    {
        echo 'APP_NAME="Precision Agricola"'
        echo 'APP_ENV=local'
        echo 'APP_KEY='
        echo 'APP_DEBUG=true'
        echo "APP_URL=http://localhost:$PORT"
        echo 'APP_LOCALE=es'
        echo ''
        echo '# Sin esto se sirve el tema "demo" de October en vez del sitio real.'
        echo 'ACTIVE_THEME=precision-agricola'
        echo ''
        echo 'BACKEND_URI=/backend'
        echo 'CMS_ROUTE_CACHE=false'
        echo 'CMS_ASSET_CACHE=false'
        echo ''
        echo 'DB_CONNECTION=mysql'
        echo 'DB_HOST=127.0.0.1'
        echo 'DB_PORT=3306'
        echo "DB_DATABASE=$DB_NAME"
        echo 'DB_USERNAME=root'
        echo 'DB_PASSWORD='
        echo ''
        echo 'LOG_CHANNEL=single'
        echo 'CACHE_DRIVER=file'
        echo 'QUEUE_CONNECTION=sync'
        echo 'SESSION_DRIVER=file'
        echo 'MAIL_MAILER=log'
    } > .env
    ok ".env creado"
fi

if grep -q '^ACTIVE_THEME=precision-agricola' .env; then
    ok "ACTIVE_THEME apunta al tema correcto"
else
    aviso "ACTIVE_THEME no es 'precision-agricola': veras el tema demo de October"
    info  "Corrigelo en .env"
fi

if grep -qE '^APP_KEY=base64:.+' .env; then
    ok "APP_KEY ya generada"
elif "$PHP_BIN" artisan key:generate >/dev/null 2>&1 && grep -qE '^APP_KEY=base64:.+' .env; then
    ok "APP_KEY generada"
else
    falla "No se pudo generar APP_KEY"
    info  "Correlo a mano:  $PHP_BIN artisan key:generate"
fi

# ---------------------------------------------------------------
# 5. Permisos de escritura
# ---------------------------------------------------------------
titulo "5. Carpetas de escritura"
SIN_PERMISO=""
for d in storage storage/framework storage/cms storage/logs; do
    mkdir -p "$d" 2>/dev/null
    [ -w "$d" ] || SIN_PERMISO="$SIN_PERMISO $d"
done
if [ -n "$SIN_PERMISO" ]; then
    falla "Sin permiso de escritura en:$SIN_PERMISO"
    info  "En macOS o Linux:  chmod -R ug+w storage"
else
    ok "storage/ escribible"
fi

# ---------------------------------------------------------------
# 6. Base de datos
#    Hace falta aunque el sitio publico no muestre datos: con MySQL
#    caido y la cache fria, October se cuelga al arrancar y paginas
#    como / y /bioreactores nunca llegan a responder.
#
#    El nombre sale de .env, que es lo que october:migrate va a leer.
#    Usar otro aqui crearia una base y migraria en otra distinta.
# ---------------------------------------------------------------
titulo "6. Base de datos"
DB_NAME="$(grep -E '^DB_DATABASE=' .env | head -1 | cut -d= -f2- | tr -d '\r' | tr -d '"')"
[ -n "$DB_NAME" ] || DB_NAME="precision_agricola"

if [ "$SKIP_DB" = "1" ]; then
    aviso "Omitida a peticion tuya (--skip-db)"
    info  "Si / o /bioreactores se cuelgan, es por esto: arranca MySQL y repite sin --skip-db"
else
    MYSQL_BIN=""
    if command -v mysql >/dev/null 2>&1; then MYSQL_BIN="$(command -v mysql)"; fi
    if [ -z "$MYSQL_BIN" ]; then
        for c in /c/laragon/bin/mysql/*/bin/mysql.exe /usr/local/mysql/bin/mysql; do
            [ -x "$c" ] && { MYSQL_BIN="$c"; break; }
        done
    fi

    if [ -z "$MYSQL_BIN" ]; then
        falla "No encontre el cliente de MySQL."
        info  "En Laragon viene incluido; asegurate de haber iniciado los servicios."
    elif ! "$MYSQL_BIN" -u root -e "SELECT 1" >/dev/null 2>&1; then
        falla "MySQL no responde en localhost:3306."
        info  "Abre Laragon y pulsa 'Iniciar todo', luego repite."
    else
        ok "MySQL responde"
        if "$MYSQL_BIN" -u root -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >/dev/null 2>&1; then
            ok "Base '$DB_NAME' lista"
            if "$PHP_BIN" artisan october:migrate >/dev/null 2>&1; then
                ok "Tablas de October creadas"
                info "Crea tu usuario del panel:  $PHP_BIN artisan october:passwd <usuario> <contrasena>"
            else
                falla "Fallo 'october:migrate'"
                info  "Correlo a mano para ver el error:  $PHP_BIN artisan october:migrate"
            fi
        else
            falla "No pude crear la base '$DB_NAME'"
            info  "Creala a mano y ajusta las DB_* de .env"
        fi
    fi
fi

# ---------------------------------------------------------------
# 7. Prueba de humo: levantar y pedir paginas reales
# ---------------------------------------------------------------
titulo "7. Prueba de humo"
rm -rf storage/cms/cache/* storage/cms/twig/* storage/framework/cache/data/* 2>/dev/null

"$PHP_BIN" artisan serve --port="$PORT" >/tmp/pa-bootstrap-serve.log 2>&1 &
SRV_PID=$!

# El servidor de PHP es de un solo proceso y la primera peticion compila
# plantillas, asi que puede tardar. Esperamos a que acepte conexiones.
for _ in $(seq 1 30); do
    curl -s -m 10 -o /dev/null "http://127.0.0.1:$PORT/" 2>/dev/null && break
    sleep 1
done

FALLOS_HTTP=0
for ruta in / /bioreactores /kit-biorreactor; do
    CODIGO="$(curl -s -m 60 -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT$ruta" 2>/dev/null)"
    if [ "$CODIGO" = "200" ]; then
        ok "$ruta responde 200"
    elif [ "$CODIGO" = "000" ]; then
        falla "$ruta no respondio (se agoto la espera)"
        info  "Casi siempre es MySQL apagado: October se cuelga intentando conectarse."
        info  "Abre Laragon, pulsa 'Iniciar todo' y repite."
        FALLOS_HTTP=1
    else
        falla "$ruta responde $CODIGO"
        info  "Mira el detalle en storage/logs/ y en /tmp/pa-bootstrap-serve.log"
        FALLOS_HTTP=1
    fi
done

if [ "$FALLOS_HTTP" = "0" ]; then
    CUERPO="$(curl -s -m 30 "http://127.0.0.1:$PORT/kit-biorreactor" 2>/dev/null)"
    if echo "$CUERPO" | grep -q 'themes/demo/'; then
        falla "Se esta sirviendo el tema demo"
        info  "Revisa ACTIVE_THEME en .env"
    else
        ok "Se sirve el tema precision-agricola"
    fi
    if echo "$CUERPO" | grep -qE '\{\{|\{%'; then
        aviso "Quedo sintaxis Twig sin procesar en la salida"
    else
        ok "Las plantillas se procesan correctamente"
    fi
fi

kill "$SRV_PID" 2>/dev/null
wait "$SRV_PID" 2>/dev/null

# ---------------------------------------------------------------
titulo "Resumen"
printf '  %s correctos, %s avisos, %s fallos\n' "$N_OK" "$N_AVISO" "$N_FALLA"

if [ "$N_FALLA" -gt 0 ]; then
    printf '\n  Quedaron cosas por resolver. Lee los puntos [FALLA] de arriba\n'
    printf '  y sigue las indicaciones, o consulta reference/manual.md\n\n'
    exit 1
fi

printf '\n  Listo. Levanta el sitio con:\n'
if [ "$ES_WINDOWS" = "1" ]; then
    printf '      .\\artisan.bat serve --port=%s\n' "$PORT"
else
    printf '      %s artisan serve --port=%s\n' "$PHP_BIN" "$PORT"
fi
printf '  y abrelo en http://localhost:%s\n\n' "$PORT"
