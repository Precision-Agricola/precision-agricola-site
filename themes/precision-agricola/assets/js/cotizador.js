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
        precioLote: parseFloat(raiz.dataset.precioLote) || 24000,
        dosis:      parseFloat(raiz.dataset.dosis)      || 4,
        litrosLote: parseFloat(raiz.dataset.litrosLote) || 200,
        referencia: parseFloat(raiz.dataset.referencia) || 0,
        whatsapp:   (raiz.dataset.whatsapp || '').replace(/\D/g, '')
    };

    var $ = function (id) { return document.getElementById(id); };

    /* Tope de cordura. Sin el, un cero de mas convierte la cotizacion en
       cientos de millones y el visitante deja de creerle a la pagina. */
    var MAX_HA = 10000;

    var mxn = new Intl.NumberFormat('es-MX', {
        style: 'currency', currency: 'MXN', maximumFractionDigits: 0
    });
    var num = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
    var num1 = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });

    var quieto = window.matchMedia &&
                 window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ── El cálculo, completo ──────────────────────────────────────── */

    function calcular(superficie) {
        var litros = superficie * CFG.dosis;

        /* Comprar terminado se paga por litro: exactamente lo que se ocupa,
           y el costo por hectarea queda plano a cualquier escala. */
        var comprar = {
            total: litros * CFG.precio,
            porHa: CFG.precio * CFG.dosis
        };

        /* Producir se paga por tanda completa, aunque se ocupe a medias, asi
           que el costo por hectarea salta segun que tan bien encaje la
           superficie en multiplos de la capacidad. Ese salto es el punto de
           la pagina: dice a que escala conviene producir, en vez de dar un
           numero que no se mueve. */
        var lotes = Math.ceil(litros / CFG.litrosLote);
        var producir = {
            lotes:      lotes,
            capacidad:  lotes * CFG.litrosLote,
            sobrantes:  lotes * CFG.litrosLote - litros,
            total:      lotes * CFG.precioLote,
            porHa:      superficie > 0 ? (lotes * CFG.precioLote) / superficie : 0,
            haQueLlena: (lotes * CFG.litrosLote) / CFG.dosis,
            porHaLleno: CFG.precioLote / CFG.litrosLote * CFG.dosis
        };

        var gana  = producir.porHa < comprar.porHa ? 'producir' : 'comprar';
        var mejor = gana === 'producir' ? producir : comprar;

        return {
            superficie: superficie,
            litros: litros,
            comprar: comprar,
            producir: producir,
            gana: gana,
            mejorPorHa: mejor.porHa,
            mejorTotal: mejor.total,
            /* El ahorro se mide con el camino que de verdad le conviene, no
               con el que nos gustaria venderle. */
            ahorroPorHa: CFG.referencia - mejor.porHa,
            ahorroTotal: superficie * (CFG.referencia - mejor.porHa)
        };
    }

    /* ── La cifra grande cuenta hasta su valor ─────────────────────── */

    var animacion = null;
    var respaldo = null;

    function animarCifra(nodo, desde, hasta) {
        if (animacion) cancelAnimationFrame(animacion);
        /* El valor correcto se escribe SIEMPRE primero. La animacion es un
           adorno: si requestAnimationFrame no llega a correr -pestana en
           segundo plano, o un navegador que no compone cuadros- la cifra
           tiene que quedar bien igual. Antes se quedaba con el dato viejo,
           que es peor que no animar. */
        nodo.firstChild.nodeValue = mxn.format(hasta);
        if (quieto || Math.round(desde) === Math.round(hasta)) return;

        var dur = 420;
        /* Red de seguridad: requestAnimationFrame se detiene cuando el
           navegador deja de componer cuadros, y la cifra se quedaria a medio
           camino mostrando un numero que no es. setTimeout si corre en ese
           caso, asi que garantiza el valor final. */
        clearTimeout(respaldo);
        respaldo = setTimeout(function () {
            if (animacion) cancelAnimationFrame(animacion);
            nodo.firstChild.nodeValue = mxn.format(hasta);
        }, dur + 90);

        var t0 = performance.now();
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
        var superficie = Math.min(parseFloat($('superficie').value) || 0, MAX_HA);
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

        animarCifra($('costo-ha'), anterior, r.mejorPorHa);
        anterior = r.mejorPorHa;

        $('rotulo-cifra').textContent = r.gana === 'producir'
            ? 'Produciéndolo usted, por hectárea'
            : 'Comprándolo terminado, por hectárea';

        $('necesita').innerHTML = 'Para <strong>' + num.format(r.superficie) +
            ' ha</strong> necesita <strong>' + num.format(r.litros) +
            ' L</strong> por aplicación.';

        pintarOpciones(r);
        pintarEscala(r);
        pintarComparativa(r);

        if (estrenando && !quieto) {
            bloque.classList.remove('surge');
            void bloque.offsetWidth;   // reinicia la animación
            bloque.classList.add('surge');
        }

        actualizarEnlace(r);
    }

    function pintarOpciones(r) {
        $('c-comprar-ha').textContent    = mxn.format(r.comprar.porHa);
        $('c-comprar-total').textContent = mxn.format(r.comprar.total);
        $('c-comprar-det').textContent   = num.format(r.litros) + ' L, justo lo que ocupa';

        $('c-producir-ha').textContent    = mxn.format(r.producir.porHa);
        $('c-producir-total').textContent = mxn.format(r.producir.total);
        $('c-producir-det').textContent   = num.format(r.producir.lotes) +
            (r.producir.lotes === 1 ? ' tanda de ' : ' tandas de ') +
            num.format(CFG.litrosLote) + ' L';

        $('op-comprar').classList.toggle('gana',  r.gana === 'comprar');
        $('op-producir').classList.toggle('gana', r.gana === 'producir');
    }

    /* Por que le conviene o no, y que superficie lo cambiaria. Es lo unico
       de la pagina que le dice algo que no sabia. */
    function pintarEscala(r) {
        var caja = $('escala');
        var p = r.producir;

        if (p.porHaLleno >= r.comprar.porHa) {
            /* Con este precio de paquete producir no gana nunca. Se dice:
               una calculadora que solo sabe dar buenas noticias no sirve. */
            caja.className = 'escala es-plano';
            caja.innerHTML = 'A los precios de hoy, producir no baja de <strong>' +
                mxn.format(p.porHaLleno) + ' por hectárea</strong> ni aprovechando las ' +
                'tandas al tope, así que comprarlo terminado conviene a cualquier escala.';
            return;
        }
        if (p.sobrantes === 0) {
            caja.className = 'escala es-optima';
            caja.innerHTML = 'Su superficie aprovecha las tandas <strong>al tope</strong>: ' +
                'no se desperdicia nada, y es el mejor costo posible produciendo.';
            return;
        }
        caja.className = 'escala es-ajuste';
        caja.innerHTML = 'Le sobran <strong>' + num.format(p.sobrantes) + ' L</strong> de ' +
            'capacidad, porque una tanda se fermenta entera aunque se ocupe a medias. ' +
            'Con <strong>' + num1.format(p.haQueLlena) + ' ha</strong> producir bajaría a ' +
            '<strong>' + mxn.format(p.porHaLleno) + ' por hectárea</strong>.';
    }

    function pintarComparativa(r) {
        var caja = $('comparativa');
        if (CFG.referencia <= 0) { caja.hidden = true; return; }
        caja.hidden = false;

        var tope = Math.max(CFG.referencia, r.mejorPorHa);
        $('barra-comercial').style.width = (CFG.referencia / tope * 100) + '%';
        $('barra-nuestro').style.width   = (r.mejorPorHa / tope * 100) + '%';
        $('monto-comercial').textContent = mxn.format(CFG.referencia);
        $('monto-nuestro').textContent   = mxn.format(r.mejorPorHa);

        var linea = $('ahorro-linea');
        if (r.ahorroPorHa > 0) {
            linea.classList.remove('es-caro');
            linea.innerHTML = 'En sus <strong>' + num.format(r.superficie) + ' ha</strong> se ahorra ' +
                '<strong>' + mxn.format(r.ahorroTotal) + '</strong> por aplicación, ' +
                Math.round(r.ahorroPorHa / CFG.referencia * 100) + '% menos que el producto comercial.';
        } else {
            /* Si el precio no queda por debajo de la referencia, se dice. Un
               cotizador que solo sabe dar buenas noticias no sirve para
               negociar y se nota. */
            linea.classList.add('es-caro');
            linea.innerHTML = 'A esta escala el costo por hectárea queda ' +
                '<strong>' + mxn.format(Math.abs(r.ahorroPorHa)) + ' por encima</strong> ' +
                'de la referencia de mercado. El valor está en producirlo fresco y en el sitio.';
        }
    }

    /* ── WhatsApp ──────────────────────────────────────────────────── */

    var enlace = $('enviar-wa');
    var ultimo = null;

    function datosContacto() {
        return {
            nombre:    ($('nombre').value || '').trim(),
            municipio: ($('municipio').value || '').trim(),
            cultivo:   ($('cultivo').value || '').trim(),
            telefono:  ($('telefono').value || '').trim(),
            /* Va al servidor, que descarta el envio si trae algo: solo los
               robots llenan un campo que nadie ve. */
            sitio_web: ($('sitio-web').value || '').trim()
        };
    }

    function actualizarEnlace(r) {
        var d = datosContacto();
        ultimo = r;
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
            'Bioinsumo por aplicación: ' + num.format(r.litros) + ' L',
            'Comprándolo terminado: ' + mxn.format(r.comprar.total) +
                ' (' + mxn.format(r.comprar.porHa) + '/ha)',
            'Produciéndolo: ' + mxn.format(r.producir.total) + ' en ' +
                num.format(r.producir.lotes) + ' tandas (' +
                mxn.format(r.producir.porHa) + '/ha)'
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
        if (!ultimo) return;
        var d = datosContacto();
        d.superficie = ultimo.superficie;
        d.litros     = ultimo.litros;
        d.recomienda = ultimo.gana;
        d.total      = Math.round(ultimo.mejorTotal);
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
        if (v > MAX_HA) { v = MAX_HA; this.value = MAX_HA; }
        /* La barra se pega a su extremo en vez de quedarse donde estaba:
           dejarla atras hace que el campo y la barra digan cosas distintas. */
        var b = $('barra');
        b.value = Math.min(Math.max(v, +b.min), +b.max);
        pintar();
    });
    $('barra').addEventListener('input', function () {
        $('superficie').value = this.value;
        pintar();
    });
    $('cultivo').addEventListener('change', pintar);
    ['nombre', 'municipio', 'telefono'].forEach(function (id) {
        $(id).addEventListener('input', pintar);
    });

    pintar();
})();
