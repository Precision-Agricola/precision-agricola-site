# Apps Script — Biofábrica 2.0 (leads y ventas)

Código de la hoja **Biofábrica 2.0 — Leads y Ventas**. Vive aquí para quedar
versionado: cada cambio se ve como diff en vez de llegar como un archivo
completo que hay que pegar a mano.

`src/Codigo.js` se edita aquí y se sube con `clasp push`. Se llama `.js` y no
`.gs` porque clasp usa la extensión para saber qué subir; en el editor de
Google aparece como `Codigo.gs`.

## Uso

    cd tools/apps-script-leads
    clasp push          # sube lo local al editor de Google
    clasp pull          # baja lo que alguien haya cambiado en el editor

Antes de un `push`, conviene un `clasp pull` para no pisar ediciones hechas
desde el navegador.

## Qué hace

Lee las respuestas del formulario (hoja de origen, que **no se toca** para no
romper los endpoints viejos que siguen escribiendo ahí) y arma tres pestañas:

- **Leads** — una columna por dato, con puntaje de intención de compra
- **Ventas** — seguimiento post venta, con semáforo de mantenimiento
- **Tablero** — indicadores

## Supuestos pendientes de confirmar

- `CONFIG.DIAS_MANTENIMIENTO = 180` — supuesto, falta el dato de Servicio
- Las superficies del formulario viejo vienen por tramos ("11 a 50 ha"); se
  guarda el punto medio y se marca en Notas
- Los montos de leads fuera de México quedan en su moneda, marcados en Notas
