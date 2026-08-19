---
name: setup-local
description: Levanta el sitio de Precisión Agrícola en una máquina nueva — October CMS sobre Laravel 6. Úsala cuando alguien clona el repo por primera vez, cuando el sitio local no arranca, cuando aparece el tema "demo" en vez del real, cuando una página da 404 en local pero existe en producción, o cuando /backend dice "Database Missing".
---

# Levantar el proyecto en local

Este repo es un sitio de **October CMS 2.x** sobre **Laravel 6.20**. Casi todo el
trabajo ocurre en un tema hecho a mano: `themes/precision-agricola/`.

## Lo primero: corre el script

Casi todo está automatizado. Desde la raíz del repo:

```bash
bash .claude/skills/setup-local/scripts/bootstrap.sh
```

Detecta PHP, crea los atajos locales, escribe `.env`, genera la `APP_KEY`,
prepara MySQL, migra las tablas y termina levantando el sitio para comprobar
que responde de verdad. Es idempotente: si algo sale mal, arréglalo y vuelve a
correrlo entero.

Termina con un resumen. **Si dice 0 fallos, el proyecto está listo.** Si no,
cada línea `[FALLA]` trae debajo qué hacer.

Opciones: `--port 8080` para usar otro puerto, `--skip-db` para no tocar MySQL
(lee la advertencia más abajo antes de usarla), `--db-name otra_base` para
cambiar el nombre de la base al crear `.env`.

Verificado en un clon limpio: 17 comprobaciones, 0 fallos.

## Antes del script hay tres cosas que no se pueden automatizar

Están detalladas en [reference/manual.md](reference/manual.md):

1. **Instalar Laragon** (Windows) o PHP 7.4 + MySQL (macOS/Linux)
2. **Acceso al repo por SSH** — el remoto es `git@github.com:...`
3. **Arrancar MySQL** — en Laragon, el botón "Iniciar todo"

## Hechos del proyecto que ahorran horas

Esto no es obvio mirando el repo, y equivocarse cuesta tiempo:

**`vendor/` está versionado.** Son 7,451 archivos y vienen en el clon. **Nunca
corras `composer install`**: no hace falta y necesitaría credenciales del
gateway de October. `composer.lock` está en `.gitignore`.

**La versión de PHP importa.** Laravel 6 soporta PHP 7.2 a 8.0. **PHP 8.1 o
superior no funciona.** Lo probado aquí es 7.4.33.

**MySQL hace falta aunque el sitio no muestre datos.** Con la base caída y la
caché fría, October se cuelga al arrancar: `/` y `/bioreactores` no llegan a
responder. Comprobado en un clon limpio. No hay que restaurar ningún respaldo —
`php artisan october:migrate` crea las 27 tablas desde cero.

**`ACTIVE_THEME=precision-agricola` en `.env` es obligatorio.** Sin esa línea
October sirve su tema `demo` y verás una página que dice "October CMS Demo".

**`.env` está en `.gitignore`.** No viene en el clon; el script lo crea.

**No edites `.claude/launch.json` para arreglar la ruta de PHP.** Está
versionado y su ruta apunta a la máquina de quien lo commiteó, así que cada
cambio provoca conflictos y ya ha ido y venido varias veces. Usa los atajos
`php.bat` y `artisan.bat` que crea el script, que `.gitignore` sí ignora.

**Node y npm sólo sirven para recompilar el LESS y el JS de los módulos de
October.** Para trabajar en el tema no hacen falta.

## Cómo se trabaja aquí

Las páginas son archivos en `themes/precision-agricola/pages/*.htm`, con el
formato de tres secciones de October separadas por `==`:

```
url = "/mi-ruta"          <- configuración en INI
==
<?php  ...  ?>            <- PHP opcional
==
<html>... {{ twig }}      <- marcado Twig
```

Dos trampas de ese formato:

- **El PHP se compila dentro de una clase.** Un `const FOO = 1` de nivel
  superior es una constante *de clase*: hay que leerla como `self::FOO`, no
  como `FOO`. Con `FOO` a secas revienta con "Use of undefined constant".
- **Twig se come las llaves dobles.** Cuidado al escribir `{{` dentro de
  bloques `<style>` o `<script>`.

Para ver una página, levanta el servidor y ábrela; no hay build intermedio.

```bash
.\artisan.bat serve --port=8877
```

## Comprobar que quedó bien

El script ya lo hace, pero para verificarlo por tu cuenta:

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8877/kit-biorreactor
```

Debe dar `200`. Y la página no debe contener `themes/demo/` — si lo contiene,
falta `ACTIVE_THEME`.

Para entrar al panel necesitas crear un usuario:

```bash
.\artisan.bat october:passwd tu_usuario tu_contraseña
```

Luego entra en `http://localhost:8877/backend`.

## Cuando algo falla

| Síntoma | Causa | Solución |
|---|---|---|
| `/` y `/bioreactores` se quedan colgadas o dan `000` | MySQL apagado | Arranca Laragon ("Iniciar todo") |
| Sale "October CMS Demo" | Falta `ACTIVE_THEME` en `.env` | Añade `ACTIVE_THEME=precision-agricola` |
| `No application encryption key has been specified` | `APP_KEY` vacía | `.\artisan.bat key:generate` |
| `/backend` dice "Database Missing" | Base sin migrar | `.\artisan.bat october:migrate` |
| Una página da 404 en local pero existe en producción | Estás en otra rama | `git branch --show-current` y compara con la del servidor |
| `'artisan' no se reconoce como un comando` | No hay PHP en el PATH | Usa `.\artisan.bat`, no `artisan` |
| Errores raros de sintaxis de PHP | PHP 8.1 o superior | Cambia a 7.4 |
| Cambié una página y no se refleja | Caché de plantillas | Borra `storage/cms/cache/*` y `storage/cms/twig/*` |

Si nada de esto encaja, corre el diagnóstico, que revisa cada punto por
separado y dice cuál está mal:

```bash
bash .claude/skills/setup-local/scripts/doctor.sh
```

## Antes de tocar producción

Producción corre en cPanel y **no siempre está en `main`**. Antes de dar por
hecho qué hay desplegado, entra por SSH y mira `git branch --show-current` en
`~/precision-agricola`. Ha estado en ramas de feature durante semanas.
