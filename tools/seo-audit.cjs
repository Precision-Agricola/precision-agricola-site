// Read-only checks. Usage: node tools/seo-audit.cjs http://127.0.0.1:8877
// After deployment: node tools/seo-audit.cjs https://www.precisionagricola.com
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { Script } = require('node:vm');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const base = process.argv[2] || 'http://127.0.0.1:8877';
const canonical = 'https://www.precisionagricola.com';
const routes = ['/', '/bioreactores', '/biofabrica-on-farm', '/kit-biorreactor', '/biofabrica'];
const titles = new Set();
async function get(route) {
  const response = await fetch(base + route, { signal: AbortSignal.timeout(45000) });
  assert.equal(response.status, 200, route + ': HTTP');
  assert(!response.headers.get('x-robots-tag')?.includes('noindex'), route + ': X-Robots-Tag');
  return response;
}
async function main() {
  for (const route of routes) {
    const html = await (await get(route)).text();
    const document = new JSDOM(html).window.document;
    assert.equal(document.querySelectorAll('title').length, 1, route + ': title');
    assert.equal(document.querySelectorAll('h1').length, 1, route + ': H1 visible without JS');
    assert(document.title.trim(), route + ': title is empty');
    assert(!titles.has(document.title), route + ': duplicate title');
    titles.add(document.title);
    assert(document.querySelector('meta[name="description"]')?.content.length > 60, route + ': description');
    assert(!/noindex/i.test(document.querySelector('meta[name="robots"]')?.content || ''), route + ': noindex');
    assert.equal(document.querySelector('link[rel="canonical"]')?.href, canonical + route, route + ': canonical');
    assert(document.querySelector('a[href="/biofabrica"]') || route === '/biofabrica', route + ': calculator link');
    for (const element of document.querySelectorAll('script')) {
      if (element.type === 'application/ld+json') JSON.parse(element.textContent);
      else if (!element.src && (!element.type || element.type === 'text/javascript')) new Script(element.textContent);
    }
    for (const link of document.querySelectorAll('a[href]')) {
      const href = link.getAttribute('href');
      if (href.startsWith('#') && href.length > 1) assert(document.getElementById(href.slice(1)), route + ': missing anchor ' + href);
    }
    console.log('PASS', route, 'HTML, title, H1, indexability, canonical, links, JSON-LD, JS syntax');
  }
  const xml = await (await get('/sitemap.xml')).text();
  const sitemap = new JSDOM(xml, {contentType: 'application/xml'}).window.document;
  const urls = [...sitemap.querySelectorAll('loc')].map(e => e.textContent);
  assert.equal(new Set(urls).size, urls.length, 'Sitemap: duplicate URLs');
  for (const route of routes) assert(urls.includes(canonical + route), 'Sitemap missing ' + route);
  const thankYou = new JSDOM(await (await get('/gracias-diagnostico')).text()).window.document;
  assert(/noindex/.test(thankYou.querySelector('meta[name="robots"]')?.content), 'Thank-you page must remain noindex');
  console.log('PASS sitemap and thank-you exclusion');
  // No live form submissions. Compare the funnel code against the current Git baseline.
  const file = 'themes/precision-agricola/pages/biofabrica.htm';
  const before = execFileSync('git', ['show', 'HEAD:' + file], {encoding:'utf8'});
  const after = fs.readFileSync(file, 'utf8');
  const scripts = source => [...source.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1].replace(/\r\n/g, '\n'));
  const hash = source => createHash('sha256').update(JSON.stringify(scripts(source))).digest('hex');
  assert.equal(hash(after), hash(before), 'Funnel calculations, labels, tracking and submission must remain unchanged');
  console.log('PASS funnel logic and submission unchanged');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
