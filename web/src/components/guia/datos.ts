// Datos y esquemas JSON-LD de /biofabrica-on-farm, portados sin cambios de
// themes/precision-agricola/pages/biofabrica-on-farm.htm.

export const meta = {
  title: 'Biofábricas agrícolas: guía on-farm | Precisión Agrícola',
  description:
    'Qué es una biofábrica agrícola, cómo funciona y qué necesitas para producir bioinsumos en tu rancho: equipo, microorganismos, operación y control de calidad.',
  ogImageAlt: 'Túneles de cultivo de berries en una unidad de producción agrícola',
};

export interface Beneficio {
  titulo: string;
  texto: string;
  icono: string;
}

export const beneficios: Beneficio[] = [
  {
    titulo: 'Automatización IoT continua',
    texto:
      'Sensores miden pH, oxígeno disuelto, temperatura, CO₂, NH₃ y H₂S durante toda la fermentación. La oxigenación y recirculación se controlan automáticamente según el protocolo del consorcio en producción.',
    icono: 'M2 5a1 1 0 011-1h14a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V5zm2 1v8h12V6H4zm2 2h8v1H6V8zm0 2h8v1H6v-1zm0 2h5v1H6v-1z',
  },
  {
    titulo: 'Datos históricos por lote',
    texto:
      'Cada ciclo productivo se registra: parámetros de fermentación, fechas de muestreo, conteo de UFC, identidad de la cepa. Permite trazabilidad completa y análisis de tendencias por cultivo y región.',
    icono: 'M3 17h14v1H3v-1zm2-4h2v3H5v-3zm3-3h2v6H8v-6zm3-3h2v9h-2V7zm3-3h2v12h-2V4z',
  },
  {
    titulo: 'Aplicación fresca en el sitio',
    texto:
      'Los microorganismos se aplican al cultivo dentro de horas o pocos días de cosechados del biorreactor, sin las pérdidas de viabilidad asociadas al transporte y almacenamiento prolongado de productos comerciales.',
    icono: 'M10 2a8 8 0 100 16 8 8 0 000-16zm-.5 11.5l-3-3 1.4-1.4 1.6 1.6 4.6-4.6 1.4 1.4-6 6z',
  },
  {
    titulo: 'Autonomía operativa',
    texto:
      'El productor define cuándo, cuánto y de qué consorcio producir según su calendario agronómico. Sin dependencia de la disponibilidad del proveedor, tiempos de embarque o desabastos estacionales.',
    icono:
      'M9 2h2v2H9V2zm0 14h2v2H9v-2zM2 9h2v2H2V9zm14 0h2v2h-2V9zm-1.6-5.4l1.4 1.4-1.4 1.4-1.4-1.4 1.4-1.4zm-9.8 9.8l1.4 1.4-1.4 1.4-1.4-1.4 1.4-1.4zm9.8 1.4l-1.4-1.4 1.4-1.4 1.4 1.4-1.4 1.4zm-9.8-9.8L3.2 4.6 4.6 3.2l1.4 1.4-1.4 1.4z',
  },
];

export interface ParametroConsorcio {
  label: string;
  value: string;
}

export interface Consorcio {
  rol: string;
  nombre: string;
  descripcion: string;
  parametros: ParametroConsorcio[];
}

export const consorcios: Consorcio[] = [
  {
    rol: 'Biofungicida y enraizamiento activo',
    nombre: 'Bacillus subtilis',
    descripcion:
      'Destruye paredes celulares de hongos patógenos como Fusarium y Rhizoctonia. A la vez, sintetiza hormonas que estimulan un crecimiento radicular vigoroso.',
    parametros: [
      { label: 'Función', value: 'Raíz' },
      { label: 'Uso principal', value: 'Biofungicida' },
      { label: 'O₂ disuelto', value: '20 – 40 %' },
      { label: 'H₂S tolerado', value: '≤ 1 ppm' },
      { label: 'NH₃ tolerado', value: '≤ 1 ppm' },
    ],
  },
  {
    rol: 'Biocontrol de plagas',
    nombre: 'Bacillus thuringiensis',
    descripcion:
      'Insecticida biológico contra larvas y orugas. Controla plagas sin dejar residuos químicos, ideal para agricultura de exportación.',
    parametros: [
      { label: 'Función', value: 'Plagas' },
      { label: 'Uso principal', value: 'Larvas' },
      { label: 'O₂ disuelto', value: '30 – 40 %' },
      { label: 'H₂S tolerado', value: '≤ 1 ppm' },
      { label: 'NH₃ tolerado', value: '≤ 1 ppm' },
    ],
  },
  {
    rol: 'Inmunidad foliar inducida',
    nombre: 'Bacillus pumilus',
    descripcion:
      'Activa el sistema de resistencia inducida en hojas y enciende defensas naturales contra cenicillas, royas y mildiu antes de que ocurran.',
    parametros: [
      { label: 'Función', value: 'Hoja' },
      { label: 'Uso principal', value: 'Defensa' },
      { label: 'O₂ disuelto', value: '20 – 30 %' },
      { label: 'H₂S tolerado', value: '≤ 1 ppm' },
      { label: 'NH₃ tolerado', value: '≤ 1 ppm' },
    ],
  },
  {
    rol: 'Desbloqueo mineral y tolerancia al estrés',
    nombre: 'Bacillus safensis',
    descripcion:
      'Solubiliza fósforo y potasio atrapados en el suelo. Regula el metabolismo de la planta para tolerar sequía, salinidad o calor.',
    parametros: [
      { label: 'Función', value: 'Suelo' },
      { label: 'Uso principal', value: 'Estrés' },
      { label: 'O₂ disuelto', value: '20 – 40 %' },
      { label: 'H₂S tolerado', value: '≤ 1 ppm' },
      { label: 'NH₃ tolerado', value: '≤ 1 ppm' },
    ],
  },
  {
    rol: 'Escudo radicular y regeneración',
    nombre: 'Trichoderma harzianum',
    descripcion:
      'Hongo agresivo contra patógenos del suelo. Potencia el crecimiento de la raíz y mejora la estructura del suelo a largo plazo.',
    parametros: [
      { label: 'Función', value: 'Raíz' },
      { label: 'Uso principal', value: 'Regeneración' },
      { label: 'O₂ disuelto', value: '20 – 40 %' },
      { label: 'H₂S tolerado', value: '≤ 1 ppm' },
      { label: 'NH₃ tolerado', value: '≤ 1 ppm' },
    ],
  },
  {
    rol: 'Colonización rápida y protección',
    nombre: 'Pseudomonas spp.',
    descripcion:
      'Bacterias de establecimiento rápido que ayudan a combatir patógenos y protegen la raíz desde el primer día.',
    parametros: [
      { label: 'Función', value: 'Raíz' },
      { label: 'Uso principal', value: 'Protección' },
      { label: 'O₂ disuelto', value: '20 – 40 %' },
      { label: 'H₂S tolerado', value: '≤ 1 ppm' },
      { label: 'NH₃ tolerado', value: '≤ 1 ppm' },
    ],
  },
];

export interface PreguntaFrecuente {
  pregunta: string;
  respuesta: string;
}

export const preguntasFrecuentes: PreguntaFrecuente[] = [
  {
    pregunta: '¿Necesito personal especializado para operarla?',
    respuesta:
      'No. El personal del rancho —con la capacitación inicial incluida— puede operar las fermentaciones cotidianas (llenado, dosificación de medio, inoculación, monitoreo del dashboard, limpieza). El equipo técnico de Precisión Agrícola supervisa parámetros remotamente y acompaña cambios de protocolo, introducción de cepas nuevas o eventos atípicos.',
  },
  {
    pregunta: '¿Qué tan crítica es la calidad del agua?',
    respuesta:
      'Muy importante. Se requiere agua limpia, libre de cloro o con un máximo tolerable de 5 ppm. Preferentemente agua de pozo o agua reposada; si no se dispone, debe purificarse con filtros UV. El pH inicial debe estar entre 5.5 y 7.5 antes de iniciar el proceso.',
  },
  {
    pregunta: '¿Cómo se controla la calidad de cada lote?',
    respuesta:
      'Por dos vías paralelas: (1) sensores IoT que registran continuamente pH, oxígeno disuelto, temperatura, CO₂, NH₃ y H₂S durante toda la fermentación; (2) muestreo microbiológico cada 15 días con diluciones seriadas y conteo de UFC en placa Petri incubada a 28-30 °C por 48-72 horas, lo que permite identificar el pico de producción óptimo y decidir si reactivar el ciclo o reforzar con cepa nueva.',
  },
  {
    pregunta: '¿Cada cuándo hay que limpiar el sistema?',
    respuesta:
      'Cada 3 ciclos de producción si se trata de la misma cepa; o inmediatamente al terminar de vaciar el biorreactor si se va a incorporar una cepa distinta. Procedimiento: vaciado y enjuague con agua a presión, desinfección con peróxido de hidrógeno agrícola al 70%, enjuague mínimo 2 veces con agua limpia, y limpieza de sensores y válvulas.',
  },
  {
    pregunta: '¿En qué etapa está la validación del sistema?',
    respuesta:
      'El sistema integrado se encuentra en validación de campo con productores piloto. Los protocolos operativos están definidos y operativos; lo que sigue refinándose es la respuesta agronómica diferenciada por cultivo y región climática, con acumulación de datos históricos por cada ciclo productivo registrado.',
  },
];

export const jsonLdArticle = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Biofábrica On-Farm: produce tus bioinsumos directamente en tu unidad de producción',
  description:
    'Guía técnica sobre qué es una biofábrica on-farm, sus componentes, los consorcios microbianos producidos y los parámetros operativos con biorreactores agrícolas IoT.',
  author: {
    '@type': 'Organization',
    name: 'Precisión Agrícola',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Precisión Agrícola',
    logo: {
      '@type': 'ImageObject',
      url: 'https://www.precisionagricola.com/themes/precision-agricola/assets/images/favicon-32x32.png',
    },
  },
  image: 'https://www.precisionagricola.com/themes/precision-agricola/assets/images/bioreactors/tunnels_berries_og.jpg',
  datePublished: '2026-05-10',
  dateModified: '2026-10-02',
  mainEntityOfPage: 'https://www.precisionagricola.com/biofabrica-on-farm',
  about: [
    { '@type': 'Thing', name: 'Biofábrica on-farm' },
    { '@type': 'Thing', name: 'Bioinsumos' },
    { '@type': 'Thing', name: 'Biorreactores agrícolas' },
    { '@type': 'Thing', name: 'Consorcios microbianos' },
  ],
};

export const jsonLdFaq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '¿Qué es una biofábrica on-farm?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Una biofábrica on-farm es una infraestructura biotecnológica instalada directamente en la unidad de producción agrícola, compuesta por biorreactores con sensores IoT, cepas microbianas certificadas y protocolos de fermentación. Permite al productor multiplicar microorganismos benéficos y aplicar bioinsumos frescos en el sitio donde se necesitan.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Qué consorcios microbianos se producen en una biofábrica on-farm?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Se manejan seis productos microbianos: Bacillus subtilis, Bacillus thuringiensis, Bacillus pumilus, Bacillus safensis, Trichoderma harzianum y Pseudomonas spp. Cubren biofungicida y enraizamiento, biocontrol de plagas, inmunidad foliar, desbloqueo mineral, escudo radicular y colonización rápida de raíz.',
      },
    },
    {
      '@type': 'Question',
      name: '¿Cómo se controla la calidad de cada lote producido?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Mediante sensores IoT que registran continuamente pH, oxígeno disuelto, temperatura, CO₂, NH₃ y H₂S durante toda la fermentación. Cada 15 días se realiza muestreo microbiológico con técnica de diluciones seriadas y conteo de UFC en placa Petri incubada a 28-30 °C por 48-72 horas para validar la viabilidad.',
      },
    },
    {
      '@type': 'Question',
      name: '¿En qué etapa está la validación del sistema?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'El sistema integrado biorreactor + IoT + consorcios microbianos está en fase de validación en campo con productores piloto en Jalisco y Michoacán. Cada ciclo productivo aporta datos históricos al modelo de operación, lo que permite optimización continua de protocolos por cultivo, región y consorcio.',
      },
    },
  ],
};
