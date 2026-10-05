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
