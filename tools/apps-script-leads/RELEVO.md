# Relevo — hoja de leads y Apps Script

Para el agente que retome este trabajo. Lo verificado aquí se midió el
**1 de octubre de 2026** contra el código en `main` (`822eec5`) y contra la
hoja real. Si han pasado semanas, vuelve a comprobar antes de confiar.

---

## 1. El encargo

Eduardo quiere que la hoja **«Biofábrica 2.0 — Leads y Ventas»** quede
usable para Ventas: arreglar el formato y que **cada dato caiga en su
columna**. Hoy, en sus palabras, «esto envía la información pero en una
celda se llenan varios valores».

Esa descripción es correcta y la causa está identificada. Sigue leyendo
antes de tocar nada.

---

## 2. Cómo viaja un lead

```
/biofabrica  ──POST──▶  Google Form  ──▶  hoja de origen  ──▶  Apps Script  ──▶  Leads
 (el sitio)              (formResponse)    (respuestas)        sincronizar()      Ventas
                                                                                  Tablero
```

1. **El sitio** (`themes/precision-agricola/pages/biofabrica.htm`) arma un
   `POST` al `formResponse` de un Google Form. Manda campos sueltos
   (`entry.*`) para nombre, correo, WhatsApp, rancho, cultivo, superficie,
   problema y gasto; y **un campo largo** con todo lo demás:

   ```
   RUTA SOLICITADA: equipo | RECOMENDACION CALCULADA: completa | Cultivos: Berries | …
   ```

   Lo arma el getter `resumen` (busca `get resumen()` en esa página).

2. **El Form** escribe en la *hoja de origen*, que este script trata como
   **solo lectura**: no se toca, porque endpoints viejos siguen escribiendo
   ahí. Su id está en `CONFIG.ORIGEN_ID`.

3. **El Apps Script** (`src/Código.js`) lee esa hoja con `sincronizar()`,
   parte el campo largo y reparte los valores en las 32 columnas de
   `COLUMNAS_LEADS`. También arma `Ventas` y `Tablero`.

**La celda con varios valores es de diseño**, y vive en la hoja de origen.
Repartirla es trabajo de `construirLead_()`. El problema no es que el sitio
mande así: es que el script ya no sabe leerlo.

---

## 3. El problema, con evidencia

### 3.1 La detección del resumen está rota

`construirLead_()` localiza la celda del resumen buscando un literal:

```js
if (v.indexOf('RUTA:') !== -1) { resumen = v; break; }
```

El sitio ya no manda `RUTA:`. Manda `RUTA SOLICITADA:`, que **no contiene**
la subcadena `RUTA:`. Comprobado reproduciendo la función con un resumen
real:

```
indexOf("RUTA:") != -1   ->  False
delEmbudo                ->  False
r['Cultivos']            ->  ''      (y así todos los demás)
```

Consecuencia: **todo el resumen se descarta**. Cada lead nuevo del embudo
queda con las columnas del embudo vacías, marcado `Origen = "Formulario
anterior"`, y con puntaje calculado sobre campos vacíos.

### 3.2 Dos claves cambiaron de nombre

Aunque arregles la detección, siguen sin coincidir:

| el sitio manda | el script busca | columna afectada |
|---|---|---|
| `RUTA SOLICITADA` y `RECOMENDACION CALCULADA` | `RUTA` | Ruta, y el puntaje |
| `Microorganismos seleccionados` | `Cepas` | Cepas sugeridas |

### 3.3 Datos que llegan y no tienen dónde caer

`Etapas`, `Ahorro anual por ha estimado` y `Ahorro anual total estimado`
viajan en el resumen y no existen como columna.

### 3.4 Una columna que nunca se llena

`Litros pedidos` se lee de `r['Litros pedidos']`, que el sitio no manda
desde que el camino de litros se fusionó en el embudo. Decidir si se quita
o se alimenta.

### 3.5 Por qué todavía no se ve el daño

| fecha | qué pasó |
|---|---|
| 2026-09-10 | último cambio al Apps Script (`f251c80`) |
| 2026-09-25 | el sitio renombra las claves (`822eec5`) |
| 2026-08-24 | **última sincronización de la hoja** |

Los leads que hoy se ven bien se construyeron con el formato viejo. **El
daño aparece la próxima vez que alguien corra `sincronizar()`.** No lo
corras «a ver qué pasa» sin haber arreglado el script: ensuciarás la hoja
con filas que habrá que borrar a mano.

---

## 4. Herramientas

Verificado disponible y con sesión iniciada:

| herramienta | versión | para qué |
|---|---|---|
| `clasp` | 3.4.0 | **la vía principal**: subir y bajar el Apps Script |
| `gcloud` | 583.0.0 | instalado; no hace falta para esto |
| conector de Google Drive | — | leer la hoja y comprobar el resultado |
| `node` / `python` | 24.18 / 3.12 | reproducir funciones del script en seco |

### La regla de oro

**Para cambiar la hoja, se cambia el Apps Script y se sube con `clasp`.**
No edites la hoja a mano: el script reconstruye encabezados, formatos,
listas desplegables y reglas de color en `instalar()` y `prepararHoja_()`,
así que cualquier arreglo manual se pierde en la siguiente corrida y además
no queda versionado.

```bash
cd tools/apps-script-leads
clasp pull          # SIEMPRE antes de editar: alguien pudo tocar el editor web
# editas src/Código.js aquí
clasp push          # sube
```

El conector de Drive sirve para **verificar**, no para editar: con él lees
la hoja y confirmas que las columnas quedaron como esperabas.

---

## 5. Skills

| cuándo | skill |
|---|---|
| antes de la primera llamada al conector de Google | `anthropic-skills:google-workspace` |
| si el sitio local no arranca o da 404 | `setup-local` |
| para entender el embudo `/biofabrica` | `diagnostico` |
| al terminar, antes de pedir revisión | `/code-review` |

---

## 6. Trampas conocidas

Todas han mordido antes en este repositorio.

- **El archivo se llama `Código.js`, con acento.** clasp usa el nombre para
  decidir qué sube. Si lo renombras a `Codigo.js`, en el editor de Google
  aparece un archivo **duplicado** y el proyecto se rompe. No lo renombres.

- **Nunca escribas un `.claspignore` sin probarlo.** Uno mal puesto dejó a
  clasp rastreando **cero** archivos, y `clasp push` seguía diciendo
  «Script is already up to date», que no prueba nada. Comprueba siempre con
  `clasp status`: debe listar `src/appsscript.json` y `src/Código.js`.

- **Las etiquetas del sitio son contrato con el script.** `idPractica_()`
  clasifica por palabra clave sobre el **texto visible** del botón
  (`artesanal`/`propag`, `convencional`/`no utilizo`,
  `biorreactor`/`equipo propio`, `compro`/`comercial`). Cambiar una etiqueta
  en la página sin revisar esto le cuesta puntos al lead **en silencio**: ya
  pasó, fueron 20 de 100. Lo mismo aplica a las claves del `resumen`, que es
  justo el error que este documento describe.

- **`setFormula` depende del separador local.** El tablero usa
  `separadorDeArgumentos_()`, que **prueba** si la hoja acepta `,` o `;` y
  cachea el resultado. No lo sustituyas por una constante: se rompió así una
  vez y el tablero se llenó de `#ERROR!`.

- **Los números del formulario viejo vienen sucios**: `$219,000` y rangos
  como `"11 a 50 ha"`. `limpiarNumero_()` decide el separador por posición y
  `numero_()` saca el punto medio de los rangos. Si tocas eso, prueba con
  esos dos casos reales.

---

## 7. Reglas de este repositorio

- **El repositorio es PÚBLICO.** No agregues credenciales, tokens, el id de
  la hoja de destino, ni la URL del Form en claro — en el sitio va
  ofuscada en base64 a propósito. Los ids que ya están versionados
  (`CONFIG.ORIGEN_ID`, el `scriptId` de `.clasp.json`) ya son públicos; no
  hace falta añadir más.

- **La hoja de destino no se nombra aquí.** Para llegar a ella: abre el
  proyecto de Apps Script (`clasp open-script`) y desde ahí la hoja
  contenedora. El script la toma con `SpreadsheetApp.getActiveSpreadsheet()`,
  no por id.

- La hoja contiene datos personales de clientes reales (nombres, correos,
  teléfonos). No los copies a archivos del repositorio ni a ningún lado.

---

## 8. Cómo saber que quedó bien

1. `clasp status` lista los dos archivos.
2. Reproduce `construirLead_()` en seco con un resumen de ejemplo y
   comprueba que cada clave que manda el sitio aterriza en su columna. Hazlo
   **antes** de subir.
3. `clasp push`, y desde la hoja: menú → sincronizar.
4. Lee la hoja con el conector de Drive y confirma que los leads nuevos
   traen `Origen = "Embudo /biofabrica"` y las columnas del embudo llenas.
5. Compara una fila nueva contra una de agosto: deben tener la misma forma.

El criterio real: **ninguna columna del embudo vacía en un lead que sí pasó
por el embudo.**

---

## 9. Lo que queda abierto, y no es código

- **Dos microorganismos sin precio confirmado.** *Bacillus pumilus* y
  *Bacillus safensis* entraron con el catálogo nuevo; la COT 353 no los
  incluye y quedaron al precio de los otros Bacillus. Falta que Ventas lo
  confirme.
- **`CONFIG.DIAS_MANTENIMIENTO = 180`** es un supuesto, no un dato de
  Servicio.
- **El gasto que captura el productor no mueve el veredicto** del embudo.
  Fue deliberado, pero conviene revisarlo: es la pregunta central y hoy no
  cambia el resultado.
- **Deuda de seguridad**: `auth.json` sigue versionado con credenciales
  reales del gateway de October, y el repositorio es público. Quitar el
  archivo no basta: hay que **rotarlas**.
