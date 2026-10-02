# SEO de biorreactores y biofábricas

## Alcance del 2 de octubre de 2026

Objetivo: facilitar que Google encuentre las páginas comerciales y que los
visitantes puedan entender el producto antes de solicitar un diagnóstico.
Las mejoras de código no equivalen a indexación ni garantizan posiciones.

| URL | Función | Consultas orientativas, sin volúmenes medidos |
|---|---|---|
| `/bioreactores` | Evaluación del equipo | biorreactores agrícolas, biorreactor para bioinsumos |
| `/biofabrica-on-farm` | Guía del proceso | biofábricas agrícolas, biofábrica on-farm |
| `/kit-biorreactor` | Ficha y configuración | kit biorreactor, ficha técnica biorreactor agrícola |
| `/biofabrica` | Diagnóstico y estimación | calcular ahorro biofábrica, cotizar biofábrica agrícola |

## Cambios

- `/biofabrica` deja de enviar `noindex`; tiene un H1 y contenido útil fuera
  de Alpine, disponible aunque no se ejecute JavaScript.
- Títulos y descripciones diferenciados. Las etiquetas sociales de las
  páginas de producto usan los mismos metadatos del CMS.
- Enlaces HTML entre las cuatro páginas y desde Inicio.
- Contenido sobre elección de equipo, costo, demanda, operación y cotización.
- Resumen de la ficha en HTML, además del documento incrustado de Canva.
- Se retira el FAQ estructurado de biorreactores que no tenía preguntas y
  respuestas equivalentes visibles. No se añaden reseñas ni precios inventados.
- Inicio conserva un solo H1; el resto de sus secciones usa H2.
- El sitemap incluye el configurador. La ruta del CMS lee `sitemap.xml` para
  evitar dos listas diferentes; `lastmod` cambia solo en las páginas editadas.
- Robots permite los recursos CSS/JS públicos de módulos y plugins, manteniendo
  las exclusiones de sus demás rutas.
- Se conserva la URL `/bioreactores`, sus redirecciones existentes y los
  canonical a `https://www.precisionagricola.com`.
- No cambia el código de cálculos, seguimiento ni envío de leads.

## Validación

Con PHP 7.4 y el entorno local configurado:

```powershell
& 'C:/laragon/bin/php/php-7.4.33-nts-x64/php.exe' artisan serve --host=127.0.0.1 --port=8877
node tools/seo-audit.cjs http://127.0.0.1:8877
```

La auditoría comprueba respuestas HTTP, H1 sin ejecutar JavaScript, títulos
únicos, descripciones, canonical, indexabilidad, navegación interna, anclas,
sintaxis JS, JSON-LD y sitemap. La página de agradecimiento debe seguir en
`noindex`. No envía formularios ni crea clientes ficticios.

Después de publicar, repetir contra `https://www.precisionagricola.com`.
Revisar en móvil y escritorio el inicio del configurador y su avance.

## Publicación

El sitio usa cPanel. No se encontró un procedimiento de despliegue automatizado
en el repositorio. Confirmar el usuario SSH y la rama activa en
`~/precision-agricola` antes de actualizar; no asumir que producción usa main.
Los archivos del cambio son las cinco páginas, la ruta sitemap, los parciales
`seo/`, `robots.txt` y `sitemap.xml`. Las herramientas y esta guía no necesitan
exponerse como archivos públicos.

## Search Console y medición pendientes

En la cuenta de Google abierta durante la revisión no había propiedades ni
verificaciones pendientes. Inicio ya contiene una etiqueta de verificación:
conservarla y confirmar quién administra esa propiedad antes de reemplazarla.

1. Obtener acceso a la propiedad existente o verificar la propiedad correcta.
2. Una vez publicado, inspeccionar `/biofabrica` y solicitar indexación.
3. Enviar `https://www.precisionagricola.com/sitemap.xml`.
4. Registrar impresiones, clics, CTR y posición por página y consulta, filtrando
   el mercado atendido. Comparar periodos de 28 días con volúmenes suficientes.
5. Medir solicitudes recibidas además de visitas. El configurador ya emite
   eventos si existe un sistema de analítica; no se instaló otro rastreador.
6. Medir Core Web Vitals con datos reales y PageSpeed antes de atribuir mejoras
   de velocidad a este cambio; no se ha establecido una puntuación de rendimiento.

## Información comercial por confirmar

El configurador y la documentación de diagnóstico describen un tanque de
190 L con lote de 180 L; páginas anteriores anunciaban 200 y 1,000 L. Se retiró
la afirmación de esas capacidades de los textos afectados y se remite a la
ficha vigente. Confirmar catálogo, cobertura geográfica, sensores incluidos,
instalación, garantía y precios antes de añadir detalles comerciales.

Revisar con el responsable técnico los protocolos y afirmaciones existentes
de la guía (certificación de cepas, gases medidos y manejo de agua). La revisión
SEO no certifica su exactitud técnica. Publicar casos de campo solo con datos,
resultados y autorización reales; no inventar testimonios ni comprar enlaces.

## Fuentes de referencia

- https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- https://developers.google.com/search/docs/crawling-indexing/block-indexing
- https://developers.google.com/search/docs/appearance/title-link
- https://developers.google.com/search/docs/crawling-indexing/links-crawlable
