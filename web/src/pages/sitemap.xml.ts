// Sitemap XML estático generado en el build a partir de las páginas de src/pages.
// Excluye las páginas con noindex (ui-kit, gracias-diagnostico y 404).
import type { APIRoute } from 'astro';

const NOINDEX = new Set(['ui-kit', 'gracias-diagnostico', '404']);

export const GET: APIRoute = (context) => {
  const site = context.site!;
  const slugs = Object.keys(import.meta.glob('./*.astro'))
    .map((file) => file.replace(/^\.\//, '').replace(/\.astro$/, ''))
    .filter((slug) => !NOINDEX.has(slug))
    .sort((a, b) => (a === 'index' ? -1 : b === 'index' ? 1 : a.localeCompare(b)));

  const urls = slugs
    .map((slug) => new URL(slug === 'index' ? '/' : `/${slug}`, site).href)
    .map((loc) => `  <url><loc>${loc}</loc></url>`)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
