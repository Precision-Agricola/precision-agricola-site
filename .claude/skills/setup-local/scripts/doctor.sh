#!/usr/bin/env bash
#
# doctor.sh — diagnostica una instalacion local ya existente.
#
#   bash .claude/skills/setup-local/scripts/doctor.sh
#
# No modifica nada: solo mira y reporta. Uselo cuando el sitio dejo de
# funcionar y no esta claro por que. Para arreglar, corre bootstrap.sh.

set -uo pipefail

ok()     { printf '  [ok]    %s\n' "$*"; }
aviso()  { printf '  [aviso] %s\n' "$*"; }
falla()  { printf '  [FALLA] %s\n' "$*"; }
info()   { printf '          %s\n' "$*"; }
titulo() { printf '\n== %s ==\n' "$*"; }

RAIZ="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$RAIZ" ] || [ ! -f "$RAIZ/artisan" ]; then
    falla "No estamos dentro del repositorio."
    exit 1
fi
cd "$RAIZ" || exit 1

# ---------------------------------------------------------------
titulo "PHP"
PHP_BIN=""
if [ -n "${PA_PHP:-}" ]; then
    PHP_BIN="$PA_PHP"
elif [ -f php.bat ]; then
    # El atajo que dejo bootstrap.sh guarda la ruta buena.
    PHP_BIN="$(sed -n 's/^"\([^"]*\)".*/\1/p' php.bat | head -1)"
    PHP_BIN="$(cygpath -u "$PHP_BIN" 2>/dev/null || echo "$PHP_BIN")"
elif command -v php >/dev/null 2>&1; then
    PHP_BIN="$(command -v php)"
fi

if [ -z "$PHP_BIN" ] || [ ! -x "$PHP_BIN" ]; then
    falla "No hay un PHP localizable."
    info  "Corre bootstrap.sh, que lo busca y crea los atajos."
else
    V="$("$PHP_BIN" -r 'echo PHP_VERSION;' 2>/dev/null)"
    MM="$("$PHP_BIN" -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;' 2>/dev/null)"
    case "$MM" in
        7.4)             ok "PHP $V (la version probada)" ;;
        7.2|7.3|8.0)     aviso "PHP $V — soportada, pero la probada aqui es 7.4" ;;
        *)               falla "PHP $V — Laravel 6 no la soporta; usa 7.4" ;;
    esac
    FALTAN=""
    for ext in pdo_mysql mbstring curl gd openssl json fileinfo zip tokenizer xml ctype; do
        "$PHP_BIN" -m 2>/dev/null | grep -qi "^${ext}$" || FALTAN="$FALTAN $ext"
    done
    [ -n "$FALTAN" ] && falla "Extensiones faltantes:$FALTAN" || ok "Extensiones completas"
fi

# ---------------------------------------------------------------
titulo "Dependencias"
if [ -f vendor/autoload.php ] && [ -d vendor/laravel/framework ]; then
    ok "vendor/ completo (viene versionado)"
else
    falla "vendor/ ausente o incompleto — prueba 'git checkout -- vendor'"
fi

# ---------------------------------------------------------------
titulo "Configuracion"
if [ ! -f .env ]; then
    falla ".env no existe — corre bootstrap.sh"
else
    ok ".env presente"
    grep -qE '^APP_KEY=base64:.+' .env \
        && ok "APP_KEY definida" \
        || falla "APP_KEY vacia — 'artisan key:generate'"
    grep -q '^ACTIVE_THEME=precision-agricola' .env \
        && ok "ACTIVE_THEME correcto" \
        || falla "ACTIVE_THEME mal o ausente — se servira el tema demo"
fi

# ---------------------------------------------------------------
titulo "Permisos"
MAL=""
for d in storage storage/framework storage/cms storage/logs; do
    [ -d "$d" ] && [ -w "$d" ] || MAL="$MAL $d"
done
[ -n "$MAL" ] && falla "Sin escritura en:$MAL" || ok "storage/ escribible"

# ---------------------------------------------------------------
titulo "Base de datos"
DB_NAME="$(grep -E '^DB_DATABASE=' .env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r"')"
[ -n "$DB_NAME" ] || DB_NAME="precision_agricola"

MYSQL_BIN=""
if command -v mysql >/dev/null 2>&1; then
    MYSQL_BIN="$(command -v mysql)"
else
    for c in /c/laragon/bin/mysql/*/bin/mysql.exe /usr/local/mysql/bin/mysql; do
        [ -x "$c" ] && { MYSQL_BIN="$c"; break; }
    done
fi

if [ -z "$MYSQL_BIN" ]; then
    falla "No hay cliente de MySQL instalado"
elif ! "$MYSQL_BIN" -u root -e "SELECT 1" >/dev/null 2>&1; then
    falla "MySQL no responde — arranca Laragon ('Iniciar todo')"
    info  "Con la base caida, / y /bioreactores se cuelgan al arrancar."
else
    ok "MySQL responde"
    N="$("$MYSQL_BIN" -u root -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME';" 2>/dev/null)"
    if [ -z "$N" ] || [ "$N" = "0" ]; then
        falla "La base '$DB_NAME' no existe o esta vacia"
        info  "Corre:  artisan october:migrate  (crea 27 tablas desde cero)"
    else
        ok "Base '$DB_NAME' con $N tablas"
    fi
fi

# ---------------------------------------------------------------
titulo "Estado del repositorio"
RAMA="$(git branch --show-current 2>/dev/null)"
ok "Rama actual: ${RAMA:-(HEAD suelto)}"
if [ -n "$RAMA" ] && git rev-parse --verify --quiet "origin/$RAMA" >/dev/null 2>&1; then
    DETRAS="$(git rev-list --count "$RAMA..origin/$RAMA" 2>/dev/null)"
    ADELANTE="$(git rev-list --count "origin/$RAMA..$RAMA" 2>/dev/null)"
    [ "${DETRAS:-0}" != "0" ] && aviso "$DETRAS commit(s) por detras de origin/$RAMA — 'git pull'"
    [ "${ADELANTE:-0}" != "0" ] && aviso "$ADELANTE commit(s) sin subir"
    [ "${DETRAS:-0}" = "0" ] && [ "${ADELANTE:-0}" = "0" ] && ok "Sincronizada con origin"
else
    aviso "La rama no existe en origin (todavia no la has subido)"
fi
[ -z "$(git status --porcelain 2>/dev/null)" ] && ok "Sin cambios sin guardar" || aviso "Hay cambios sin commitear"

# Una pagina que exista en el tema pero no en tu rama da 404 y confunde mucho.
if [ -f themes/precision-agricola/pages/kit-biorreactor.htm ]; then
    ok "La pagina /kit-biorreactor existe en esta rama"
else
    aviso "No existe kit-biorreactor.htm en esta rama — dara 404 en local"
fi

# ---------------------------------------------------------------
titulo "Configuracion del editor"
if [ -f .claude/launch.json ]; then
    RUTA="$(grep -o '"runtimeExecutable": *"[^"]*php[^"]*"' .claude/launch.json | head -1 | sed 's/.*: *"//; s/"$//')"
    if [ -n "$RUTA" ]; then
        RUTA_U="$(cygpath -u "$RUTA" 2>/dev/null || echo "$RUTA")"
        if [ -x "$RUTA_U" ]; then
            ok "launch.json apunta a un PHP que existe aqui"
        else
            aviso "launch.json apunta a $RUTA, que no existe en esta maquina"
            info  "Es normal: la ruta es de otra maquina. Usa .\\artisan.bat en su lugar."
            info  "NO lo commitees arreglado, provoca conflictos con el resto del equipo."
        fi
    fi
fi

printf '\n  Diagnostico terminado. Para arreglar lo marcado como [FALLA]:\n'
printf '      bash .claude/skills/setup-local/scripts/bootstrap.sh\n\n'
