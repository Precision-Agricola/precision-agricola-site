// Auditoría SEO y de peso contra el build de Astro (web/dist). Solo lectura.
// Uso: npm run build && npm run audit:seo
// Adapta las comprobaciones de tools/seo-audit.cjs del sitio en October y
// añade el presupuesto por página: menos de 50 KB de JS e imágenes con srcset.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { Script } from 'node:vm';
import { JSDOM } from 'jsdom';

const dist = new URL('../dist/', import.meta.url).pathname;
const canonicalBase = 'https://www.precisionagricola.com';
const JS_BUDGET = 50 * 1024;
// Páginas que deben llevar noindex. Cualquier otra con noindex falla.
const noindexRoutes = new Set(['/ui-kit', '/gracias-diagnostico']);
// Páginas del embudo que deben enlazar a la calculadora (como en tools/seo-audit.cjs).
const funnelRoutes = new Set(['/', '/bioreactores', '/biofabrica-on-farm', '/kit-biorreactor']);

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? walk(path) : [path];
});
const routeOf = (file) => {
  const rel = relative(dist, file).split(sep).join('/').replace(/\.html$/, '');
  if (rel === 'index') return '/';
  return '/' + rel.replace(/\/index$/, '');
};
const sizeOf = (src) => statSync(join(dist, src.replace(/^\//, ''))).size;

const pages = walk(dist).filter((f) => f.endsWith('.html') && !f.endsWith('404.html'));
assert(pages.length > 0, 'No hay páginas en dist/. Corre npm run build primero.');
const titles = new Map();
let failures = 0;

for (const file of pages.sort()) {
  const route = routeOf(file);
  try {
    const document = new JSDOM(readFileSync(file, 'utf8')).window.document;
    const robots = document.querySelector('meta[name="robots"]')?.content || '';
    const noindex = /noindex/i.test(robots);

    assert.equal(document.querySelectorAll('title').length, 1, 'un solo <title>');
    assert(document.title.trim(), 'title vacío');
    assert(!titles.has(document.title), `title duplicado con ${titles.get(document.title)}`);
    titles.set(document.title, route);
    assert.equal(document.querySelectorAll('h1').length, 1, 'un solo H1 visible sin JS');
    assert(document.querySelector('meta[name="description"]')?.content.length > 60, 'description de más de 60 caracteres');
    assert.equal(noindex, noindexRoutes.has(route), noindex ? 'noindex inesperado' : 'falta noindex');
    assert.equal(document.querySelector('link[rel="canonical"]')?.href, canonicalBase + route, 'canonical');
    assert.equal(document.querySelector('meta[property="og:url"]')?.content, canonicalBase + route, 'og:url');
    assert(document.querySelector('meta[property="og:title"]')?.content, 'og:title');
    assert(document.querySelector('meta[property="og:description"]')?.content, 'og:description');
    if (funnelRoutes.has(route)) assert(document.querySelector('a[href="/biofabrica"]'), 'enlace a la calculadora');

    let js = 0;
    for (const element of document.querySelectorAll('script')) {
      if (element.type === 'application/ld+json') JSON.parse(element.textContent);
      else if (element.src) {
        if (element.src.startsWith('/')) js += sizeOf(element.src);
      } else if (!element.type || element.type === 'text/javascript') {
        new Script(element.textContent);
        js += Buffer.byteLength(element.textContent);
      } else if (element.type === 'module') js += Buffer.byteLength(element.textContent);
    }
    assert(js < JS_BUDGET, `JavaScript de ${(js / 1024).toFixed(1)} KB, el límite es 50 KB`);

    for (const link of document.querySelectorAll('a[href^="#"]')) {
      const id = link.getAttribute('href').slice(1);
      if (id) assert(document.getElementById(id), `falta el ancla #${id}`);
    }
    for (const img of document.querySelectorAll('img')) {
      assert(img.hasAttribute('alt'), `imagen sin alt: ${img.getAttribute('src')}`);
      const src = img.getAttribute('src') || '';
      if (/\.(jpe?g|png)$/i.test(src) && img.parentElement?.tagName !== 'PICTURE') {
        assert(img.getAttribute('srcset'), `imagen ${src} sin srcset; usa <Picture> o <Image>`);
      }
    }
    console.log(`PASS ${route}  JS ${(js / 1024).toFixed(1)} KB`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${route}: ${error.message}`);
  }
}

process.exitCode = failures ? 1 : 0;
