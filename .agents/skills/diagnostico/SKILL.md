---
name: diagnostico
description: Contexto y pendientes del embudo /diagnostico, el configurador que reemplazará a /kit-biorreactor. Úsala al trabajar en esa página: para añadir preguntas o palancas, tocar precios o el puntaje de cepas, cambiar a dónde caen los leads, o conectar el banco de datos desde papers.
---

# El configurador /diagnostico

Está en [themes/precision-agricola/pages/diagnostico.htm](../../../themes/precision-agricola/pages/diagnostico.htm).
Un solo archivo: marcado, estilos y lógica. Sin build, sin dependencias
salvo Alpine 3 por CDN. Móvil primero, porque el tráfico viene de anuncios
de Instagram.

Es un **prototipo de fase 1**. Funciona de punta a punta, pero varias
decisiones quedaron deliberadamente abiertas — están abajo.

## La idea que hay que no romper

**El diagnóstico no califica prospectos: decide qué venderle a cada quien.**
Ninguna rama termina sin oferta. Si alguien no puede pagar el equipo, se le
ofrecen litros terminados y se le nombra el umbral en que el equipo empieza
a convenirle. Si ya produce, se le ofrecen mejoras. Si no tiene datos, una
visita.

Cualquier cambio que introduzca un "esto no es para ti" sin alternativa va
en contra del diseño.

## Datos confirmados

De la cotización 348 (28/05/2026), confirmados por Eduardo:

| Concepto | Valor |
|---|---|
| Biorreactor (tanque 190 L, lote 180 L) | $129,000 |
| Sistema de monitoreo (pH, O₂, temperatura) | $39,000 |
| Paquete de cepa (20 L + 8 kg medios + 3 kg activadores) | $24,000 |
| Costo por litro producido | $133 |
| Precio de venta del litro terminado | $239 |
| Tasa de ahorro derivada | 44.35% |

Un solo modelo de equipo, en acero inoxidable. El tanque es de 190 L y el
lote que rinde es de 180 L: **es la misma máquina, no dos modelos**.

Las constantes viven juntas al inicio de `function diagnostico()`. Si cambia
un precio, se cambia ahí y todo lo demás se recalcula.

## Cómo está armado

Un componente Alpine con `paso` de 0 a 7. Cada pantalla es un `<template x-if>`.

**Las palancas** salen del getter `palanca`, en este orden:

```
sin dato de gasto      -> campo
ya produce             -> mejoras
recuperación ≤ 18 m    -> completa
recuperación ≤ 36 m    -> gradual
resto                  -> litros
```

Los textos de cada una están en el getter `veredicto`.

**El puntaje de cepas** está en `POR_PROBLEMA` y `POR_CULTIVO`. El problema
pesa el doble que el cultivo. Cambiar esos objetos cambia las recomendaciones
sin tocar nada más.

**La personalización real** no viene de textos: viene de que el ahorro, el
total y los meses se calculan con la superficie y el gasto que tecleó el
usuario. Eso es lo que hace que dos productores no vean lo mismo.

### Dos trampas que ya costaron trabajo

**No hagas que `precioConfig` dependa de `palanca`.** La palanca se decide a
partir de los meses, que salen del precio: crearías un ciclo infinito. Por eso
`incluyeReactor` mira `practica`, que es estado plano, y no la palanca.

**Twig se come las llaves dobles.** El archivo es una página de October, así
que `{{` dentro de `<script>` o `<style>` rompe el render. Llaves sencillas no
molestan.

## Dónde caen los leads hoy

Al mismo formulario de Google que ya alimenta el pipeline, para no montar
infraestructura nueva en un prototipo. El mapeo está al final, en `enviar()`.

Dos cosas a entender antes de tocarlo:

- El **resumen completo** de la configuración viaja en `entry.1073422398`,
  que es de respuesta corta en el Form y admite cualquier texto.
- `entry.1366426429` es de **opción múltiple y obligatoria**. Se le pasa la
  ruta por su opción "Otro" (`__other_option__` más
  `other_option_response`). Así funciona hoy sin tocar el Google Form.

⚠️ **Si mandas a `entry.1366426429` un valor que no esté en sus opciones,
Google rechaza el envío entero.** Y como el `fetch` va con `mode: 'no-cors'`,
el JavaScript nunca ve el error: el visitante ve la página de gracias y el
lead se pierde en silencio. Cualquier cambio en el mapeo hay que probarlo con
un envío real y confirmar que llegó a la hoja.

## Pendientes, en orden de valor

### 1. Decidir dónde caen los leads de verdad
El Form actual no tiene campos para la configuración, por eso todo va
apretado en un campo de texto. Opciones: añadir campos propios al Google Form
(y actualizar el mapeo), o escribir a una hoja vía Apps Script. El requisito
real es que un vendedor no técnico pueda leerlos; no hacen falta macros.

### 2. Dos palancas que esperan decisión comercial de Eduardo
Están diseñadas pero **no implementadas**, porque dependen de criterio de
negocio y no técnico:

- **Reventa del excedente.** El lote rinde 180 L. Una operación chica consume
  menos, y el resto sería producto vendible a vecinos: el reactor deja de ser
  un gasto a amortizar y pasa a ser capacidad con ingreso. Cambia por completo
  la conversación con productores pequeños. Toca marca y control de calidad.
- **Compra en grupo.** Un reactor compartido entre varios productores chicos
  de la misma zona.

No las programes sin que Eduardo las apruebe.

### 3. El banco de datos desde los papers
Hoy `DATOS` tiene seis entradas escritas a mano, una por cepa. La fase 2 es
ampliarlo desde los PDFs de Eduardo.

**Hazlo fuera de línea, no con llamadas en vivo.** Razones, por orden de
importancia: una afirmación agronómica inventada frente a un comprador
("reduce químicos un 40%") es un problema legal, no de software; el sitio
corre en PHP 7.4 sobre cPanel compartido y la latencia mata la conversión en
móvil; y la matriz es finita, así que no hace falta recuperación en vivo.

El flujo correcto: el modelo lee los PDFs una vez, redacta las tarjetas, **un
técnico las revisa**, y se publican como datos estáticos. Conviene indexarlas
por cepa y por problema para poder mostrar la que toca en cada paso.

### 4. Datos que faltan del negocio
- Presentaciones y volumen mínimo de los litros terminados.
- Catálogo de accesorios y mejoras con precio.
- Si la asesoría o la visita en campo se cobran.
- Días por lote: sin el tiempo de ciclo no se puede decir si un reactor le
  alcanza a una superficie grande, ni sugerir un segundo equipo.

### 5. Afinado del embudo
- El paso 4 pierde a quien no sabe su gasto. Un estimador por cultivo y
  hectárea rescataría a esa gente hacia una ruta con números.
- El mapa de problemas a los campos del Google Form aplasta seis opciones en
  las cuatro que el Form acepta: `foliar` y `plagas` se pierden. Se arregla
  al resolver el pendiente 1.
- No hay medición. Sin saber en qué paso abandona la gente, el afinado es a
  ciegas.

### 6. Reemplazar /kit-biorreactor
Cuando este endpoint pruebe que convierte. Hoy `/diagnostico` lleva
`noindex` para no competir en buscadores con la página vieja. Al hacer el
cambio: quitar el `noindex`, redirigir `/kit-biorreactor`, y actualizar el
sitemap.

También sigue pendiente que `/bioreactores` anuncia modelos de 200 L y
1,000 L que ya no están en el catálogo.

## Cómo verificar un cambio

Levanta el servidor (ver la skill `setup-local`) y abre `/diagnostico`.

Vale la pena recorrerlo con varios perfiles y confirmar que dan salidas
distintas. Estos seis cubren las cinco palancas:

| Perfil | Palanca esperada |
|---|---|
| Caña, 120 ha, compra, $700/ha | completa, ~6 meses |
| Berries, 60 ha, compra, $900/ha | completa, ~9 meses |
| Agave, 30 ha, químicos, $500/ha | gradual, ~23 meses |
| Aguacate, 8 ha, nada, $450/ha | litros |
| Berries, 40 ha, ya produce, $300/ha | mejoras, sin cobrar reactor |
| Cualquiera con "No sé cuánto gasto" | campo |

Y comprobar siempre: que no hay desborde horizontal en 375 px, que el gancho
cabe sin scroll, y que el configurador no permite quedarse con cero cepas.

Para probar el envío sin mandar datos reales, intercepta `window.fetch` antes
de enviar y revisa el cuerpo de la petición.
