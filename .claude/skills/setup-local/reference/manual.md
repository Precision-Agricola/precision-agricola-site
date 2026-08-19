# Pasos manuales

Todo lo demás lo hace `scripts/bootstrap.sh`. Estas tres cosas requieren
instalar software, aceptar diálogos o pegar una clave en un sitio web, así que
las tiene que hacer una persona.

Tiempo total la primera vez: unos 20 minutos, casi todos de descarga.

---

## 1. Instalar PHP y MySQL

### Windows (recomendado: Laragon)

Laragon trae PHP, MySQL, Apache y Git Bash en un solo instalador, que es
exactamente lo que este proyecto necesita.

1. Descarga **Laragon Full** de <https://laragon.org/download/>
2. Instálalo en `C:\laragon` (la ruta por defecto). El script busca ahí primero;
   si lo pones en otro lado, todo sigue funcionando pero tardarás un poco más.
3. Ábrelo y pulsa **"Iniciar todo"**. Deben encenderse Apache y MySQL.

Laragon suele traer PHP 8.x, y **este proyecto necesita 7.2–8.0**. Para añadir
el 7.4:

1. Descarga el ZIP de PHP **7.4.33 NTS x64** de
   <https://windows.php.net/downloads/releases/archives/>
   (el archivo se llama algo como `php-7.4.33-nts-Win32-vc15-x64.zip`)
2. Descomprímelo en `C:\laragon\bin\php\php-7.4.33-nts-x64\`
3. Dentro de esa carpeta, copia `php.ini-development` a `php.ini`
4. Abre ese `php.ini` y quita el `;` del principio de estas líneas:

   ```
   extension=curl
   extension=fileinfo
   extension=gd2
   extension=mbstring
   extension=openssl
   extension=pdo_mysql
   extension=zip
   ```

5. En el menú de Laragon: **PHP → Versión → php-7.4.33-nts-x64**

Para comprobarlo, el script te lo dirá en su paso 1. Debe decir `PHP 7.4.33`.

### macOS

```bash
brew tap shivammathur/php
brew install shivammathur/php/php@7.4
brew install mysql
brew services start mysql
```

### Linux (Debian/Ubuntu)

```bash
sudo apt install php7.4-cli php7.4-mysql php7.4-mbstring php7.4-curl php7.4-gd php7.4-zip php7.4-xml mysql-server
sudo systemctl start mysql
```

---

## 2. Acceso al repositorio

El remoto usa SSH: `git@github.com:Precision-Agricola/precision-agricola-site.git`

Necesitas una llave SSH asociada a tu cuenta de GitHub, y que esa cuenta tenga
acceso a la organización **Precision-Agricola**.

1. Genera la llave (si no tienes una):

   ```bash
   ssh-keygen -t ed25519 -C "tu-correo@ejemplo.com"
   ```

   Acepta la ruta por defecto y pon una contraseña si quieres.

2. Copia la parte pública:

   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```

3. Pégala en <https://github.com/settings/keys> → **New SSH key**

4. Comprueba que funciona:

   ```bash
   ssh -T git@github.com
   ```

   Debe saludarte por tu nombre de usuario.

5. Clona:

   ```bash
   git clone git@github.com:Precision-Agricola/precision-agricola-site.git
   cd precision-agricola-site
   ```

   El clon pesa bastante porque `vendor/` viene versionado. Es normal.

**Si no tienes acceso a la organización**, pídeselo a Eduardo; no hay forma de
saltárselo. Como alternativa temporal puedes clonar por HTTPS con un token
personal, pero lo limpio es la llave SSH.

---

## 3. Arrancar MySQL

Tiene que estar encendido **antes** de correr el script, y también cada vez que
vayas a trabajar.

- **Windows**: abre Laragon y pulsa "Iniciar todo"
- **macOS**: `brew services start mysql`
- **Linux**: `sudo systemctl start mysql`

Para comprobar que responde:

```bash
mysql -u root -e "SELECT VERSION();"
```

El script asume usuario `root` sin contraseña, que es como viene Laragon. Si tu
MySQL tiene contraseña, ajusta `DB_USERNAME` y `DB_PASSWORD` en `.env` después
de que el script lo cree.

No hace falta ningún respaldo ni volcado de la base: `october:migrate` crea las
27 tablas vacías, y el contenido del sitio vive en archivos del tema, no en la
base.

---

## 4. Usuario del panel (sólo si necesitas /backend)

El panel de October está en `/backend` y necesita un usuario, que no se crea
solo:

```bash
.\artisan.bat october:passwd tu_usuario tu_contraseña
```

En macOS o Linux, `php artisan october:passwd ...`.

Para trabajar en las páginas del tema **no hace falta el panel**: son archivos
`.htm` que se editan con el editor de código.

---

## Notas para quien mantenga esto

**`auth.json` está versionado y contiene credenciales del gateway de October.**
No hacen falta para trabajar, porque `vendor/` viene en el repo, pero siguen
expuestas en el historial. Existe una rama `fix/remove-committed-composer-token`
que nunca se fusionó. Conviene rotarlas y sacarlas del repo.

**Producción corre en cPanel** en `~/precision-agricola`, y no siempre está en
`main`. Comprueba siempre con `git branch --show-current` por SSH antes de dar
por hecho qué hay publicado.
