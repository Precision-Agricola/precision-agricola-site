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
G="git --git-dir=$HOME/.beta-dist.git --work-tree=$HOME/beta.precisionagricola.com"
$G init -q
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
