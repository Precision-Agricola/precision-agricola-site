/* Cotizador de bioinsumos · lógica pública
 *
 * Todo lo que vive aquí llega al navegador y cualquiera puede leerlo con
 * Ctrl+U. Por eso este archivo solo conoce precios de lista y parámetros
 * agronómicos: lo que el productor recibiría de todos modos en una
 * cotización impresa.
 *
 * La estructura interna de la operación vive en un archivo aparte, fuera
 * del servidor web. No la traigas aquí, por conveniente que parezca: no
 * hay forma de ocultar un número que ya llegó al navegador.
 */
(function () {
    'use strict';

    var raiz = document.getElementById('cotizador');
    if (!raiz) return;

    /* Los precios entran por atributos data- desde Twig, no escritos aquí:
       así Ventas los cambia desde el backend y este archivo sigue cacheado.
       Los valores tras || evitan que todo quede en NaN si un campo del
       backend se dejó vacío. */
    var CFG = {
        precio:     parseFloat(raiz.dataset.precio)     || 150,
        dosis:      parseFloat(raiz.dataset.dosis)      || 4,
        litrosLote: parseFloat(raiz.dataset.litrosLote) || 200,
        referencia: parseFloat(raiz.dataset.referencia) || 0,
        whatsapp:   (raiz.dataset.whatsapp || '').replace(/\D/g, '')
    };

    var $ = function (id) { return document.getElementById(id); };

    var mxn = new Intl.NumberFormat('es-MX', {
        style: 'currency', currency: 'MXN', maximumFractionDigits: 0
    });
    var num = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
    var num1 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });

    var quieto = window.matchMedia &&
                 window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── El cálculo, completo ──────────────────────────────────────── */

    function calcular(superficie) {
        var costoPorHectarea = CFG.precio * CFG.dosis;
        var litrosNecesarios = superficie * CFG.dosis;
        var costoAplicacion  = litrosNecesarios * CFG.precio;
        var lotesNecesarios  = Math.ceil(litrosNecesarios / CFG.litrosLote);
        var hectareasPorLote = CFG.litrosLote / CFG.dosis;

        var ahorroPorHectarea = CFG.referencia - costoPorHectarea;
        var ahorroTotal       = superficie * ahorroPorHectarea;
        var porcentajeAhorro  = CFG.referencia > 0 ? ahorroPorHectarea / CFG.referencia : 0;

        return {
            superficie: superficie,
            costoPorHectarea: costoPorHectarea,
            litrosNecesarios: litrosNecesarios,
            costoAplicacion: costoAplicacion,
            lotesNecesarios: lotesNecesarios,
            hectareasPorLote: hectareasPorLote,
            ahorroPorHectarea: ahorroPorHectarea,
            ahorroTotal: ahorroTotal,
            porcentajeAhorro: porcentajeAhorro
        };
    }

    /* ── La cifra grande cuenta hasta su valor ─────────────────────── */

    var animacion = null;

    function animarCifra(nodo, desde, hasta) {
        if (animacion) cancelAnimationFrame(animacion);
        if (quieto || desde === hasta) {
            nodo.firstChild.nodeValue = mxn.format(hasta);
            return;
        }
        var t0 = performance.now(), dur = 420;
        (function paso(t) {
            var p = Math.min(1, (t - t0) / dur);
            /* Desacelera al final: el número se lee mientras se acomoda. */
            var e = 1 - Math.pow(1 - p, 3);
            nodo.firstChild.nodeValue = mxn.format(desde + (hasta - desde) * e);
            if (p < 1) animacion = requestAnimationFrame(paso);
        })(t0);
    }

    /* ── Pintado ───────────────────────────────────────────────────── */

    var anterior = 0;

    function pintar() {
        var superficie = parseFloat($('superficie').value) || 0;
        var bloque = $('resultado');

        /* Con el campo vacío, un bloque de resultados en ceros hace que la
           página parezca rota. Mejor no mostrarlo. */
        if (superficie <= 0) {
            bloque.hidden = true;
            actualizarEnlace(null);
            return;
        }

        var estrenando = bloque.hidden;
        bloque.hidden = false;

        var r = calcular(superficie);

        animarCifra($('costo-ha'), anterior, r.costoPorHectarea);
        anterior = r.costoPorHectarea;

        pintarComparativa(r);

        $('d-superficie').textContent = num.format(r.superficie) + ' ha';
        $('d-litros').textContent     = num.format(r.litrosNecesarios) + ' L';
        $('d-aplicacion').textContent = mxn.format(r.costoAplicacion);
        $('d-lotes').textContent      = num.format(r.lotesNecesarios) +
            (r.lotesNecesarios === 1 ? ' lote' : ' lotes');
        $('d-cobertura').textContent  = num1.format(r.hectareasPorLote) + ' ha por lote';

        if (estrenando && !quieto) {
            bloque.classList.remove('surge');
            void bloque.offsetWidth;   // reinicia la animación
            bloque.classList.add('surge');
        }

        actualizarEnlace(r);
    }

    function pintarComparativa(r) {
        var caja = $('comparativa');
        if (CFG.referencia <= 0) { caja.hidden = true; return; }
        caja.hidden = false;

        var tope = Math.max(CFG.referencia, r.costoPorHectarea);
        $('barra-comercial').style.width = (CFG.referencia / tope * 100) + '%';
        $('barra-nuestro').style.width   = (r.costoPorHectarea / tope * 100) + '%';
        $('monto-comercial').textContent = mxn.format(CFG.referencia);
        $('monto-nuestro').textContent   = mxn.format(r.costoPorHectarea);

        var linea = $('ahorro-linea');
        if (r.ahorroPorHectarea > 0) {
            linea.classList.remove('es-caro');
            linea.innerHTML = 'En sus <strong>' + num.format(r.superficie) + ' ha</strong> se ahorra ' +
                '<strong>' + mxn.format(r.ahorroTotal) + '</strong> por aplicación, ' +
                Math.round(r.porcentajeAhorro * 100) + '% menos que el producto comercial.';
        } else {
            /* Si el precio no queda por debajo de la referencia, se dice. Un
               cotizador que solo sabe dar buenas noticias no sirve para
               negociar y se nota. */
            linea.classList.add('es-caro');
            linea.innerHTML = 'A este precio el costo por hectárea queda ' +
                '<strong>' + mxn.format(Math.abs(r.ahorroPorHectarea)) + ' por encima</strong> ' +
                'de la referencia de mercado. El valor está en producirlo fresco y en el sitio.';
        }
    }

    /* ── WhatsApp ──────────────────────────────────────────────────── */

    var enlace = $('enviar-wa');

    function datosContacto() {
        return {
            nombre:    ($('nombre').value || '').trim(),
            municipio: ($('municipio').value || '').trim(),
            cultivo:   ($('cultivo').value || '').trim()
        };
    }

    function actualizarEnlace(r) {
        var d = datosContacto();
        var listo = !!(d.nombre && r && r.superficie > 0);

        if (!listo) {
            enlace.setAttribute('aria-disabled', 'true');
            enlace.removeAttribute('href');
            enlace.dataset.faltante = !d.nombre ? 'nombre' : 'superficie';
            return;
        }

        var lineas = [
            'Hola, solicito información sobre la biofábrica.',
            '',
            'Nombre: ' + d.nombre,
            'Municipio: ' + (d.municipio || 'sin especificar'),
            'Cultivo: ' + (d.cultivo || 'sin especificar'),
            'Superficie: ' + num.format(r.superficie) + ' ha',
            '',
            'Estimación del sitio:',
            'Costo por hectárea: ' + mxn.format(r.costoPorHectarea),
            'Bioinsumo por aplicación: ' + num.format(r.litrosNecesarios) + ' L',
            'Costo por aplicación: ' + mxn.format(r.costoAplicacion)
        ];

        enlace.setAttribute('aria-disabled', 'false');
        enlace.href = 'https://wa.me/' + CFG.whatsapp +
                      '?text=' + encodeURIComponent(lineas.join('\n'));
    }

    /* El href se mantiene al día mientras el visitante escribe, y el registro
       del prospecto sale con sendBeacon dentro del mismo clic. Si se abriera
       WhatsApp dentro del .then() de un fetch, los navegadores móviles lo
       bloquean: ya se perdió el vínculo con el gesto del usuario, y el botón
       deja de hacer nada. En escritorio funciona, que es lo que vuelve tan
       difícil de encontrar ese fallo. */
    enlace.addEventListener('click', function (ev) {
        if (enlace.getAttribute('aria-disabled') === 'true') {
            ev.preventDefault();
            var campo = $(enlace.dataset.faltante === 'nombre' ? 'nombre' : 'superficie');
            campo.focus();
            return;
        }
        if (!navigator.sendBeacon) return;
        var d = datosContacto();
        d.superficie = parseFloat($('superficie').value) || 0;
        try {
            navigator.sendBeacon(
                raiz.dataset.registro,
                new Blob([JSON.stringify(d)], { type: 'application/json' })
            );
        } catch (e) { /* el registro es opcional: nunca debe estorbar el envío */ }
    });

    /* ── Eventos ───────────────────────────────────────────────────── */

    /* La barra y el campo numérico son la misma cifra vista de dos formas. */
    $('superficie').addEventListener('input', function () {
        var v = parseFloat(this.value) || 0;
        if (v >= 1 && v <= 500) $('barra').value = v;
        pintar();
    });
    $('barra').addEventListener('input', function () {
        $('superficie').value = this.value;
        pintar();
    });
    $('cultivo').addEventListener('change', pintar);
    ['nombre', 'municipio'].forEach(function (id) {
        $(id).addEventListener('input', pintar);
    });

    pintar();
})();
