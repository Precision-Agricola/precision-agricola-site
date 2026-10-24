// Datos de contacto unificados en #40. Los usan Acerca de y Contacto.
export const TELEFONO = '(52) 33 1117 4441';
export const TELEFONO_HREF = 'tel:+523311174441';
export const CORREO = 'precisionagricolamx@gmail.com';
export const UBICACION = 'Jalisco, México';
export const HORARIO = 'Lunes a domingo, 8 a.m. a 5 p.m.';
export const FACEBOOK = 'https://www.facebook.com/precisionagricolamx';

/** Enlace a WhatsApp con un mensaje ya escrito. */
export const whatsapp = (texto = 'Hola, me gustaría recibir información de Precisión Agrícola.') =>
  `https://wa.me/523311174441?text=${encodeURIComponent(texto)}`;

/** Organization de schema.org, igual al de Inicio. */
export const organizacion = {
  '@type': 'Organization',
  name: 'Precisión Agrícola',
  url: 'https://www.precisionagricola.com',
  logo: 'https://www.precisionagricola.com/favicon-32x32.png',
  description: 'Empresa RENIECyT de agricultura de precisión. Fumigación con drones, mapas de fertilidad y biorreactores agrícolas IoT.',
  telephone: '+52-33-1117-4441',
  email: CORREO,
  areaServed: [
    { '@type': 'State', name: 'Jalisco', containedInPlace: { '@type': 'Country', name: 'México' } },
    { '@type': 'State', name: 'Michoacán', containedInPlace: { '@type': 'Country', name: 'México' } },
  ],
  sameAs: [FACEBOOK],
};
