const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const test = require('node:test');
const ctx = vm.createContext({ console });
vm.runInContext(fs.readFileSync(`${__dirname}/src/Código.js`, 'utf8'), ctx);
const columnas = vm.runInContext('COLUMNAS_LEADS', ctx);
const headers = ['Marca temporal', 'Nombre Completo', 'Correo', 'WhatsApp', 'Rancho', 'Ubicación', 'Cultivo Principal', 'Superficie total', 'Cuánto inviertes', 'principal problema', 'Resumen'];
function lead(resumen) {
  const fila = ['2026-10-01', 'Ejemplo ficticio', 'ejemplo@example.invalid', '+520000000000', 'Prueba', 'Jalisco', 'Berries', '11 a 50 ha', '$219,000', 'Suelo', resumen];
  return Object.fromEntries(ctx.construirLead_(fila, headers, 'prueba').map((v, i) => [columnas[i], v]));
}
test('el resumen actual distribuye cada campo y puntúa la recomendación calculada', () => {
  const r = lead('RUTA SOLICITADA: equipo | RECOMENDACION CALCULADA: completa | Cultivos: Berries | Etapas: Berries: vegetativo / floración | Estado: Jalisco | Superficie: 25.5 ha | Practica: compro | Gasto: $1,000/ha/mes | Meses con gasto: enero,febrero,marzo | Gasto anual por ha: $3,000 | Problema principal: suelo | Problemas seleccionados: suelo / costo | Monitoreo: si | Microorganismos seleccionados: Trichoderma / Bacillus | Total: $219,000 | Recuperacion: 12 meses | Ahorro anual por ha estimado: $2,000 | Ahorro anual total estimado: $51,000 | Forma de pago: contado | Financiamiento: INTERESADO');
  assert.equal(r.Origen, 'Embudo /biofabrica');
  assert.equal(r.Ruta, 'Equipo');
  assert.equal(r['Recomendación calculada'], 'Biofábrica completa');
  assert.equal(r.Puntaje, 91);
  assert.equal(r['Etapas del cultivo'], 'Berries: vegetativo / floración');
  assert.equal(r['Cepas sugeridas'], 'Trichoderma / Bacillus');
  assert.equal(r['Gasto anual MXN'], 76500);
  assert.equal(r['Superficie (ha)'], 25.5);
  assert.equal(r['Meses activos'], 3);
  assert.equal(r['Ahorro anual total estimado MXN'], 51000);
  assert.equal(r['Total cotizado MXN'], 219000);
  assert.equal(r['Ahorro anual estimado MXN/ha'], 2000);
});
test('el resumen histórico mantiene sus columnas', () => {
  const r = lead('RUTA: gradual | Cultivos: aguacate,cana | Cepas: Bacillus | Litros pedidos: 15 | Superficie: 20 ha');
  assert.equal(r.Origen, 'Embudo /biofabrica');
  assert.equal(r.Ruta, 'Entrada gradual');
  assert.equal(r.Cultivos, 'Aguacate / Caña de azúcar');
  assert.equal(r['Litros pedidos'], 15);
  assert.equal(r['Cepas sugeridas'], 'Bacillus');
});
test('formulario anterior, ceros y configurador sin visitar', () => {
  const viejo = lead('');
  assert.equal(viejo.Origen, 'Formulario anterior');
  assert.equal(viejo['Superficie (ha)'], 31);
  assert.equal(viejo['Gasto MXN/ha/mes'], 219000);
  const r = lead('RUTA SOLICITADA: campo | RECOMENDACION CALCULADA: campo | Gasto: $0 | Ahorro anual por ha estimado: $0');
  assert.equal(r['Gasto MXN/ha/mes'], 0);
  assert.equal(r['Ahorro anual estimado MXN/ha'], 0);
  assert.equal(r['Cepas sugeridas'], '');
  assert.equal(r['Total cotizado MXN'], '');
});
test('la ampliación conserva las 32 posiciones anteriores y rechaza encabezados movidos', () => {
  assert.equal(columnas.indexOf('ID'), 31);
  assert.equal(columnas.length, 38);
  const sheet = h => ({ getLastRow: () => 2, getLastColumn: () => h.length, getRange: () => ({getValues: () => [h]}), getName: () => 'Leads' });
  assert.doesNotThrow(() => ctx.validarEncabezados_(sheet(columnas.slice(0, 32)), columnas));
  assert.doesNotThrow(() => ctx.validarEncabezados_(sheet(columnas.slice(0, 32).filter(c => c !== 'Litros pedidos')), columnas));
  assert.throws(() => ctx.validarEncabezados_(sheet(['Nombre', 'Fecha']), columnas), /Encabezados inesperados/);
  assert.equal(ctx.textoSeguro_('=IMPORTXML("x")'), '\'=IMPORTXML("x")');
});
test('el estado sale del final de la ubicación, sin depender de acentos', () => {
  const casos = {
    'La Paz, Baja California Sur': 'Baja California Sur',
    'Ensenada, Baja California': 'Baja California',
    'Ciudad Hidalgo, Michoacán': 'Michoacán',
    'Morelos, Zacatecas': 'Zacatecas',
    'Uruapan, Michoacan': 'Michoacán',
    'Monterrey, Nuevo Leon': 'Nuevo León',
    'Queretaro, Qro.': 'Querétaro',
    'CDMX': 'Ciudad de México',
    'Toluca, Edomex': 'Estado de México',
    'Zamora, Mich.': 'Michoacán',
    'Hidalgo del Parral, Chihuahua': 'Chihuahua',
    'Pachuca, Hidalgo': 'Hidalgo',
    'Sin dato': ''
  };
  for (const [texto, esperado] of Object.entries(casos)) assert.equal(ctx.estadoDesde_(texto), esperado, texto);
});
test('los ahorros negativos conservan el signo y los rangos no', () => {
  const r = lead('RUTA SOLICITADA: litros | RECOMENDACION CALCULADA: litros | Ahorro anual por ha estimado: $-12,345 | Ahorro anual total estimado: $-1,234,500');
  assert.equal(r['Ahorro anual estimado MXN/ha'], -12345);
  assert.equal(r['Ahorro anual total estimado MXN'], -1234500);
  assert.equal(ctx.numero_('11 a 50 ha'), 31);
  assert.equal(ctx.numero_('5-15'), 10);
  assert.equal(ctx.numero_('inversión - 500'), 500);
});
test('el formulario anterior aprovecha intención y práctica', () => {
  const h = headers.slice(0, 10).concat(['¿Utilizas microorganismos actualmente?', '¿Qué deseas hacer?']);
  const fila = ['2026-10-01', 'Ejemplo ficticio', 'ejemplo@example.invalid', '3300000000', 'Prueba', 'Zapopan, Jalisco', 'Berries', 'Más de 50 ha', '$500', 'Suelo', 'No', 'Adquirir una biofábrica'];
  const r = Object.fromEntries(ctx.construirLead_(fila, h, 'x').map((v, i) => [columnas[i], v]));
  assert.equal(r.Origen, 'Formulario anterior');
  assert.equal(r.Ruta, 'Biofábrica completa');
  assert.equal(r['Recomendación calculada'], '');
  assert.equal(r['Práctica actual'], 'Convencional');
  assert.equal(r.Puntaje, 35 + 8 + 10);
  const si = ctx.construirLead_(fila.slice(0, 10).concat(['Sí', 'Programar una visita']), h, 'x');
  assert.equal(si[columnas.indexOf('Práctica actual')], 'Usa microorganismos (sin detalle)');
  assert.equal(si[columnas.indexOf('Ruta')], 'Diagnóstico en campo');
});
test('el gasto se lee aunque el encabezado diga «gastas»', () => {
  const h = headers.slice(); h[8] = '¿Cuánto gastas aproximadamente al mes en microorganismos / bioinsumos por hectárea?';
  const fila = ['2026-10-01', 'n', 'c', '+520000000000', 'r', 'Jalisco', 'Berries', '11 a 50 ha', '$800', 'Suelo', ''];
  assert.equal(ctx.construirLead_(fila, h, 'x')[columnas.indexOf('Gasto MXN/ha/mes')], 800);
});
test('el país solo es México con evidencia', () => {
  assert.equal(ctx.detectarPais_('Zapopan, Jalisco', ''), 'México');
  assert.equal(ctx.detectarPais_('Rancho X', '33 1234 5678'), 'México');
  assert.equal(ctx.detectarPais_('Rancho X', '+52 1 33 1234 5678'), 'México');
  assert.equal(ctx.detectarPais_('Madrid, España', '+34 600 000 000'), 'España');
  assert.equal(ctx.detectarPais_('McAllen', '+1 956 000 0000'), 'Estados Unidos');
  assert.equal(ctx.detectarPais_('Lima, Perú', ''), 'Perú');
  assert.equal(ctx.detectarPais_('Neiva', ''), 'Colombia');
  assert.equal(ctx.detectarPais_('Finca', '+502 5555 5555'), 'Guatemala');
  assert.equal(ctx.detectarPais_('Finca', ''), 'Por confirmar');
});
test('el ID busca el correo por encabezado y conserva el formato anterior', () => {
  const fila = ['2026-10-01', 'n', 'A@B.com', 'w'];
  const antes = ctx.generarId_(fila);
  assert.equal(ctx.generarId_(fila, ['Marca temporal', 'Nombre', 'Correo electrónico', 'WhatsApp']), antes);
  assert.equal(ctx.generarId_(['2026-10-01', 'A@B.com', 'n', 'w'], ['Marca temporal', 'Correo', 'Nombre', 'WhatsApp']), antes);
});
test('marcarVenta reconoce el monitoreo guardado como «Sí»', () => {
  const src = fs.readFileSync(`${__dirname}/src/Código.js`, 'utf8');
  assert.match(src, /\/\^s\[ií\]\$\/i\.test\(String\(v\('Monitoreo'\)\)\)/);
});
