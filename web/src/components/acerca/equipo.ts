// Equipo de Acerca de, en el orden del sitio actual. Los retratos salen de los
// SVG de themes/precision-agricola/assets/images/team/ (18 a 29), pasados a JPG.
import type { ImageMetadata } from 'astro';
import victor from '../../assets/acerca/equipo/18.jpg';
import adrian from '../../assets/acerca/equipo/19.jpg';
import jessica from '../../assets/acerca/equipo/20.jpg';
import alberto from '../../assets/acerca/equipo/21.jpg';
import cesar from '../../assets/acerca/equipo/22.jpg';
import eduardo from '../../assets/acerca/equipo/23.jpg';
import raul from '../../assets/acerca/equipo/24.jpg';
import romulo from '../../assets/acerca/equipo/25.jpg';
import jesus from '../../assets/acerca/equipo/27.jpg';
import luis from '../../assets/acerca/equipo/29.jpg';

export interface Integrante {
  nombre: string;
  rol: string;
  foto: ImageMetadata;
}

export const equipo: Integrante[] = [
  { nombre: 'PhD Victor Medina', rol: 'Agrónomo, filántropo, investigador', foto: victor },
  { nombre: 'Adrian Alvarado', rol: 'Agrónomo', foto: adrian },
  { nombre: 'PhD Jessica Arroyo', rol: 'Investigación e impacto social', foto: jessica },
  { nombre: 'PhD Alberto de Obeso', rol: 'CTO', foto: alberto },
  { nombre: 'Cesar Salgado', rol: 'CEO & Co Founder', foto: cesar },
  { nombre: 'PhD Eduardo Santos', rol: 'Computer Designer Lead', foto: eduardo },
  { nombre: 'PhD Raul Venegas J', rol: 'Ing. en electrónica & telecomunicaciones', foto: raul },
  { nombre: 'Ing. Rómulo Troncoso', rol: 'Computing Designer', foto: romulo },
  { nombre: 'Ing. Jesús Bejarano', rol: 'Jefe de Operaciones', foto: jesus },
  { nombre: 'Luis Cisneros', rol: 'Ing. agrónomo de operaciones', foto: luis },
];
