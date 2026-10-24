# Despliegue del sitio de Astro en cPanel

El sitio actual de October vive en `~/precision-agricola` y se publica con
`git pull`. El sitio de Astro se publica aparte, en un subdominio de pruebas
(`beta.precisionagricola.com`), así que los dos conviven sin tocarse.

## Cómo funciona

`.github/workflows/deploy-beta.yml` corre con cada push a `main` que toque
`web/` (y a mano desde la pestaña Actions). Hace `npm ci`, `npm run build` y
`npm run audit:seo`, le pone `noindex` al beta y luego:

1. **rsync por SSH** a la carpeta del subdominio, si están los secretos.
   Es lo recomendado: no hay que entrar al servidor.
2. **Rama `beta-dist`** con el build listo, siempre. Sirve de respaldo si
   GoDaddy no deja entrar a GitHub por SSH.

`web/public/.htaccess` viaja dentro del build y hace que `/ruta` sirva
`ruta.html`, redirige `/ruta.html` y `/ruta/` a `/ruta` (301), guarda un año
los archivos de `/_astro/` y comprime con gzip.

## 1. Crear el subdominio

cPanel → Dominios → Crear un dominio nuevo → `beta.precisionagricola.com`,
con la raíz en `/home/rj2x20jprqmf/beta.precisionagricola.com` (fuera de
`~/precision-agricola`). Esa ruta es la variable `BETA_PATH`.

## 2. Llave solo para el despliegue

En tu PC, una llave nueva sin contraseña, distinta de la tuya:

```bash
ssh-keygen -t ed25519 -N "" -C "github-actions-beta" -f ~/.ssh/pa_beta_deploy
ssh-copy-id -i ~/.ssh/pa_beta_deploy.pub rj2x20jprqmf@SERVIDOR
ssh-keyscan SERVIDOR > /tmp/pa_known_hosts
```

`SERVIDOR` es el mismo host que usas hoy en tu comando `ssh`. Si `ssh-copy-id`
no está, pega el `.pub` en cPanel → Acceso SSH → Administrar claves SSH →
Importar clave, y luego Autorizar.

## 3. Secretos en GitHub

Repositorio → Settings → Secrets and variables → Actions.

| Pestaña | Nombre | Valor |
|---|---|---|
| Secrets | `BETA_SSH_HOST` | `SERVIDOR` |
| Secrets | `BETA_SSH_USER` | `rj2x20jprqmf` |
| Secrets | `BETA_SSH_KEY` | contenido completo de `~/.ssh/pa_beta_deploy` (la privada) |
| Secrets | `BETA_SSH_KNOWN_HOSTS` | contenido de `/tmp/pa_known_hosts` |
| Variables | `BETA_PATH` | `/home/rj2x20jprqmf/beta.precisionagricola.com` |
| Variables | `BETA_SSH_PORT` | solo si no es 22 |

Con la CLI de GitHub: `gh secret set BETA_SSH_KEY < ~/.ssh/pa_beta_deploy`.

Por seguridad el workflow se niega a subir si `BETA_PATH` no contiene `beta`
o apunta dentro de `~/precision-agricola`, porque rsync borra lo que no esté
en el build.

## Respaldo: publicar con git pull

Si el rsync no conecta, desde la terminal de cPanel, una sola vez:

```bash
git clone -b beta-dist --single-branch https://github.com/Precision-Agricola/precision-agricola-site.git ~/beta.precisionagricola.com
```

Y para actualizar (la rama se reescribe en cada build, por eso no es `git pull`):

```bash
cd ~/beta.precisionagricola.com && git fetch origin beta-dist && git reset --hard origin/beta-dist
```

## Comprobar

`https://beta.precisionagricola.com/ui-kit` debe mostrar el kit, y
`/version.txt` el commit publicado. La raíz `/` da 403 hasta que exista la
página de Inicio (hilo 2).
