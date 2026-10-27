// Precios del embudo /biofabrica. En October los edita Ventas en
// Settings -> Customize theme (themes/precision-agricola/config/fields.yaml);
// el sitio de Astro es estático, así que aquí se cambian por PR.
//
// PENDIENTE: son los valores por omisión de fields.yaml. Confirmar contra los
// que tiene hoy el panel de producción antes de publicar en www.
export const cotizador = {
  /** Precio de venta por litro, en pesos sin IVA. */
  precioLitro: 150,
  /** Paquete de insumos por lote. */
  precioLote: 24000,
  /** Litros de bioinsumo por hectárea, por aplicación. */
  dosisHa: 4,
  /** Litros que produce la biofábrica por ciclo. */
  litrosLote: 200,
  /** Costo del producto comercial por hectárea (referencia del ahorro). */
  referenciaHa: 900,
  /** Biorreactor completo, sin monitoreo. */
  reactor: 30000,
  /** Sistema de monitoreo (pH, oxígeno disuelto, temperatura y turbidez). */
  monitoreo: 49000,
};
