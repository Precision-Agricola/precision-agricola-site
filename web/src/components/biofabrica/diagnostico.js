// Lógica del embudo /biofabrica (componente Alpine x-data="diagnostico()").
// Copiada sin cambios de themes/precision-agricola/pages/biofabrica.htm, salvo
// el envío, que ahora usa enviarLead(). Los precios llegan por atributos data-
// desde src/data/cotizador.ts. Antes de tocar precios, cepas o el mapeo de
// leads, lee la skill diagnostico.
import { enviarLead } from '../../scripts/enviar-lead';

/**
 * Medición del embudo.
 *
 * Sin esto no hay forma de saber en qué paso abandona la gente, y afinar una
 * campaña de paga a ciegas es tirar dinero. Queda montado y neutral: si un día
 * se instala el pixel de Meta o Google Tag Manager, los eventos empiezan a
 * fluir solos, sin tocar esta página. Mientras tanto no hace nada y no pesa.
 */
function medir(evento, datos) {
    try {
        const carga = Object.assign({ embudo: 'diagnostico' }, datos || {});
        if (window.dataLayer) window.dataLayer.push(Object.assign({ event: evento }, carga));
        if (typeof window.fbq === 'function') window.fbq('trackCustom', evento, carga);
        if (typeof window.gtag === 'function') window.gtag('event', evento, carga);
    }
    catch (e) {
        /* La medición nunca puede romper el embudo. */
    }
}

export function diagnostico() {
    /* ── Catálogo confirmado (cotización 348) ─────────── */
    /* ── Catálogo · cotización 353 del 21/08/2026 ─────────────────────
       Todos los precios son ANTES DE IVA, igual que la cotización.
       Si se actualizan, se cambian aquí y todo lo demás se recalcula. */
    /* Los precios llegan del backend por atributos data-. El valor tras el
       || es el respaldo: si un campo del panel queda vacio, la pagina sigue
       calculando en vez de llenarse de NaN. */
    const CFG = (function () {
        var n = document.querySelector('.app');
        var d = n ? n.dataset : {};
        var f = function (v, x) { var p = parseFloat(v); return isNaN(p) ? x : p; };
        return {
            litro:      f(d.precio, 150),
            lote:       f(d.precioLote, 24000),
            dosis:      f(d.dosis, 4),
            litrosLote: f(d.litrosLote, 200),
            referencia: f(d.referencia, 900),
            reactor:    f(d.reactor, 30000),
            monitoreo:  f(d.monitoreo, 49000)
        };
    })();

    const P_REACTOR   = CFG.reactor;   // era 149000, ahora del backend   // biorreactor 190 L acero inoxidable
    const P_MONITOREO = CFG.monitoreo;

    /* El lote vuelve a 180 L: es lo que cabe en un tanque de 190 dejando
       cabeza para la espuma de la aireación. La cotización 353 decía 200 L,
       que no caben. Los precios de los paquetes NO cambian.
       La cobertura se deriva de la dosis declarada en la 353 (200 L para
       50 ha, o sea 4 L/ha), así que 180 L alcanzan para 45. */
    const LOTE_L  = CFG.litrosLote;
    const DOSIS_L_HA = CFG.dosis;
    const LOTE_HA = LOTE_L / DOSIS_L_HA;

    /* Precio del litro terminado que vendemos ya producido. Sale de la
       cotización 348, que es la unica que lo trae por escrito. Ojo: los
       precios de equipo de arriba son de la 353, mas reciente. Si Ventas
       actualiza el litro, se cambia aqui y nada mas. */
    const VENTA_LITRO = CFG.litro;

    /* Formas de pago, tal como las cotiza Ventas en la 353.
       El plazo de las mensualidades no está definido todavía, así que aquí
       no se calcula ninguna amortización ni se promete un total: sólo se
       presentan las condiciones y se registra cuál le interesa al productor. */
    const FORMAS_PAGO = [
        { id:'contado',      nom:'De contado',    det:'Precio de lista, sin plazos.' },
        { id:'financiado',   nom:'Con enganche',  det:'Desde $60,000 de enganche y mensualidades de $6,000.' },
        { id:'arrendamiento',nom:'Arrendamiento', det:'$21,500 al mes, con plazo mínimo de 3 meses.' }
    ];

    /* Precios de la COT 353. El catalogo lo actualizo Raul en b519f00 y
       trajo dos cepas que esa cotizacion no incluye: pumilus y safensis.
       Quedan al mismo precio que los otros dos Bacillus del catalogo,
       que es lo unico que se puede sostener con lo que hay. VENTAS DEBE
       CONFIRMARLOS antes de publicar. */
    const CEPAS = [
        { id:'subtilis',      precio:29850, nombre:'Bacillus subtilis',       rol:'Biofungicida y enraizamiento activo', desc:'Destruye paredes celulares de hongos patógenos como Fusarium y Rhizoctonia. También sintetiza hormonas que estimulan un crecimiento radicular vigoroso.' },
        { id:'thuringiensis', precio:29850, nombre:'Bacillus thuringiensis',  rol:'Biocontrol de plagas',                 desc:'Insecticida biológico contra larvas y orugas. Controla plagas sin dejar residuos químicos, ideal para agricultura de exportación.' },
        { id:'pumilus',       precio:29850, nombre:'Bacillus pumilus',        rol:'Inmunidad foliar inducida',            desc:'Activa el sistema de resistencia inducida en hojas y enciende defensas naturales del cultivo contra cenicillas, royas y mildiu antes de que ocurran.' },
        { id:'safensis',      precio:29850, nombre:'Bacillus safensis',       rol:'Desbloqueo mineral y tolerancia al estrés', desc:'Solubiliza fósforo y potasio atrapados en el suelo. Regula el metabolismo de la planta para tolerar sequía, salinidad o calor.' },
        { id:'trichoderma',   precio:33450, nombre:'Trichoderma harzianum',   rol:'Escudo radicular y regeneración',      desc:'Hongo agresivo contra patógenos del suelo. Potencia el crecimiento de la raíz y mejora la estructura del suelo a largo plazo.' },
        { id:'pseudomonas',   precio:29850, nombre:'Pseudomonas spp.',        rol:'Colonización rápida y protección',     desc:'Bacterias de establecimiento rápido que ayudan a combatir patógenos y protegen la raíz desde el primer día.' }
    ];
    const PRECIO_CEPA_MIN = Math.min(...CEPAS.map(c => c.precio));

    /* El costo por litro ya no es un número suelto: sale de los precios de
       arriba, así que no puede quedar desincronizado del catálogo. */
    /* El costo por litro producido sale del precio de la tanda, que ahora
       lo fija Ventas desde el backend. Ya no se deriva del promedio de los
       paquetes de cepas ni se convierte en una tasa plana de ahorro: el
       ahorro depende de la escala, y eso se calcula por operacion. */
    const COSTO_LITRO = CFG.lote / LOTE_L;

    /* Aguacate se deja aparte de los demas frutales aunque lo sea: es el de
       mayor peso comercial y tiene patologia propia (Phytophthora) que cambia
       la cepa recomendada. Por eso los otros se nombran "otros frutales", para
       que las categorias no se encimen. */
    const CULTIVOS = [
        { id:'berries',    icon:'fi-rr-grape',          nom:'Berries',        det:'frambuesa, arándano, zarzamora' },
        { id:'aguacate',   icon:'fi-rr-avocado',        nom:'Aguacate' },
        { id:'frutales',   icon:'fi-rr-tree-deciduous', nom:'Otros frutales', det:'limón, manzana, nogal' },
        { id:'agave',      icon:'fi-rr-cactus',         nom:'Agave' },
        { id:'cana',       icon:'fi-rr-leaf',           nom:'Caña de azúcar' },
        { id:'granos',     icon:'fi-rr-wheat-awn',      nom:'Granos',         det:'maíz, trigo, sorgo' },
        { id:'hortalizas', icon:'fi-rr-carrot',         nom:'Hortalizas' },
        { id:'otro',       icon:'fi-rr-seedling',       nom:'Otro cultivo' }
    ];

    /* Puntajes: el problema pesa más que el cultivo. */
    const POR_PROBLEMA = {
        costo:      { subtilis:1, thuringiensis:1, pumilus:1, safensis:1, trichoderma:1, pseudomonas:1 },
        suelo:      { trichoderma:3, safensis:2, pseudomonas:2, subtilis:1 },
        patogenos:  { trichoderma:3, pseudomonas:2, subtilis:2, pumilus:1 },
        nutrientes: { safensis:3, pseudomonas:2, subtilis:1 },
        foliar:     { pumilus:3, subtilis:1, pseudomonas:1 },
        plagas:     { thuringiensis:3, pumilus:1 }
    };
    const POR_CULTIVO = {
        berries:   { pumilus:2, thuringiensis:1, trichoderma:1, pseudomonas:1 },
        aguacate:  { trichoderma:2, pseudomonas:2, subtilis:1, safensis:1 },
        agave:     { safensis:2, subtilis:1, trichoderma:1 },
        frutales:  { trichoderma:2, pumilus:1, pseudomonas:1, safensis:1 },
        hortalizas:{ trichoderma:2, thuringiensis:2, pumilus:1, pseudomonas:1 },
        granos:    { safensis:2, subtilis:2, thuringiensis:1, pumilus:1 },
        cana:      { safensis:2, subtilis:2, thuringiensis:1 },
        otro:      {}
    };

    /* Orden de los problemas según el cultivo: cada quien ve primero lo suyo. */
    const ORDEN_PROBLEMA = {
        berries:  ['foliar','plagas','patogenos','costo','suelo','nutrientes'],
        aguacate: ['patogenos','suelo','nutrientes','costo','foliar','plagas'],
        agave:    ['suelo','nutrientes','costo','patogenos','foliar','plagas'],
        frutales: ['patogenos','suelo','nutrientes','foliar','costo','plagas'],
        hortalizas:['foliar','plagas','patogenos','nutrientes','suelo','costo'],
        granos:   ['nutrientes','suelo','costo','plagas','patogenos','foliar'],
        cana:     ['nutrientes','suelo','plagas','costo','patogenos','foliar'],
        otro:     ['costo','suelo','patogenos','nutrientes','foliar','plagas']
    };

    /* Etapas reconocibles en campo. No llevan meses: el productor indica el
       estado real del cultivo y esa selección orienta la cotización. Las
       cepas son una guía comercial inicial que debe confirmar un especialista. */
    const FENOLOGIA = {
        aguacate: {
            etapas: [
                { nom: 'Recuperación y brotación', cepas: ['trichoderma', 'subtilis'],
                  porque: 'Entre la cosecha y los nuevos brotes conviene revisar raíz, suelo y reservas del árbol.' },
                { nom: 'Floración', cepas: ['pumilus', 'pseudomonas'],
                  porque: 'La flor es un punto sensible: conviene activar defensa foliar y proteger raíz desde el arranque.' },
                { nom: 'Amarre de fruto', cepas: ['safensis', 'pseudomonas'],
                  porque: 'El cuajado define la carga inicial; conviene vigilar caída de fruto y señales de estrés.' },
                { nom: 'Llenado de fruto', cepas: ['safensis', 'pumilus'],
                  porque: 'Etapa de mayor demanda: minerales disponibles y hoja protegida para sostener el llenado.' },
                { nom: 'Cosecha y postcosecha', cepas: ['trichoderma', 'pseudomonas'],
                  porque: 'Después de la cosecha se evalúan raíces, vigor y reservas antes del siguiente flujo.' }
            ]
        },
        berries: {
            etapas: [
                { nom: 'Establecimiento', cepas: ['trichoderma', 'pseudomonas'],
                  porque: 'Raíz nueva en suelo recién movido: el momento de mayor riesgo de patógenos radiculares.' },
                { nom: 'Crecimiento vegetativo', cepas: ['subtilis', 'pumilus'],
                  porque: 'Se construye la planta que va a producir: raíz activa y defensas foliares listas.' },
                { nom: 'Floración y amarre', cepas: ['safensis', 'pumilus'],
                  porque: 'Minerales disponibles para la flor y resistencia inducida contra enfermedades foliares.' },
                { nom: 'Producción', cepas: ['pumilus', 'subtilis'],
                  porque: 'La cosecha prolongada requiere monitoreo frecuente de fruto, follaje y humedad.' },
                { nom: 'Poda y recuperación', cepas: ['trichoderma', 'subtilis'],
                  porque: 'Se sanea suelo y raíz antes del siguiente establecimiento.' }
            ]
        },
        frutales: {
            etapas: [
                { nom: 'Reposo, poda o renovación', cepas: ['trichoderma', 'subtilis'],
                  porque: 'Según la especie, esta pausa permite ordenar poda, sanidad radicular y suelo.' },
                { nom: 'Brotación y floración', cepas: ['pumilus', 'safensis'],
                  porque: 'Arranque explosivo que consume reservas, con flor y hoja expuestas.' },
                { nom: 'Cuajado', cepas: ['safensis', 'pseudomonas'],
                  porque: 'Define la carga del año. Minerales disponibles y raíz protegida reducen la caída de fruto chico.' },
                { nom: 'Desarrollo de fruto', cepas: ['safensis', 'pumilus'],
                  porque: 'Potasio para calibre y defensa foliar sostenida.' },
                { nom: 'Cosecha y postcosecha', cepas: ['trichoderma', 'pseudomonas'],
                  porque: 'Tras la cosecha conviene recuperar reservas y retirar fruta o tejido enfermo.' }
            ]
        },
        cana: {
            etapas: [
                { nom: 'Germinación y emergencia', cepas: ['trichoderma', 'pseudomonas'],
                  porque: 'La emergencia uniforme establece la población de tallos del nuevo ciclo o rebrote.' },
                { nom: 'Macollamiento', cepas: ['subtilis', 'pseudomonas'],
                  porque: 'Se define el número de tallos por cepa, y eso decide el rendimiento.' },
                { nom: 'Crecimiento rápido', cepas: ['subtilis', 'safensis'],
                  porque: 'Máxima demanda de raíz activa y minerales disponibles bajo estrés.' },
                { nom: 'Maduración', cepas: ['safensis'],
                  porque: 'Disminuye el crecimiento y aumenta la acumulación de sacarosa en los tallos.' },
                { nom: 'Cosecha y rebrote de soca', cepas: ['trichoderma', 'pseudomonas'],
                  porque: 'Después del corte se revisan cepas, residuos y condiciones para el siguiente rebrote.' }
            ]
        },
        granos: {
            etapas: [
                { nom: 'Preparación y siembra', cepas: ['trichoderma', 'pseudomonas'],
                  porque: 'La semilla y la plántula enfrentan el riesgo de patógenos y estrés de establecimiento.' },
                { nom: 'Desarrollo vegetativo', cepas: ['subtilis', 'pumilus'],
                  porque: 'La planta construye su estructura: raíz vigorosa y hoja protegida.' },
                { nom: 'Floración', cepas: ['pumilus', 'safensis'],
                  porque: 'La floración es sensible al estrés y define el número potencial de granos.' },
                { nom: 'Llenado de grano', cepas: ['safensis', 'pumilus'],
                  porque: 'El peso del grano se define aquí; depende de minerales disponibles y hoja funcional.' },
                { nom: 'Madurez y cosecha', cepas: ['trichoderma'],
                  porque: 'El cierre del ciclo permite evaluar residuos y suelo antes de la siguiente siembra.' }
            ]
        },
        hortalizas: {
            etapas: [
                { nom: 'Almácigo y trasplante', cepas: ['trichoderma', 'pseudomonas'],
                  porque: 'La plántula llega con raíz herida: el damping-off es la pérdida más común.' },
                { nom: 'Desarrollo vegetativo', cepas: ['subtilis', 'pumilus'],
                  porque: 'Crecimiento acelerado con raíz activa y defensa foliar temprana.' },
                { nom: 'Floración y cuajado', cepas: ['pumilus', 'safensis'],
                  porque: 'La flor y el fruto recién cuajado son sensibles al estrés hídrico y sanitario.' },
                { nom: 'Desarrollo del órgano de cosecha', cepas: ['safensis', 'subtilis'],
                  porque: 'Fruto, hoja, raíz o cabeza concentran la demanda productiva, según la hortaliza.' },
                { nom: 'Fin de ciclo', cepas: ['trichoderma'],
                  porque: 'Sanear el suelo entre ciclos evita arrastrar inóculo al siguiente.' }
            ]
        },
        agave: {
            etapas: [
                { nom: 'Plantación', cepas: ['trichoderma', 'pseudomonas'],
                  porque: 'El hijuelo debe emitir raíces funcionales y adaptarse al nuevo suelo.' },
                { nom: 'Crecimiento temprano', cepas: ['subtilis', 'pseudomonas'],
                  porque: 'En los primeros años se establece la raíz y comienza la acumulación de biomasa.' },
                { nom: 'Crecimiento medio', cepas: ['subtilis', 'trichoderma'],
                  porque: 'El crecimiento sostenido exige vigilar vigor, heridas, plagas y síntomas de pudrición.' },
                { nom: 'Maduración', cepas: ['safensis'],
                  porque: 'La acumulación de azúcares define el valor de la piña al momento de la jima.' }
            ]
        }
    };

    const ETAPAS_GENERICAS = [
        { nom:'Siembra o establecimiento', cepas:['trichoderma','pseudomonas'], porque:'La raíz inicia su adaptación al suelo y define el establecimiento.' },
        { nom:'Crecimiento vegetativo', cepas:['subtilis','pseudomonas'], porque:'La planta construye raíces, hojas y tallos para sostener la producción.' },
        { nom:'Floración o fase reproductiva', cepas:['pumilus','safensis'], porque:'La fase reproductiva suele ser sensible al estrés y a problemas sanitarios.' },
        { nom:'Producción o cosecha', cepas:['safensis','subtilis'], porque:'El órgano de cosecha concentra la demanda y define la calidad comercial.' }
    ];
    const ETAPA_ASESORIA = {
        nom:'No sé / necesito orientación', cepas:[],
        porque:'Un asesor puede identificar la etapa y el objetivo antes de recomendar una cepa.',
        manejo:'Ten a la mano la edad del cultivo, fecha aproximada de siembra y fotos de planta y raíz.'
    };
    const PROBLEMAS = {
        costo:      { id:'costo',      icon:'fi-rr-sack-dollar',  nom:'Costo de los insumos',
                      sub:'Los biológicos comerciales salen muy caros' },
        suelo:      { id:'suelo',      icon:'fi-rr-land-layers',  nom:'Suelo degradado',
                      sub:'Pérdida de estructura y de fertilidad' },
        patogenos:  { id:'patogenos',  icon:'fi-rr-shield-virus', nom:'Patógenos en la raíz',
                      sub:'Fusarium, Phytophthora y similares' },
        nutrientes: { id:'nutrientes', icon:'fi-rr-plant-growth', nom:'Poca absorción de nutrientes',
                      sub:'Se fertiliza y la planta no responde' },
        foliar:     { id:'foliar',     icon:'fi-rr-leaf',         nom:'Enfermedades en la hoja',
                      sub:'Presión foliar que se repite cada ciclo' },
        plagas:     { id:'plagas',     icon:'fi-rr-bug',          nom:'Presión de plagas',
                      sub:'Larvas, barrenadores y plagas del suelo' }
    };

    /* Banco inicial de datos, escrito a mano y revisable.
       Fase 2 lo amplía desde los papers. */
    const DATOS = {
        /* Las cifras se arman con las constantes del catálogo para que no
           puedan quedar contradiciendo a los precios de arriba. */
        subtilis:      '<strong>Bacillus subtilis</strong> actúa como biofungicida y promotor radicular: ayuda contra Fusarium y Rhizoctonia mientras impulsa un crecimiento de raíz más vigoroso.',
        thuringiensis: '<strong>Bacillus thuringiensis</strong> es el consorcio de biocontrol para larvas y orugas, sin dejar residuos químicos.',
        pumilus:       '<strong>Bacillus pumilus</strong> activa defensas foliares naturales para anticiparse a cenicillas, royas y mildiu.',
        safensis:      '<strong>Bacillus safensis</strong> desbloquea fósforo y potasio del suelo, y ayuda al cultivo a tolerar sequía, salinidad o calor.',
        trichoderma:   '<strong>Trichoderma harzianum</strong> protege la raíz contra patógenos del suelo y favorece regeneración radicular a largo plazo.',
        pseudomonas:   '<strong>Pseudomonas spp.</strong> coloniza rápido la raíz y ayuda a protegerla desde los primeros días de aplicación.'
    };

    return {
        paso: 0,
        etapasPorCultivo: {},
        estado: '',
        ha: 20,
        practica: null,
        gasto: 500,
        /* Arranca con un mes y el productor va sumando. Antes venian los doce
           marcados y habia que ir quitando, que se lee como error. */
        mesesActivos: ['mar'],
        noSabe: false,
        problema: null,
        problemas: [],
        monitoreo: false,
        cepas: [],
        /* Ahora cualquiera puede entrar al configurador, asi que 'palanca' ya
           no dice si lo vio. Estas dos guardan el recorrido real: de que le
           contamos a Ventas y a donde regresa el boton de atras. */
        vioConfigurador: false,
        vengoDe: 6,
        quiereFinanciamiento: false,
        formaPago: "contado",
        FORMAS_PAGO: FORMAS_PAGO,
        enviando: false,
        errorEnvio: false,
        muyRapido: false,
        _t0: Date.now(),

        /* El catalogo vive en la constante CULTIVOS; aqui solo se expone a la
           plantilla, igual que FORMAS_PAGO. La lista de seleccion es 'cultivos'. */
        CULTIVOS: CULTIVOS,
        cultivos: [],
        estadosMexico: [
            'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
            'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima',
            'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo',
            'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca',
            'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa',
            'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán',
            'Zacatecas'
        ],
        practicas: [
            { id:'quimicos',  icon:'fi-rr-ban',              nom:'Manejo convencional',
              sub:'Todavía no uso microorganismos' },
            { id:'compro',    icon:'fi-rr-shopping-cart',    nom:'Los compro formulados',
              sub:'Producto comercial envasado' },
            { id:'artesanal', icon:'fi-rr-flask',            nom:'Los propago en el rancho',
              sub:'Multiplico por mi cuenta, sin equipo' },
            { id:'produzco',  icon:'fi-rr-industry-windows', nom:'Tengo biorreactores',
              sub:'Equipo propio en operación' }
        ],
        mesesDisponibles: [
            { id:'ene', nom:'Ene' }, { id:'feb', nom:'Feb' }, { id:'mar', nom:'Mar' },
            { id:'abr', nom:'Abr' }, { id:'may', nom:'May' }, { id:'jun', nom:'Jun' },
            { id:'jul', nom:'Jul' }, { id:'ago', nom:'Ago' }, { id:'sep', nom:'Sep' },
            { id:'oct', nom:'Oct' }, { id:'nov', nom:'Nov' }, { id:'dic', nom:'Dic' }
        ],

        get avance() {
            /* El orden del recorrido es 0 a 6, luego 8 -la configuracion- y
               al final 7, la captura. Se mapea a mano para que la barra
               avance como el recorrido y no como el numero de paso.

               Depende solo de 'paso', a proposito. Llego a depender de
               'configurable' para repartir mejor las paradas de quien se
               salta el 8, y eso ataba la barra a 'palanca', que sale de las
               cifras que el productor esta capturando: al subir la perilla
               de hectareas de 20 a 50 la barra retrocedia de 50 a 43 por
               ciento. Quien se salta el 8 pasa de 71 a 100 de un salto en
               el ultimo paso; eso es preferible a una barra que se mueve
               sola mientras respondes. */
            const orden = { 0:0, 1:1, 2:2, 3:3, 5:4, 6:5, 8:6, 7:7 };
            const n = orden[this.paso];
            return Math.round(((n === undefined ? 0 : n) / 7) * 100);
        },

        get preguntaGasto() {
            if (this.practica === 'compro')   return '¿Cuánto pagas por ha en un mes activo de microorganismos?';
            if (this.practica === 'artesanal') return '¿Cuánto te cuesta por ha en un mes activo propagar microorganismos?';
            if (this.practica === 'produzco') return '¿Cuánto te cuesta por ha en un mes activo producirlos?';
            if (this.practica === 'quimicos') return '¿Cuánto gastas por ha en un mes activo de fungicidas y fertilizantes?';
            return '¿Cuánto gastas por ha en un mes activo de sanidad y nutrición?';
        },

        get mesesGasto() { return this.mesesActivos.length; },
        get mesesSeleccionadosTxt() {
            if (this.mesesGasto === 0) return 'Elige meses';
            if (this.mesesGasto === 12) return 'Todo el año';
            return this.mesesGasto + (this.mesesGasto === 1 ? ' mes' : ' meses');
        },

        /* Cultivo principal: el primero que eligió. Lo usan el orden de los
           problemas y el campo del Google Form, que sólo admite uno. */
        get cultivo() { return this.cultivos[0] || null; },

        get nombresCultivos() {
            return this.cultivos.map(id => (CULTIVOS.find(c => c.id === id) || {}).nom || id);
        },

        nombreCultivo(id) {
            return (CULTIVOS.find(c => c.id === id) || {}).nom || id;
        },

        toggleCultivo(id) {
            const i = this.cultivos.indexOf(id);
            if (i === -1) {
                this.cultivos.push(id);
            } else {
                this.cultivos.splice(i, 1);
                const restantes = { ...this.etapasPorCultivo };
                delete restantes[id];
                this.etapasPorCultivo = restantes;
            }
            /* Se conserva el orden del catálogo, no el orden en que fue tocando. */
            const orden = CULTIVOS.map(c => c.id);
            this.cultivos.sort((a, b) => orden.indexOf(a) - orden.indexOf(b));
        },

        etapasDeCultivo(id) {
            const guia = FENOLOGIA[id] ? FENOLOGIA[id].etapas : ETAPAS_GENERICAS;
            return [...guia, ETAPA_ASESORIA];
        },
        elegirEtapa(cultivoId, etapaNom) {
            const guardadas = this.etapasPorCultivo[cultivoId];
            let elegidas = Array.isArray(guardadas) ? guardadas.slice() : (guardadas ? [guardadas] : []);
            const esAsesoria = etapaNom === ETAPA_ASESORIA.nom;

            if (esAsesoria) {
                elegidas = elegidas.includes(etapaNom) ? [] : [etapaNom];
            } else {
                elegidas = elegidas.filter(nom => nom !== ETAPA_ASESORIA.nom);
                const i = elegidas.indexOf(etapaNom);
                if (i === -1) elegidas.push(etapaNom);
                else elegidas.splice(i, 1);
            }
            this.etapasPorCultivo = { ...this.etapasPorCultivo, [cultivoId]: elegidas };
        },
        etapaEstaElegida(cultivoId, etapaNom) {
            const elegidas = this.etapasPorCultivo[cultivoId];
            return Array.isArray(elegidas) ? elegidas.includes(etapaNom) : elegidas === etapaNom;
        },
        etapasElegidas(cultivoId) {
            const guardadas = this.etapasPorCultivo[cultivoId];
            const elegidas = Array.isArray(guardadas) ? guardadas : (guardadas ? [guardadas] : []);
            return this.etapasDeCultivo(cultivoId).filter(e => elegidas.includes(e.nom));
        },
        get etapasCompletas() {
            return this.cultivos.length > 0 && this.cultivos.every(id => this.etapasElegidas(id).length > 0);
        },
        get resumenEtapas() {
            return this.cultivos.map(id => this.nombreCultivo(id) + ': ' +
                (this.etapasElegidas(id).map(e => e.nom).join(', ') || 'sin elegir')).join(' · ');
        },
        get cepasSugeridasEtapas() {
            const sugeridas = new Set();
            this.cultivos.forEach(id => this.etapasElegidas(id).forEach(etapa => {
                etapa.cepas.forEach(cepa => sugeridas.add(cepa));
            }));
            return CEPAS.map(c => c.id).filter(id => sugeridas.has(id));
        },
        iconoEtapa(i, total) {
            if (i === total - 1) return 'fi-rr-microscope-bacteria';
            const iconos = ['fi-rr-seedling','fi-rr-plant-growth','fi-rr-leaf','fi-rr-sack-dollar','fi-rr-land-layers'];
            return iconos[Math.min(i, iconos.length - 1)];
        },
        consejoEtapa(nombre) {
            if (/siembra|plantación|establecimiento|almácigo|brote|brotación/i.test(nombre)) {
                return 'Cuida drenaje, humedad uniforme y sanidad del material de establecimiento.';
            }
            if (/floración|cuajado|amarre|reproductiva/i.test(nombre)) {
                return 'Evita estrés de agua y aplicaciones incompatibles con polinizadores durante flor abierta.';
            }
            if (/cosecha|postcosecha|poda|zafra|fin de ciclo/i.test(nombre)) {
                return 'Retira tejido enfermo, limpia herramientas y evalúa la sanidad del suelo para el siguiente ciclo.';
            }
            return 'Ajusta riego y nutrición al vigor real, y confirma el problema sanitario antes de aplicar.';
        },

        get problemasOrdenados() {
            const orden = ORDEN_PROBLEMA[this.cultivo] || ORDEN_PROBLEMA.otro;
            return orden.map(id => PROBLEMAS[id]);
        },

        get problemaPrincipal() {
            return this.problemas[0] || this.problema || null;
        },

        get cepasOrdenadas() {
            const seleccionados = this.problemas.length ? this.problemas : (this.problema ? [this.problema] : []);
            return CEPAS
                .map(c => {
                    const puntosProblema = seleccionados.reduce((total, id) => {
                        const pp = POR_PROBLEMA[id] || {};
                        return total + (pp[c.id] || 0);
                    }, 0);
                    /* Se suma sobre todos los cultivos elegidos: una cepa que
                       sirve para dos de ellos debe pesar más que una que sólo
                       sirve para uno. */
                    const puntosCultivo = this.cultivos.reduce((total, id) => {
                        const pc = POR_CULTIVO[id] || {};
                        return total + (pc[c.id] || 0);
                    }, 0);
                    const puntosEtapa = this.cultivos.reduce((total, id) => {
                        return total + this.etapasElegidas(id).reduce((subtotal, etapa) =>
                            subtotal + (etapa.cepas.includes(c.id) ? 1 : 0), 0);
                    }, 0);
                    return { ...c, _p: puntosProblema * 2 + puntosCultivo + puntosEtapa * 3 };
                })
                .sort((a, b) => b._p - a._p);
        },

        nombreCepa(id) { return (CEPAS.find(c => c.id === id) || {}).nombre || id; },
        get gastoHaAnual() { return this.gasto * this.mesesGasto; },
        /* Expuestos para la plantilla: así el texto que ve el visitante sale
           del catálogo y no de un número escrito a mano que se desincroniza. */
        get loteLitros()  { return LOTE_L; },
        get loteHa()      { return LOTE_HA; },
        /* El precio del equipo se escribia a mano en el markup y el total
           lo sumaba del backend: la ficha decia $129,000 y el total sumaba
           $30,000. Ahora ambos leen lo mismo. */
        get precioReactor()   { return P_REACTOR; },
        get precioMonitoreo() { return P_MONITOREO; },

        get gastoAnual()  { return this.gastoHaAnual * this.ha; },
        /* ── Los dos caminos ───────────────────────────────────────────
           Antes el ahorro era una tasa plana aplicada al gasto declarado, y
           eso le prometia ahorro a quien en realidad perderia dinero: una
           tanda se fermenta entera aunque se ocupe a medias, asi que el
           costo por hectarea depende de que tan bien encaje la superficie.
           Ahora se comparan los dos caminos con el mismo volumen. */
        get litrosAplicacion() { return this.ha * DOSIS_L_HA; },
        get comprarPorHa()     { return VENTA_LITRO * DOSIS_L_HA; },
        get comprarTotal()     { return this.litrosAplicacion * VENTA_LITRO; },

        get tandas()        { return Math.ceil(this.litrosAplicacion / LOTE_L) || 0; },
        get producirTotal() { return this.tandas * CFG.lote; },
        get producirPorHa() { return this.ha > 0 ? this.producirTotal / this.ha : 0; },
        /* El mejor costo posible produciendo, con las tandas al tope. */
        get producirPorHaLleno() { return CFG.lote / LOTE_L * DOSIS_L_HA; },
        get litrosSobrantes()    { return this.tandas * LOTE_L - this.litrosAplicacion; },
        get haQueLlena()         { return (this.tandas * LOTE_L) / DOSIS_L_HA; },

        get convieneProducir() { return this.ha > 0 && this.producirPorHa < this.comprarPorHa; },
        get mejorPorHa()       { return this.convieneProducir ? this.producirPorHa : this.comprarPorHa; },

        /* Lo que se ahorra al ano contra seguir comprando terminado, con los
           meses de aplicacion que el productor declaro. */
        get ahorroHaAnual() {
            return Math.round((this.comprarPorHa - this.mejorPorHa) * this.mesesGasto);
        },
        get ahorroAnual() { return Math.round(this.ahorroHaAnual * this.ha); },
        get costoOnFarmAnual() { return Math.round(this.mejorPorHa * this.mesesGasto * this.ha); },
        get litrosMes()   { return Math.round((this.gasto * this.ha) / VENTA_LITRO); },
        cepaPorId(id) { return CEPAS.find(c => c.id === id) || null; },
        get precioCepas() {
            return this.cepas.reduce((total, id) => {
                const cepa = this.cepaPorId(id);
                return total + (cepa ? cepa.precio : 0);
            }, 0);
        },
        get precioCepaBase() {
            const cepa = this.cepaPorId(this.cepas[0]) || this.cepasOrdenadas[0];
            return (cepa && cepa.precio) || PRECIO_CEPA_MIN;
        },
        get precioEntrada() { return P_REACTOR + this.precioCepaBase; },

        /* Quien ya produce tiene reactor: no se le vuelve a cobrar.
           Depende de 'practica' y no de 'palanca' para no crear un ciclo,
           porque la palanca se decide a partir del precio. */
        get incluyeReactor() { return this.practica !== 'produzco'; },

        /* Que el veredicto recomiende armar equipo. Los dos caminos se ven
           siempre; esto solo decide cual de las dos salidas va destacada. */
        get configurable() { return this.palanca !== 'litros' && this.palanca !== 'campo'; },
        /* La recomendación económica y la solicitud final pueden diferir: si
           el productor armó equipo, Ventas debe recibir esa intención. */
        get rutaSolicitada() { return this.vengoDe === 8 ? 'equipo' : this.palanca; },
        get precioConfig() {
            return (this.incluyeReactor ? P_REACTOR : 0)
                 + (this.monitoreo ? P_MONITOREO : 0)
                 + this.precioCepas;
        },

        get meses() {
            if (this.ahorroAnual <= 0) return Infinity;
            return (this.precioConfig / this.ahorroAnual) * 12;
        },
        get mesesTxt() {
            if (!isFinite(this.meses)) return '—';
            if (this.meses >= 24) return (this.meses / 12).toFixed(1) + ' años';
            return Math.round(this.meses) + ' meses';
        },

        /* Hectáreas a las que, con su mismo gasto por ha, el equipo se paga en 18 meses. */
        get haUmbral() {
            if (this.gasto <= 0 || this.mesesGasto <= 0) return null;
            /* A partir de aqui producir baja de lo que cuesta comprarlo:
               es donde la tanda empieza a repartirse entre suficientes
               hectareas. Sale del cociente entre el precio de la tanda y el
               costo por hectarea de comprar, sin tasas inventadas. */
            const porTanda = CFG.lote / this.comprarPorHa;
            return Math.ceil(this.tandas > 0 ? this.tandas * porTanda : porTanda);
        },

        /* La palanca: qué se le ofrece. Nadie sale sin oferta. */
        get palanca() {
            if (this.noSabe || this.gasto <= 0) return 'campo';
            if (this.practica === 'produzco')   return 'mejoras';
            const m = this.meses;
            if (m <= 18) return 'completa';
            if (m <= 36) return 'gradual';
            return 'litros';
        },

        /* Lo que cambia la FORMA del veredicto, no sus cifras: sirve de
           clave para recrear el bloque solo cuando cambia el mensaje. */
        get veredictoClave() { return this.palanca + (this.convieneProducir ? '-produce' : '-compra'); },

        get veredicto() {
            const v = {
                completa: {
                    etiqueta: 'Alta viabilidad de inversión',
                    titulo: 'La biofábrica puede recuperarse en ' + this.mesesTxt,
                    texto: 'Con una superficie de ' + this.ha + ' ha, ' + this.mesesSeleccionadosTxt.toLowerCase() + ' de aplicación y tu gasto actual, el ahorro estimado permite recuperar la inversión y reducir el costo operativo posteriormente.',
                    cta: 'Recibir mi cotización',
                    cierreTitulo: '¿A dónde te enviamos la cotización?'
                },
                gradual: {
                    etiqueta: 'Inicio gradual recomendado',
                    titulo: 'Inicia con una cepa y escala progresivamente',
                    texto: 'Con una sola cepa, el equipo cuesta ' + this.mxn(this.precioEntrada) + '. Al sumar cepas, superficie o meses de aplicación, la recuperación estimada mejora.',
                    cta: 'Recibir mi cotización',
                    cierreTitulo: '¿A dónde te enviamos la cotización?'
                },
                litros: {
                    etiqueta: 'Servicio sin inversión en equipo',
                    titulo: this.convieneProducir
                        ? 'Produces más barato de lo que compras'
                        : 'Podemos suministrarte litros ya producidos',
                    texto: this.convieneProducir
                        ? this.mxn(this.producirPorHa) + ' por hectárea contra ' + this.mxn(this.comprarPorHa) +
                          ' comprando. Con ' + this.mesesSeleccionadosTxt.toLowerCase() +
                          ' de aplicación el equipo tarda en pagarse: empieza con litros nuestros y da el paso al crecer.'
                        : 'Por tu escala actual, conviene iniciar con litros producidos por nosotros. Al acercarte a ' +
                          (this.haUmbral || '—') + ' ha, el equipo propio empieza a tener sentido.',
                    cta: 'Solicitar cotización de litros',
                    cierreTitulo: '¿A dónde te enviamos la cotización de litros?'
                },
                mejoras: {
                    etiqueta: 'Equipo propio en operación',
                    titulo: 'Aumenta el rendimiento de tu producción actual',
                    texto: 'Como ya produces microorganismos, la siguiente mejora es optimizar el control de lote e incorporar cepas adicionales según tus necesidades.',
                    cta: 'Recibir mi cotización',
                    cierreTitulo: '¿A dónde te enviamos la cotización?'
                },
                campo: {
                    etiqueta: 'Diagnóstico en campo',
                    titulo: 'Te proponemos un diagnóstico en campo',
                    texto: 'Para estimar el ahorro con precisión, necesitamos conocer tu gasto actual. Un especialista puede recabar la información contigo y preparar una cotización con datos reales.',
                    cta: 'Solicitar diagnóstico en campo',
                    cierreTitulo: '¿Cómo te contactamos?'
                }
            };
            return v[this.palanca];
        },

        get datoCepa() {
            const c = this.cepas[0] || (this.cepasOrdenadas[0] && this.cepasOrdenadas[0].id);
            return c ? DATOS[c] : null;
        },

        num(n) { return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 }).format(n || 0); },

        /* El aviso de escala: por que le conviene o no, y con cuanta
           superficie cambiaria. Es lo unico que le dice algo que no sabia. */
        get claseEscala() {
            if (this.producirPorHaLleno >= this.comprarPorHa) return 'es-plano';
            return this.litrosSobrantes === 0 ? 'es-optima' : 'es-ajuste';
        },
        get textoEscala() {
            if (this.ha <= 0) return '';
            if (this.producirPorHaLleno >= this.comprarPorHa) {
                return 'A los precios de hoy, producir no baja de <strong>' +
                    this.mxn(this.producirPorHaLleno) + ' por hectárea</strong> ni con las ' +
                    'tandas al tope, así que comprarlos terminados conviene a cualquier escala.';
            }
            if (this.litrosSobrantes === 0) {
                return 'Tu superficie aprovecha las tandas <strong>al tope</strong>: no se ' +
                    'desperdicia nada, y es el mejor costo posible produciendo.';
            }
            return 'Te sobran <strong>' + this.num(this.litrosSobrantes) + ' L</strong> de ' +
                'capacidad, porque una tanda se fermenta entera aunque se ocupe a medias. ' +
                'Con <strong>' + this.num(this.haQueLlena) + ' ha</strong> producir bajaría a ' +
                '<strong>' + this.mxn(this.producirPorHaLleno) + ' por hectárea</strong>.';
        },

        /* La curva explica de un vistazo por que el costo sube y baja con la
           superficie. Solo dibuja pesos por hectarea, que ya estan escritos
           arriba: no agrega nada que no fuera publico. */
        dibujarCurva() {
            const svg = document.getElementById('grafica');
            if (!svg || this.ha <= 0) return;

            const W = 320, H = 156, mI = 40, mD = 8, mS = 12, mB = 22;
            const ancho = W - mI - mD, alto = H - mS - mB;
            const haPorTanda = LOTE_L / DOSIS_L_HA;
            const maxHa = Math.max(haPorTanda * 5, Math.ceil(this.ha * 1.5 / haPorTanda) * haPorTanda);
            const maxY  = this.comprarPorHa * 2;

            const X = (ha) => mI + (ha / maxHa) * ancho;
            const Y = (v)  => mS + alto - (Math.min(v, maxY) / maxY) * alto;
            const e = [];

            for (let i = 0; i <= 2; i++) {
                const val = maxY * i / 2, y = Y(val);
                e.push('<line x1="' + mI + '" y1="' + y + '" x2="' + (W - mD) + '" y2="' + y +
                       '" stroke="rgba(255,255,255,.08)" stroke-width="1"/>');
                e.push('<text x="' + (mI - 6) + '" y="' + (y + 3.5) + '" text-anchor="end" ' +
                       'font-size="8.5" fill="#6d8a77">' + this.mxn(val) + '</text>');
            }
            for (let k = 1; k * haPorTanda <= maxHa; k++) {
                const ha = k * haPorTanda;
                e.push('<text x="' + X(ha) + '" y="' + (H - 7) + '" text-anchor="middle" ' +
                       'font-size="8.5" fill="#6d8a77">' + this.num(ha) + '</text>');
            }
            const tandas = Math.ceil(maxHa / haPorTanda);
            for (let t = 1; t <= tandas; t++) {
                const desde = (t - 1) * haPorTanda, hasta = Math.min(t * haPorTanda, maxHa);
                const pts = [], paso = haPorTanda / 24;
                for (let x = desde + paso; x <= hasta + 0.001; x += paso) {
                    pts.push(X(x).toFixed(1) + ',' + Y(t * CFG.lote / x).toFixed(1));
                }
                if (pts.length > 1) {
                    e.push('<polyline points="' + pts.join(' ') + '" fill="none" ' +
                           'stroke="#7ed957" stroke-width="2" stroke-linejoin="round"/>');
                }
            }
            e.push('<line x1="' + X(0) + '" y1="' + Y(this.comprarPorHa) + '" x2="' + X(maxHa) +
                   '" y2="' + Y(this.comprarPorHa) + '" stroke="#a9c2b1" stroke-width="2" ' +
                   'stroke-dasharray="5 4"/>');
            if (this.ha <= maxHa) {
                const px = X(this.ha), py = Y(this.mejorPorHa);
                e.push('<line x1="' + px + '" y1="' + mS + '" x2="' + px + '" y2="' + (mS + alto) +
                       '" stroke="rgba(255,255,255,.25)" stroke-width="1" stroke-dasharray="2 3"/>');
                e.push('<circle cx="' + px + '" cy="' + py + '" r="4.5" fill="#e0a33c" ' +
                       'stroke="#0d1a12" stroke-width="2"/>');
            }
            svg.innerHTML = e.join('');
        },

        mxn(n) {
            if (!isFinite(n)) return '—';
            return '$' + Math.round(n).toLocaleString('es-MX');
        },

        ir(n) {
            if (n > this.paso) medir('paso_' + n, { desde: this.paso });
            if (n === 8) this.vioConfigurador = true;
            if (n === 7) this.vengoDe = this.paso;
            this.paso = n;
            /* El <svg> se dibuja por el x-effect de la propia grafica, que
               corre al montar y cada vez que cambia 'ha'. */
            if (n === 6) setTimeout(() => this.dibujarCurva(), 0);
            window.scrollTo({ top: 0, behavior: 'auto' });
        },

        seleccionarMeses(tipo) {
            const grupos = {
                corto: ['mar','abr','may','jun'],
                medio: ['feb','mar','abr','may','jun','jul'],
                todo:  this.mesesDisponibles.map(m => m.id)
            };
            this.mesesActivos = grupos[tipo] ? grupos[tipo].slice() : grupos.todo.slice();
        },

        toggleMes(id) {
            const i = this.mesesActivos.indexOf(id);
            if (i === -1) this.mesesActivos.push(id);
            else this.mesesActivos.splice(i, 1);
            const orden = this.mesesDisponibles.map(m => m.id);
            this.mesesActivos.sort((a, b) => orden.indexOf(a) - orden.indexOf(b));
        },

        continuarGasto() {
            this.noSabe = false;
            this.calcular();
        },

        toggleProblema(id) {
            const i = this.problemas.indexOf(id);
            if (i === -1) this.problemas.push(id);
            else this.problemas.splice(i, 1);
            const orden = this.problemasOrdenados.map(p => p.id);
            this.problemas.sort((a, b) => orden.indexOf(a) - orden.indexOf(b));
        },

        calcular() {
            if (this.problemas.length === 0) return;
            this.problema = this.problemaPrincipal;
            /* La configuración empieza con todas las sugerencias de las etapas.
               Si el productor pidió orientación, conserva el respaldo por puntaje. */
            const orden = this.cepasOrdenadas;
            const cuantas = (this.practica === 'produzco') ? 2 : 1;
            const sugeridas = this.cepasSugeridasEtapas;
            this.cepas = sugeridas.length ? sugeridas.slice() : orden.slice(0, cuantas).map(c => c.id);
            if (!sugeridas.length && this.palanca === 'completa') this.cepas = orden.slice(0, 2).map(c => c.id);
            if (this.palanca === 'completa') this.monitoreo = true;
            /* El evento que de verdad importa: con qué perfil llegó y qué se le ofreció. */
            medir('resultado', {
                palanca: this.palanca,
                cultivos: this.cultivos.join(","),
                etapas: this.resumenEtapas,
                hectareas: this.ha,
                gasto_ha_mes: this.gasto,
                total: this.precioConfig
            });
            this.ir(6);
        },

        alternarCepa(id) {
            const i = this.cepas.indexOf(id);
            if (i === -1) this.cepas.push(id);
            else if (this.cepas.length > 1) this.cepas.splice(i, 1);
        },

        /* Resumen legible que viaja con el lead. */
        get resumen() {
            const nom = id => (CEPAS.find(c => c.id === id) || {}).nombre || id;
            const nomProblema = id => (PROBLEMAS[id] || {}).nom || id;
            const nomPractica = id => (this.practicas.find(p => p.id === id) || {}).nom || id;
            const partes = [
                'RUTA SOLICITADA: ' + this.rutaSolicitada,
                'RECOMENDACION CALCULADA: ' + this.palanca,
                'Cultivos: ' + this.nombresCultivos.join(' / '),
                'Etapas: ' + this.resumenEtapas,
                'Estado: ' + this.estado,
                'Superficie: ' + this.ha + ' ha',
                'Practica: ' + nomPractica(this.practica),
                'Gasto: $' + this.gasto + '/ha/mes',
                'Meses con gasto: ' + this.mesesActivos.join(','),
                'Gasto anual por ha: ' + this.mxn(this.gastoHaAnual),
                'Problema principal: ' + nomProblema(this.problemaPrincipal),
                'Problemas seleccionados: ' + this.problemas.map(nomProblema).join(' / ')
            ];
            if (this.vioConfigurador) {
                partes.push('Monitoreo: ' + (this.monitoreo ? 'si' : 'no'));
                partes.push('Microorganismos seleccionados: ' + this.cepas.map(nom).join(' / '));
                partes.push('Total: ' + this.mxn(this.precioConfig));
                partes.push('Recuperacion: ' + this.mesesTxt);
            }
            partes.push('Ahorro anual por ha estimado: ' + this.mxn(this.ahorroHaAnual));
            partes.push('Ahorro anual total estimado: ' + this.mxn(this.ahorroAnual));
            partes.push('Forma de pago: ' + this.formaPago);
            partes.push('Financiamiento: ' + (this.quiereFinanciamiento ? 'INTERESADO' : 'no'));
            return partes.join(' | ');
        },

        enviar(e) {
            const f = e.target;
            if (f.querySelector('[name=company_url]').value) { window.location.href = '/gracias-diagnostico'; return; }
            if (Date.now() - this._t0 < 4000) { this.muyRapido = true; return; }

            this.muyRapido = false;
            this.errorEnvio = false;
            this.enviando = true;

            /* Se envía al mismo formulario que ya alimenta el pipeline de leads.
               El resumen completo viaja en entry.1073422398, que es de respuesta
               corta y admite cualquier texto. Ver reference del handoff para
               migrar esto a campos propios. */
            const superficie = this.ha <= 10 ? 'Menos de 10 ha' : (this.ha <= 50 ? '11 a 50 ha' : 'Más de 50 ha');
            const mapaProblema = {
                costo:      'Costo excesivo de los Microorganismos Benéficos',
                suelo:      'Salud del suelo y degradación',
                patogenos:  'Presencia de patógenos en raíz (Fusarium, Phytophthora, etc.)',
                nutrientes: 'Baja eficiencia en la absorción de nutrientes',
                foliar:     'Salud del suelo y degradación',
                plagas:     'Presencia de patógenos en raíz (Fusarium, Phytophthora, etc.)'
            };
            const mapaCultivo = {
                berries: 'Berries (Frambuesa, Arándano, Zarzamora)',
                aguacate:'Aguacate',
                agave:   'Agave'
            };
            const mapaCultivoOtro = {
                frutales: 'Árboles frutales',
                hortalizas: 'Hortalizas',
                granos: 'Granos',
                cana: 'Caña de azúcar',
                otro: 'Otro cultivo'
            };
            const lugar = f.lugar.value + (this.estado ? ' | Estado: ' + this.estado : '');

            const p = new URLSearchParams();
            p.append('entry.717719532',  f.nombre.value);
            p.append('entry.418293425',  f.correo.value);
            p.append('entry.1012014923', lugar);
            p.append('entry.1936785384', f.whatsapp.value);
            p.append('entry.1412966994', f.rancho.value);
            if (mapaCultivo[this.cultivo]) {
                p.append('entry.232288433', mapaCultivo[this.cultivo]);
            } else {
                p.append('entry.232288433', '__other_option__');
                p.append('entry.232288433.other_option_response', mapaCultivoOtro[this.cultivo] || 'Otro cultivo');
            }
            p.append('entry.1112158256', superficie);
            p.append('entry.745728650',  mapaProblema[this.problemaPrincipal] || mapaProblema.costo);
            p.append('entry.939413606',  '$' + this.gasto + ' / ha al mes activo | meses: ' + this.mesesActivos.join(','));
            p.append('entry.1073422398', this.resumen);
            /* Campo obligatorio de opción múltiple: se pasa por su opción "Otro". */
            p.append('entry.1366426429', '__other_option__');
            p.append('entry.1366426429.other_option_response', 'Ruta ' + this.rutaSolicitada);

            /* Envío compartido: src/scripts/enviar-lead.ts */
            enviarLead(p)
            .then(() => {
                medir('lead', { palanca: this.palanca, ruta: this.rutaSolicitada, total: this.precioConfig,
                                financiamiento: this.quiereFinanciamiento ? 1 : 0 });
                window.location.href = '/gracias-diagnostico';
            })
            .catch(() => { this.enviando = false; this.errorEnvio = true; });
        }
    };
}
