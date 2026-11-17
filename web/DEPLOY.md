# Despliegue del sitio de Astro en cPanel

El sitio actual de October vive en `~/precision-agricola` y se publica con
`git pull`. El sitio de Astro se publica aparte, en el subdominio de pruebas
`beta.precisionagricola.com`, así que los dos conviven sin tocarse.

## Cómo funciona

1. `.github/workflows/deploy-beta.yml` corre con cada push a `main` que toque
   `web/` (y a mano desde la pestaña Actions). Hace `npm ci`, `npm run build`
   y `npm run audit:seo`, le pone `noindex` al beta y fuerza el build a la
   rama `beta-dist`.
2. En el servidor, un cron de cPanel hace `fetch` de `beta-dist` cada 5
   minutos y deja la carpeta del subdominio igual a esa rama.

Se hace así porque GoDaddy no acepta conexiones SSH desde los servidores de
GitHub (el rsync daba timeout en el puerto 22). El servidor sí puede salir
a GitHub, igual que con el `git pull` del sitio actual.

El repositorio git del beta vive en `~/.beta-dist.git`, fuera de la carpeta
pública, para que `.git` nunca quede expuesto. Además `web/public/.htaccess`
responde 404 a cualquier archivo oculto salvo `.well-known` (AutoSSL).

`web/public/.htaccess` viaja dentro del build y hace que `/ruta` sirva
`ruta.html`, redirige `/ruta.html` y `/ruta/` a `/ruta` (301), guarda un año
los archivos de `/_astro/` y comprime con gzip.

## 1. Subdominio

cPanel → Dominios → `beta.precisionagricola.com`, con la raíz del documento
en `beta.precisionagricola.com` (cPanel le antepone `/home/rj2x20jprqmf/`).

## 2. Preparar la carpeta (una sola vez, por SSH)

```bash
mkdir -p ~/beta.precisionagricola.com
G="git --git-dir=$HOME/.beta-dist.git --work-tree=$HOME/beta.precisionagricola.com"
$G init -q
$G config core.bare false
$G remote add origin "$(git -C ~/precision-agricola remote get-url origin)"
$G fetch -q --depth 1 origin beta-dist && $G reset -q --hard FETCH_HEAD
cat ~/beta.precisionagricola.com/version.txt
```

El remoto es el mismo que ya usa `~/precision-agricola`, así que funciona con
las credenciales que ya tiene el servidor.

## 3. Cron (cPanel → Trabajos de cron)

Cada 5 minutos (`*/5 * * * *`), comando:

```bash
G="git --git-dir=$HOME/.beta-dist.git --work-tree=$HOME/beta.precisionagricola.com"; $G fetch -q --depth 1 origin beta-dist && $G reset -q --hard FETCH_HEAD
```

## Comprobar

`https://beta.precisionagricola.com/version.txt` muestra el commit de `main`
publicado; debe coincidir con el último run de "Desplegar beta" en Actions.
Para publicar al instante sin esperar al cron, corre el mismo comando por SSH.

## DNS y HTTPS

- El DNS de `precisionagricola.com` vive en GoDaddy (`ns39`/`ns40.domaincontrol.com`)
  desde el 25 de octubre de 2026; antes estaba en Wix. Registros: A `@`, `beta` y
  `mail` → `173.201.181.184`, CNAME `www` → `@`, los 5 MX de Google Workspace y
  el TXT `google-site-verification`.
- El plan de hosting no admite dominios adicionales (addon = 0) y no tiene
  AutoSSL. El certificado del beta es de Let's Encrypt, emitido con `acme.sh`
  en el servidor (`~/.acme.sh`), que lo renueva solo con su propio cron:

```bash
~/.acme.sh/acme.sh --issue --server letsencrypt -d beta.precisionagricola.com -w ~/beta.precisionagricola.com
~/.acme.sh/acme.sh --deploy -d beta.precisionagricola.com --deploy-hook cpanel_uapi
```

- El certificado del dominio principal vence el 27 de enero de 2027 y no se
  renueva solo; se puede emitir igual con `acme.sh`, con `-w ~/public_html`.
- `web/public/.htaccess` redirige HTTP a HTTPS y `precisionagricola.com` a
  `https://www.precisionagricola.com` con 301 (salvo `/.well-known/`), y envía
  `Strict-Transport-Security` (`max-age=31536000`) en respuestas HTTPS.

## Producción (www): corte desde October

`www.precisionagricola.com` todavía sirve October desde `~/public_html`.
El sitio de Astro se publica en www con `.github/workflows/deploy-produccion.yml`,
que **solo corre a mano** (Actions → «Desplegar producción» → Run workflow) y
deja el build en la rama `prod-dist`, sin el `noindex` del beta y sin `/ui-kit`.

### 1. Publicar la rama (GitHub)

Correr «Desplegar producción» y esperar a que termine en verde.

### 2. Preparar la carpeta (una sola vez, por SSH)

```bash
ls -la ~ | grep public_html          # anotar si es carpeta o enlace, y a dónde apunta
mkdir -p ~/www-astro
P="git --git-dir=$HOME/.prod-dist.git --work-tree=$HOME/www-astro"
$P init -q
$P config core.bare false
$P remote add origin "$(git -C ~/precision-agricola remote get-url origin)"
$P fetch -q --depth 1 origin prod-dist && $P reset -q --hard FETCH_HEAD
cat ~/www-astro/version.txt          # debe coincidir con el run del paso 1
```

### 3. Corte (menos de un minuto)

```bash
cd ~
mv public_html public_html-october   # si public_html era un enlace, se mueve el enlace
ln -s www-astro public_html
```

`acme.sh -w ~/public_html` sigue funcionando: escribe en `~/www-astro/.well-known`.

### 4. Cron (cPanel → Trabajos de cron), cada 5 minutos

```bash
P="git --git-dir=$HOME/.prod-dist.git --work-tree=$HOME/www-astro"; $P fetch -q --depth 1 origin prod-dist && $P reset -q --hard FETCH_HEAD
```

Con esto, cada vez que se corre «Desplegar producción», www se actualiza en
menos de 5 minutos. Un push a `main` solo actualiza el beta.

### Comprobar

```bash
curl -s  https://www.precisionagricola.com/version.txt
curl -sI http://www.precisionagricola.com/biorreactores        # 301 → https
curl -sI https://precisionagricola.com/contacto                # 301 → https://www…/contacto
curl -sI https://www.precisionagricola.com/ | grep -i strict   # max-age=31536000
curl -sI https://www.precisionagricola.com/ | grep -i robots   # nada: www sí se indexa
curl -sI https://www.precisionagricola.com/bioreactores        # 301 → /biorreactores
curl -sI https://www.precisionagricola.com/diagnostico         # 301 → /biofabrica
curl -sI https://www.precisionagricola.com/ui-kit              # 404
curl -si -X POST -d 'foo=bar' https://www.precisionagricola.com/api/lead.php  # 400 vacio
```

Después, un lead de prueba en `/biorreactores` y en `/kit-biorreactor`, y
enviar el sitemap nuevo en Search Console.

### Regresar a October (rollback)

```bash
cd ~ && rm public_html && mv public_html-october public_html
```

Quitar o pausar el cron de producción mientras se arregla.
