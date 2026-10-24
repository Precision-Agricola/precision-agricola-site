# Sitio en Astro

Sitio nuevo de Precisión Agrícola (Astro 5 y Tailwind 4). Convive con el tema de
October en `themes/precision-agricola/` hasta el corte final.

```bash
cd web
npm ci
npm run dev        # http://localhost:4321/ui-kit
npm run build      # genera dist/
npm run audit:seo  # revisa dist/: title, H1, description, canonical, noindex, JSON-LD, JS < 50 KB, srcset
```

## Componentes compartidos

Los edita solo el hilo de la fundación. Si una página necesita un cambio, se pide ahí.

| Archivo | Uso |
|---|---|
| `src/layouts/BaseLayout.astro` | `title`, `description`, `jsonLd`, `image`, `noindex`, `navSolid`, `canonicalPath`, `bare`. Incluye barra, pie, fuentes y animaciones. |
| `src/components/site/Nav.astro` | Barra acrílica de #39: logo suelto y enlaces aparte. |
| `src/components/site/Footer.astro` | Pie con Jalisco y (52) 33 1117 4441. |
| `src/components/ui/Button.astro` | `variant`: primary, dark, outline, ghost-light. `size`: md, lg. |
| `src/components/ui/Section.astro` | `tone`: white, brote, bosque, noche. `eyebrow`, `title` (H2), `lead`. |
| `src/components/ui/Picture.astro` | AVIF y WebP con `srcset`. `priority` para la imagen principal. |
| `src/styles/global.css` | Tokens (`bosque`, `hoja`, `medio`, `lima`, `brote`, `noche`), `pa-h1`, `pa-h2`, `pa-eyebrow`. |

Animación al hacer scroll: `data-reveal` en un elemento o `data-reveal-stagger`
en un contenedor para escalonar a sus hijos. Sin JS o con
`prefers-reduced-motion`, todo se muestra sin animar. Las transiciones entre
páginas usan View Transitions de CSS, sin JavaScript.

## Notas

- Cada página sale como `ruta.html` (`build.format: 'file'`) y las URLs no llevan
  diagonal final. El `.htaccess` del despliegue debe reescribir `/ruta` a `ruta.html`.
- Las imágenes van en `src/assets/` para que Astro las optimice. `public/` es solo
  para archivos que deben conservar su nombre (favicons, `api/lead.php`).
- `/ui-kit` es el catálogo de componentes, con `noindex`. Se llama así porque
  Astro no publica páginas cuyo nombre empieza con guion bajo (`/_kit`).
