// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Las URLs del sitio no llevan diagonal final (/contacto, no /contacto/).
// Con format 'file' cada página sale como contacto.html; el .htaccess del
// despliegue (hilo 1) reescribe /contacto -> contacto.html.
export default defineConfig({
  site: 'https://www.precisionagricola.com',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'auto' },
  compressHTML: true,
  vite: { plugins: [tailwindcss()] },
});
