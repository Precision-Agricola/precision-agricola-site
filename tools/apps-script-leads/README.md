# Apps Script — Biofábrica 2.0 (leads y ventas)

Código de la hoja **Biofábrica 2.0 — Leads y Ventas**. Vive aquí para quedar
versionado: cada cambio se ve como diff en vez de llegar como un archivo
completo que hay que pegar a mano.

`src/Código.js` se edita aquí y se sube con `clasp push`. Se llama `.js` y no
`.gs` porque clasp usa la extensión para saber qué subir; en el editor de
Google aparece como `src/Código.gs`.

> **¿Vas a tocar esto?** Lee primero [RELEVO.md](RELEVO.md): tiene el
> estado de la integración, los formatos admitidos y las trampas conocidas.

## Uso

    cd tools/apps-script-leads
    clasp push          # sube lo local al editor de Google
    clasp pull          # baja lo que alguien haya cambiado en el editor

La raíz de clasp es esta carpeta (`rootDir: "."`); `.claspignore` permite
únicamente `src/Código.js` y `appsscript.json`. Esto evita que `pull`
cree `src/src`. Antes de subir, `clasp status` debe mostrar exactamente
esos dos archivos. Si el CLI no interactivo muestra `Skipping push`, usar
`clasp push --force` después de comprobar el diff del manifiesto.

## Actualizar una hoja existente

1. Ejecutar `node --test test-leads.cjs` y revisar el diff.
2. Subir con clasp y ejecutar `diagnosticarHoja` desde Apps Script.
3. Ejecutar `mejorarHoja`: respalda Leads, Ventas y Tablero dentro del mismo
   archivo; migra los esquemas conocidos de 31/32 columnas a 38; repara
   respuestas del embudo y agrega los registros pendientes.
4. Revisar el resultado y ejecutar `diagnosticarHoja` nuevamente.

Se conservan Etapa, Vendedor, Próximo contacto, Notas y las fórmulas existentes.
Las respuestas originales no se modifican. Las filas históricas sin resumen
del embudo no se reinterpretan. Los respaldos contienen datos privados y
deben permanecer en el archivo de Google, nunca en el repositorio.

Para el uso diario: menú **Biofábrica → Sincronizar leads**. La sincronización
es manual; subir código con clasp no ejecuta funciones ni crea activadores.
`clasp run` requiere una configuración adicional del proyecto que no está
disponible actualmente; ejecutar las funciones desde el editor o la hoja.

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
