/**
 * Biofábrica 2.0 — Leads y Ventas
 *
 * Lee las respuestas crudas del formulario y las convierte en una hoja de
 * trabajo con columnas de verdad, puntaje de intención de compra y
 * seguimiento post venta.
 *
 * La hoja de respuestas NO se toca: se lee y se copia. Así los endpoints
 * viejos que siguen escribiendo ahí no rompen nada.
 *
 * INSTALACIÓN
 *   1. Extensiones → Apps Script
 *   2. Pega este archivo completo, reemplazando lo que haya
 *   3. Revisa CONFIG aquí abajo
 *   4. Ejecuta la función  instalar
 *   5. Recarga la hoja: aparece el menú "Biofábrica"
 */

const CONFIG = {
  // Hoja donde caen las respuestas del formulario. Es de solo lectura para
  // este script. Si algún día cambia el formulario, actualiza este id.
  ORIGEN_ID: '1VHa90-2EhdV94lhUTa5tak-YV9hWCkhBT2NdT_T7DYY',

  // Cada cuántos días toca mantenimiento. Ajústalo a lo que ofrezca Servicio:
  // 180 es un supuesto mío, no un dato que me hayan dado.
  DIAS_MANTENIMIENTO: 180,

  // Cuántos días sin contactar antes de que un lead se marque como frío.
  DIAS_LEAD_FRIO: 7
};

const HOJA_LEADS  = 'Leads';
const HOJA_VENTAS = 'Ventas';
const HOJA_TABLERO = 'Tablero';

const COLUMNAS_LEADS = [
  'Fecha', 'Puntaje', 'Prioridad', 'Etapa', 'Vendedor', 'Próximo contacto',
  'Nombre', 'WhatsApp', 'Correo', 'Rancho o empresa', 'Ubicación', 'Estado', 'País',
  'Cultivos', 'Superficie (ha)', 'Práctica actual', 'Gasto MXN/ha/mes',
  'Meses activos', 'Gasto anual MXN',
  'Problema principal', 'Todos los problemas',
  'Ruta', 'Cepas sugeridas', 'Monitoreo', 'Total cotizado MXN', 'Recuperación (meses)',
  'Forma de pago', 'Interés financiamiento',
  'Origen', 'Notas', 'ID'
];

const COLUMNAS_VENTAS = [
  'Fecha de venta', 'Cliente', 'WhatsApp', 'Estado', 'Cultivos',
  'Equipo vendido', 'Monto MXN', 'Forma de pago',
  'Días desde la venta', 'Último mantenimiento', 'Próximo mantenimiento',
  'Días para mantenimiento', 'Semáforo', 'Estatus', 'Observaciones', 'ID lead'
];

/* ───────────────────────── Menú ───────────────────────── */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Biofábrica')
    .addItem('Sincronizar leads', 'sincronizar')
    .addItem('Marcar fila como venta', 'marcarVenta')
    .addSeparator()
    .addItem('Reprocesar todo', 'reprocesar')
    .addSeparator()
    .addItem('Reinstalar estructura', 'instalar')
    .addToUi();
}

/* ─────────────────── Construcción inicial ─────────────────── */

function instalar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const leads = prepararHoja_(ss, HOJA_LEADS, COLUMNAS_LEADS);
  const ventas = prepararHoja_(ss, HOJA_VENTAS, COLUMNAS_VENTAS);
  prepararTablero_(ss);

  // La primera hoja vacía que trae todo archivo nuevo estorba
  const sobrante = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1') || ss.getSheetByName('Hoja1');
  if (sobrante && ss.getSheets().length > 1) ss.deleteSheet(sobrante);

  // Listas desplegables: que nadie escriba la etapa a mano
  aplicarLista_(leads, 'Etapa', ['Nuevo', 'Contactado', 'Cotizado', 'Negociación', 'Ganado', 'Perdido']);
  aplicarLista_(ventas, 'Estatus', ['Instalado', 'En operación', 'Requiere servicio', 'Inactivo']);

  formatoNumero_(leads, ['Superficie (ha)', 'Meses activos', 'Recuperación (meses)', 'Puntaje'], '0');
  formatoNumero_(leads, ['Gasto MXN/ha/mes', 'Gasto anual MXN', 'Total cotizado MXN'], '$#,##0');
  formatoNumero_(ventas, ['Monto MXN'], '$#,##0');
  formatoNumero_(ventas, ['Días desde la venta', 'Días para mantenimiento'], '0');

  colorearPrioridad_(leads);
  colorearSemaforo_(ventas);

  ss.setActiveSheet(leads);
  SpreadsheetApp.getUi().alert(
    'Estructura lista.\n\n' +
    'Ahora usa «Biofábrica → Sincronizar leads» para traer las respuestas.\n\n' +
    'Recuerda revisar DIAS_MANTENIMIENTO en el script: puse 180 como supuesto.'
  );
}

function prepararHoja_(ss, nombre, columnas) {
  let h = ss.getSheetByName(nombre);
  if (!h) h = ss.insertSheet(nombre);
  h.getRange(1, 1, 1, columnas.length).setValues([columnas]);
  h.getRange(1, 1, 1, columnas.length)
    .setFontWeight('bold').setBackground('#1a3c2a').setFontColor('#ffffff')
    .setVerticalAlignment('middle').setWrap(true);
  h.setFrozenRows(1);
  h.setRowHeight(1, 42);
  if (h.getMaxColumns() > columnas.length) {
    h.deleteColumns(columnas.length + 1, h.getMaxColumns() - columnas.length);
  }
  return h;
}

function prepararTablero_(ss) {
  let t = ss.getSheetByName(HOJA_TABLERO);
  if (!t) t = ss.insertSheet(HOJA_TABLERO);
  t.clear();

  const sep = separadorDeArgumentos_(t);

  /* Las referencias salen de las constantes, no de letras escritas a mano:
     si manana se agrega una columna, el tablero no queda apuntando a otra. */
  const L = (n) => 'Leads!' + columnaLetra_(COLUMNAS_LEADS.indexOf(n) + 1) + '2:' +
                   columnaLetra_(COLUMNAS_LEADS.indexOf(n) + 1);
  const V = (n) => 'Ventas!' + columnaLetra_(COLUMNAS_VENTAS.indexOf(n) + 1) + '2:' +
                   columnaLetra_(COLUMNAS_VENTAS.indexOf(n) + 1);
  const fn = (nombre, args) => nombre + '(' + args.join(sep) + ')';

  const filas = [
    ['Biofábrica 2.0 — Tablero', null, null],
    ['', null, null],
    ['Leads totales',              '=' + fn('COUNTA', [L('Fecha')]),
     (l, v) => l.length],
    ['Prioridad alta',             '=' + fn('COUNTIF', [L('Prioridad'), '"Alta"']),
     (l, v) => l.filter(f => f['Prioridad'] === 'Alta').length],
    ['Sin contactar',              '=' + fn('COUNTIF', [L('Etapa'), '"Nuevo"']),
     (l, v) => l.filter(f => f['Etapa'] === 'Nuevo').length],
    ['Valor cotizado en pipeline', '=' + fn('SUMIF', [L('Etapa'), '"<>Perdido"', L('Total cotizado MXN')]),
     (l, v) => l.filter(f => f['Etapa'] !== 'Perdido').reduce((a, f) => a + (Number(f['Total cotizado MXN']) || 0), 0)],
    ['', null, null],
    ['Ventas cerradas',            '=' + fn('COUNTA', [V('Fecha de venta')]),
     (l, v) => v.length],
    ['Monto vendido',              '=' + fn('SUM', [V('Monto MXN')]),
     (l, v) => v.reduce((a, f) => a + (Number(f['Monto MXN']) || 0), 0)],
    ['Equipos por atender',        '=' + fn('COUNTIF', [V('Semáforo'), '"Vencido"']) + '+' +
                                          fn('COUNTIF', [V('Semáforo'), '"Por vencer"']),
     (l, v) => v.filter(f => f['Semáforo'] === 'Vencido' || f['Semáforo'] === 'Por vencer').length],
    ['', null, null],
    ['Última sincronización', null, null]
  ];

  filas.forEach((f, i) => {
    t.getRange(i + 1, 1).setValue(f[0]);
    if (f[1]) t.getRange(i + 1, 2).setFormula(f[1]);
  });

  /* Verificar en vez de confiar: si alguna formula quedo en #ERROR pese al
     separador detectado, se calcula el numero aqui y se escribe plano. Vale
     mas un tablero fijo que se relee al sincronizar, que uno roto. */
  const fallidas = [];
  filas.forEach((f, i) => {
    if (!f[1]) return;
    const celda = t.getRange(i + 1, 2);
    if (String(celda.getValue()).indexOf('#') === 0) fallidas.push(i);
  });
  if (fallidas.length) {
    const leads = filasComoObjetos_(ss.getSheetByName(HOJA_LEADS), COLUMNAS_LEADS);
    const ventas = filasComoObjetos_(ss.getSheetByName(HOJA_VENTAS), COLUMNAS_VENTAS);
    fallidas.forEach(i => t.getRange(i + 1, 2).setValue(filas[i][2](leads, ventas)));
    t.getRange(13, 1).setValue('Nota: el tablero quedó con números fijos, no con fórmulas. ' +
                               'Se actualiza cada vez que sincronizas.');
    t.getRange(13, 1).setFontColor('#7f6000').setFontStyle('italic');
  }

  t.getRange(1, 1).setFontSize(16).setFontWeight('bold').setFontColor('#1a3c2a');
  t.getRange(3, 1, 9, 1).setFontWeight('bold');
  t.getRange(6, 2).setNumberFormat('$#,##0');
  t.getRange(9, 2).setNumberFormat('$#,##0');
  t.setColumnWidth(1, 260);
  t.setColumnWidth(2, 160);
}

/**
 * Apps Script escribe las formulas en el idioma de la hoja: donde el separador
 * de argumentos es ";", una formula con comas queda en #ERROR!. En vez de
 * deducirlo del locale, se prueba con una suma y se ve que sale.
 */
function separadorDeArgumentos_(hoja) {
  const celda = hoja.getRange(1, 12);   // fuera de lo que se muestra
  celda.setFormula('=SUM(1,1)');
  const sep = celda.getValue() === 2 ? ',' : ';';
  celda.clearContent();
  PropertiesService.getDocumentProperties().setProperty('separador', sep);
  return sep;
}

/** El separador ya averiguado. Se sondea la primera vez y se guarda. */
function separador_() {
  const props = PropertiesService.getDocumentProperties();
  const guardado = props.getProperty('separador');
  if (guardado) return guardado;
  /* Se sondea en el Tablero: Leads y Ventas quedan recortadas a sus columnas
     y no tienen una celda libre donde escribir la prueba. */
  const t = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_TABLERO);
  return t ? separadorDeArgumentos_(t) : ',';
}

/** Las filas de una hoja como objetos {columna: valor}, para calcular en JS. */
function filasComoObjetos_(hoja, columnas) {
  if (!hoja) return [];
  const n = hoja.getLastRow() - 1;
  if (n < 1) return [];
  return hoja.getRange(2, 1, n, columnas.length).getValues().map(fila => {
    const o = {};
    columnas.forEach((c, i) => { o[c] = fila[i]; });
    return o;
  });
}

/* ─────────────── Traer y parsear las respuestas ─────────────── */

function sincronizar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const leads = ss.getSheetByName(HOJA_LEADS);
  if (!leads) { SpreadsheetApp.getUi().alert('Falta la hoja Leads. Ejecuta «Reinstalar estructura».'); return; }

  const origen = hojaDeRespuestas_(SpreadsheetApp.openById(CONFIG.ORIGEN_ID));
  if (!origen) { SpreadsheetApp.getUi().alert('No encontré la pestaña de respuestas en el archivo de origen.'); return; }
  const datos = origen.getDataRange().getValues();
  if (datos.length < 2) { SpreadsheetApp.getUi().alert('La hoja de respuestas está vacía.'); return; }

  const encabezados = datos[0].map(h => String(h).trim());
  const idsExistentes = leadsExistentes_(leads);

  const nuevas = [];
  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    const id = generarId_(fila);
    if (idsExistentes[id]) continue;      // ya está: no se duplica
    nuevas.push(construirLead_(fila, encabezados, id));
  }

  if (nuevas.length) {
    leads.getRange(leads.getLastRow() + 1, 1, nuevas.length, COLUMNAS_LEADS.length).setValues(nuevas);
    ordenarPorPuntaje_(leads);
  }

  prepararTablero_(ss);
  ss.getSheetByName(HOJA_TABLERO).getRange(12, 2).setValue(new Date());

  SpreadsheetApp.getUi().alert(
    nuevas.length ? ('Se agregaron ' + nuevas.length + ' lead(s).') : 'No hay leads nuevos.'
  );
}

/** Busca la pestaña que trae las respuestas, en vez de asumir que es la primera:
    el archivo puede tener hojas de apoyo antes que la buena. */
function hojaDeRespuestas_(ss) {
  const hojas = ss.getSheets();
  for (let i = 0; i < hojas.length; i++) {
    const h = hojas[i];
    if (h.getLastRow() < 1 || h.getLastColumn() < 1) continue;
    const fila = h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0].join(' ').toLowerCase();
    if (fila.indexOf('marca temporal') !== -1 || fila.indexOf('timestamp') !== -1) return h;
  }
  return hojas.length ? hojas[0] : null;
}

function leadsExistentes_(leads) {
  const col = COLUMNAS_LEADS.indexOf('ID') + 1;
  const n = leads.getLastRow() - 1;
  const mapa = {};
  if (n < 1) return mapa;
  leads.getRange(2, col, n, 1).getValues().forEach(r => { if (r[0]) mapa[r[0]] = true; });
  return mapa;
}

/** Huella de la fila: marca temporal más correo. Evita duplicar al re-sincronizar. */
function generarId_(fila) {
  const marca = fila[0] instanceof Date ? fila[0].toISOString() : String(fila[0]);
  return (marca + '|' + String(fila[2] || '')).replace(/\s+/g, '').toLowerCase();
}

function construirLead_(fila, encabezados, id) {
  const col = (frag) => {
    const i = encabezados.findIndex(h => h.toLowerCase().indexOf(frag.toLowerCase()) !== -1);
    return i === -1 ? '' : fila[i];
  };

  /* El resumen del embudo viaja en alguna celda con formato
     "CLAVE: valor | CLAVE: valor". Se busca por contenido y no por posición,
     porque las columnas del formulario se han movido varias veces. */
  let resumen = '';
  for (let i = 0; i < fila.length; i++) {
    const v = String(fila[i] || '');
    if (v.indexOf('RUTA:') !== -1) { resumen = v; break; }
  }
  const r = parsearResumen_(resumen);
  const delEmbudo = !!resumen;

  const ubicacion = String(col('Ubicación') || '').replace(/\s*\|\s*Estado:.*$/i, '').trim();
  const estado = r['Estado'] || estadoDesde_(ubicacion);
  const pais = detectarPais_(ubicacion, String(col('WhatsApp') || ''));

  const superficie = numero_(r['Superficie'] !== undefined ? r['Superficie'] : col('Superficie total'));
  const gasto = numero_(r['Gasto'] !== undefined ? r['Gasto'] : col('Cuánto inviertes'));
  const meses = numero_((r['Meses con gasto'] || '').split(',').filter(String).length) || '';
  const total = numero_(r['Total']);
  const recup = mesesDesdeTexto_(r['Recuperacion'] || r['Recuperación']);

  const puntaje = calcularPuntaje_({
    ruta: r['RUTA'] || '',
    practica: r['Practica'] || r['Práctica'] || '',
    superficie: superficie,
    recuperacion: recup,
    financiamiento: /INTERESADO/i.test(r['Financiamiento'] || '')
  });

  const registro = {};
  registro['Fecha'] = fila[0];
  registro['Puntaje'] = puntaje;
  registro['Prioridad'] = puntaje >= 65 ? 'Alta' : (puntaje >= 40 ? 'Media' : 'Baja');
  registro['Etapa'] = 'Nuevo';
  registro['Vendedor'] = '';
  registro['Próximo contacto'] = '';
  registro['Nombre'] = col('Nombre Completo');
  registro['WhatsApp'] = col('WhatsApp');
  registro['Correo'] = col('Correo');
  registro['Rancho o empresa'] = col('Rancho');
  registro['Ubicación'] = ubicacion;
  registro['Estado'] = estado;
  registro['País'] = pais;
  registro['Cultivos'] = etiquetaCultivos_(r['Cultivos'] || r['Cultivo'] || col('Cultivo Principal'));
  registro['Superficie (ha)'] = superficie;
  registro['Práctica actual'] = etiquetaPractica_(r['Practica'] || r['Práctica']);
  registro['Gasto MXN/ha/mes'] = gasto;
  registro['Meses activos'] = meses;
  registro['Gasto anual MXN'] = numero_(r['Gasto anual por ha']) && superficie
      ? numero_(r['Gasto anual por ha']) * superficie : '';
  registro['Problema principal'] = etiquetaProblema_(r['Problema principal']) || col('principal problema');
  registro['Todos los problemas'] = r['Problemas seleccionados'] || '';
  registro['Ruta'] = etiquetaRuta_(r['RUTA']);
  registro['Cepas sugeridas'] = r['Cepas'] || '';
  registro['Monitoreo'] = r['Monitoreo'] ? (/^s[ií]$/i.test(r['Monitoreo']) ? 'Sí' : 'No') : '';
  registro['Total cotizado MXN'] = total;
  registro['Recuperación (meses)'] = recup;
  registro['Forma de pago'] = r['Forma de pago'] || '';
  registro['Interés financiamiento'] = /INTERESADO/i.test(r['Financiamiento'] || '') ? 'Sí' : 'No';
  registro['Origen'] = delEmbudo ? 'Embudo /biofabrica' : 'Formulario anterior';
  /* Avisos automaticos: hay cifras que se ven como dato duro sin serlo, y
     Ventas no tiene por que adivinar cuales. */
  const avisos = [];
  const superficieCruda = String(r['Superficie'] !== undefined ? r['Superficie'] : col('Superficie total') || '');
  if (!delEmbudo && /\d\s*(a|-|–|hasta)\s*\d|menos de|m[aá]s de/i.test(superficieCruda)) {
    avisos.push('Superficie estimada del tramo «' + superficieCruda.trim() + '»: confirmar');
  }
  if (pais !== 'México' && gasto) {
    avisos.push('El gasto viene en moneda de ' + pais + ', no en MXN: convertir');
  }
  registro['Notas'] = avisos.join(' · ');
  registro['ID'] = id;

  return COLUMNAS_LEADS.map(c => registro[c] !== undefined ? registro[c] : '');
}

function parsearResumen_(texto) {
  const out = {};
  if (!texto) return out;
  String(texto).split('|').forEach(parte => {
    const i = parte.indexOf(':');
    if (i === -1) return;
    out[parte.slice(0, i).trim()] = parte.slice(i + 1).trim();
  });
  return out;
}

/* ───────────────────── Intención de compra ───────────────────── */

/**
 * Puntaje de 0 a 100. Las señales pesan según lo que de verdad predice una
 * compra, no según lo que es fácil de medir:
 *
 *  - La ruta que le tocó, que ya resume si la economía le cierra
 *  - Que hoy YA gaste dinero en esto: es un comprador validado
 *  - Que la inversión se recupere rápido
 *  - El tamaño de la operación
 *  - Que haya pedido información de financiamiento
 */
function calcularPuntaje_(d) {
  let p = 0;

  const porRuta = { completa: 35, gradual: 25, mejoras: 25, litros: 10, campo: 5 };
  p += porRuta[String(d.ruta).toLowerCase()] || 0;

  const porPractica = { compro: 20, produzco: 15, quimicos: 8, nada: 5 };
  p += porPractica[String(d.practica).toLowerCase()] || 0;

  if (d.recuperacion) {
    if (d.recuperacion <= 12) p += 20;
    else if (d.recuperacion <= 24) p += 12;
    else if (d.recuperacion <= 36) p += 6;
  }

  const ha = Number(d.superficie) || 0;
  if (ha >= 100) p += 15;
  else if (ha >= 50) p += 10;
  else if (ha >= 20) p += 6;
  else if (ha > 0) p += 3;

  if (d.financiamiento) p += 10;

  return Math.min(100, p);
}

/* ─────────────────── Pasar un lead a venta ─────────────────── */

function marcarVenta() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const leads = ss.getSheetByName(HOJA_LEADS);
  const ventas = ss.getSheetByName(HOJA_VENTAS);
  const ui = SpreadsheetApp.getUi();

  if (ss.getActiveSheet().getName() !== HOJA_LEADS) {
    ui.alert('Ponte en la hoja Leads, sobre la fila del cliente, y vuelve a intentar.');
    return;
  }
  const fila = ss.getActiveRange().getRow();
  if (fila < 2) { ui.alert('Selecciona la fila de un lead.'); return; }

  const v = (nombre) => leads.getRange(fila, COLUMNAS_LEADS.indexOf(nombre) + 1).getValue();
  const hoy = new Date();

  const registro = {};
  registro['Fecha de venta'] = hoy;
  registro['Cliente'] = v('Rancho o empresa') || v('Nombre');
  registro['WhatsApp'] = v('WhatsApp');
  registro['Estado'] = v('Estado');
  registro['Cultivos'] = v('Cultivos');
  registro['Equipo vendido'] = v('Cepas sugeridas')
      ? ('Biorreactor' + (v('Monitoreo') === 'si' ? ' + monitoreo' : '') + ' · ' + v('Cepas sugeridas'))
      : '';
  registro['Monto MXN'] = v('Total cotizado MXN');
  registro['Forma de pago'] = v('Forma de pago');
  registro['Último mantenimiento'] = hoy;
  registro['Estatus'] = 'Instalado';
  registro['Observaciones'] = '';
  registro['ID lead'] = v('ID');

  const destino = ventas.getLastRow() + 1;
  ventas.getRange(destino, 1, 1, COLUMNAS_VENTAS.length)
        .setValues([COLUMNAS_VENTAS.map(c => registro[c] !== undefined ? registro[c] : '')]);

  /* Las columnas calculadas van como formula, para que se actualicen solas.
     El separador sale de la sonda: con comas donde toca punto y coma, estas
     cuatro celdas quedarian en #ERROR! igual que le paso al Tablero. */
  const sep = separador_();
  const c = (n) => columnaLetra_(COLUMNAS_VENTAS.indexOf(n) + 1) + destino;
  const si = (args) => '=IF(' + args.join(sep) + ')';
  const celda = (n) => ventas.getRange(destino, COLUMNAS_VENTAS.indexOf(n) + 1);

  celda('Días desde la venta')
    .setFormula(si([c('Fecha de venta') + '=""', '""', 'TODAY()-' + c('Fecha de venta')]));
  celda('Próximo mantenimiento')
    .setFormula(si([c('Último mantenimiento') + '=""', '""',
                    c('Último mantenimiento') + '+' + CONFIG.DIAS_MANTENIMIENTO]));
  celda('Días para mantenimiento')
    .setFormula(si([c('Próximo mantenimiento') + '=""', '""',
                    c('Próximo mantenimiento') + '-TODAY()']));
  celda('Semáforo')
    .setFormula('=IFS(' + [
      c('Días para mantenimiento') + '=""', '""',
      c('Días para mantenimiento') + '<0', '"Vencido"',
      c('Días para mantenimiento') + '<=30', '"Por vencer"',
      'TRUE', '"Al día"'
    ].join(sep) + ')');

  leads.getRange(fila, COLUMNAS_LEADS.indexOf('Etapa') + 1).setValue('Ganado');
  ss.setActiveSheet(ventas);
  ui.alert('Listo. El lead pasó a Ventas y quedó marcado como Ganado.');
}

/* ───────────────────────── Auxiliares ───────────────────────── */

function numero_(v) {
  if (v === '' || v === null || v === undefined) return '';
  if (typeof v === 'number') return v;
  const s = String(v).trim();

  /* El formulario viejo pregunta por tramos: "11 a 50 ha". Pegar los digitos
     daria 1150 hectareas, asi que se toma el punto medio del tramo, que es lo
     estandar para respuestas agrupadas. */
  const tramo = s.match(/(\d[\d.,]*)\s*(?:a|-|–|hasta)\s*(\d[\d.,]*)/i);
  if (tramo) {
    let a = limpiarNumero_(tramo[1]);
    const b = limpiarNumero_(tramo[2]);
    if (a !== '' && b !== '') {
      // "$5-15,000" quiere decir 5 mil a 15 mil: el primer numero hereda la
      // escala del segundo cuando quedo abreviado.
      while (b >= 1000 && a > 0 && a < b / 100) a *= 1000;
      return Math.round((a + b) / 2);
    }
  }

  const m = s.match(/\d[\d.,]*/);
  return m ? limpiarNumero_(m[0]) : '';
}

/**
 * Decide si el ultimo separador es decimal o de miles por cuantos digitos lo
 * siguen: tres digitos => miles. Asi "219,000" son doscientos diecinueve mil
 * y "2.8" siguen siendo dos coma ocho, sin importar la coma o el punto.
 *
 * Ojo: "1.000.000" de un lead colombiano queda como 1000000, correcto como
 * numero pero sigue estando en pesos colombianos. La columna Pais los delata.
 */
function limpiarNumero_(s) {
  const t = String(s).replace(/[^\d.,]/g, '');
  if (!t) return '';
  const ultimo = Math.max(t.lastIndexOf(','), t.lastIndexOf('.'));
  let n;
  if (ultimo === -1) {
    n = parseFloat(t);
  } else if (t.length - ultimo - 1 === 3) {
    n = parseFloat(t.replace(/[.,]/g, ''));
  } else {
    n = parseFloat(t.slice(0, ultimo).replace(/[.,]/g, '') + '.' + t.slice(ultimo + 1));
  }
  return isNaN(n) ? '' : n;
}

function mesesDesdeTexto_(t) {
  if (!t) return '';
  const s = String(t);
  const n = parseFloat(s.replace(',', '.'));
  if (isNaN(n)) return '';
  return /año/i.test(s) ? Math.round(n * 12) : Math.round(n);
}

function detectarPais_(ubicacion, telefono) {
  const u = String(ubicacion).toLowerCase();
  const t = String(telefono);
  if (/guatemala|\+502/.test(u + t)) return 'Guatemala';
  if (/colombia|neiva|bogot|medell/.test(u) || /^\+?57\d{10}/.test(t)) return 'Colombia';
  if (/per[uú]|\+51/.test(u + t)) return 'Perú';
  if (/chile|\+56/.test(u + t)) return 'Chile';
  return 'México';
}

const ESTADOS_MX = ['Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas',
  'Chihuahua','Ciudad de México','Coahuila','Colima','Durango','Estado de México','Guanajuato',
  'Guerrero','Hidalgo','Jalisco','Michoacán','Morelos','Nayarit','Nuevo León','Oaxaca','Puebla',
  'Querétaro','Quintana Roo','San Luis Potosí','Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala',
  'Veracruz','Yucatán','Zacatecas'];

function estadoDesde_(texto) {
  const t = String(texto).toLowerCase();
  for (let i = 0; i < ESTADOS_MX.length; i++) {
    if (t.indexOf(ESTADOS_MX[i].toLowerCase()) !== -1) return ESTADOS_MX[i];
  }
  return '';
}

function etiquetaRuta_(r) {
  const m = { completa:'Biofábrica completa', gradual:'Entrada gradual', litros:'Litros terminados',
              mejoras:'Mejoras a equipo propio', campo:'Diagnóstico en campo' };
  return m[String(r).toLowerCase()] || r || '';
}

/** El embudo manda los ids del catalogo ("aguacate,cana"). Ventas lee nombres. */
function etiquetaCultivos_(c) {
  const m = { berries:'Berries', aguacate:'Aguacate', frutales:'Otros frutales',
              agave:'Agave', cana:'Caña de azúcar', granos:'Granos',
              hortalizas:'Hortalizas', otro:'Otro cultivo' };
  if (!c) return '';
  const partes = String(c).split(',').map(x => x.trim()).filter(String);
  /* Solo se traduce si TODO son ids del catalogo. El formulario viejo trae
     texto libre como "Berries (Frambuesa, Arandano, Zarzamora)", que partido
     por comas quedaria destrozado. */
  if (partes.length && partes.every(x => m[x.toLowerCase()])) {
    return partes.map(x => m[x.toLowerCase()]).join(' / ');
  }
  return String(c).trim();
}

/** Debe seguir al catalogo PROBLEMAS de biofabrica.htm. */
function etiquetaProblema_(p) {
  const m = { costo:'Costo elevado de insumos biológicos', suelo:'Degradación del suelo',
              patogenos:'Patógenos radiculares', nutrientes:'Baja absorción de nutrientes',
              foliar:'Enfermedades foliares', plagas:'Presión de plagas' };
  return p ? (m[String(p).toLowerCase()] || p) : '';
}

function etiquetaPractica_(p) {
  const m = { compro:'Compra preparados', produzco:'Ya produce', quimicos:'Sólo químicos', nada:'No usa' };
  return m[String(p).toLowerCase()] || p || '';
}

function ordenarPorPuntaje_(leads) {
  const n = leads.getLastRow() - 1;
  if (n < 2) return;
  leads.getRange(2, 1, n, COLUMNAS_LEADS.length)
       .sort([{ column: COLUMNAS_LEADS.indexOf('Puntaje') + 1, ascending: false },
              { column: COLUMNAS_LEADS.indexOf('Fecha') + 1, ascending: false }]);
}

function aplicarLista_(hoja, columna, opciones) {
  const c = COLUMNAS_LEADS.indexOf(columna) + 1 || COLUMNAS_VENTAS.indexOf(columna) + 1;
  const regla = SpreadsheetApp.newDataValidation().requireValueInList(opciones, true).build();
  hoja.getRange(2, c, 500, 1).setDataValidation(regla);
}

function formatoNumero_(hoja, columnas, formato) {
  const lista = hoja.getName() === HOJA_LEADS ? COLUMNAS_LEADS : COLUMNAS_VENTAS;
  columnas.forEach(n => {
    const c = lista.indexOf(n) + 1;
    if (c > 0) hoja.getRange(2, c, 500, 1).setNumberFormat(formato);
  });
}

function colorearPrioridad_(hoja) {
  const c = columnaLetra_(COLUMNAS_LEADS.indexOf('Prioridad') + 1);
  const rango = hoja.getRange(2, COLUMNAS_LEADS.indexOf('Prioridad') + 1, 500, 1);
  hoja.setConditionalFormatRules([
    reglaTexto_(rango, 'Alta',  '#d9ead3', '#274e13'),
    reglaTexto_(rango, 'Media', '#fff2cc', '#7f6000'),
    reglaTexto_(rango, 'Baja',  '#f3f3f3', '#666666')
  ]);
}

function colorearSemaforo_(hoja) {
  const rango = hoja.getRange(2, COLUMNAS_VENTAS.indexOf('Semáforo') + 1, 500, 1);
  hoja.setConditionalFormatRules([
    reglaTexto_(rango, 'Vencido',    '#f4cccc', '#990000'),
    reglaTexto_(rango, 'Por vencer', '#fff2cc', '#7f6000'),
    reglaTexto_(rango, 'Al día',     '#d9ead3', '#274e13')
  ]);
}

function reglaTexto_(rango, texto, fondo, letra) {
  return SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(texto).setBackground(fondo).setFontColor(letra)
    .setRanges([rango]).build();
}

function columnaLetra_(n) {
  let s = '';
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
