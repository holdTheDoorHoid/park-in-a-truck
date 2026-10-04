// Português do Brasil — mapa e página dos parques. Nomes de parques e endereços não mudam.
import type en from '../en/parks.ts';
import type { Translation } from '../../define.ts';

export default {
  'page.title': 'Parques já construídos',
  'page.description': 'Parques de bairro de verdade, já construídos com o guia Park in a Truck pela Filadélfia.',
  'page.eyebrow': 'Construídos com o Park in a Truck',
  'page.lede':
    'Vizinhos já usaram este guia para construir parques de verdade pela Filadélfia. Veja onde, com o que se sabe de cada um — clique num marcador ou num cartão para ver a história, as fotos e as matérias na imprensa.',
  'park.opened': 'inaugurado em {year}',
  'photo.credit': '{caption} — {credit}',
  'video.alt': 'Vídeo: {title}',
  'link.english': '(em inglês)',
  'park.source': 'Fonte: {source}',

  'map.label': 'Mapa dos parques construídos com o Park in a Truck',
  'map.details': 'Ver detalhes',
  'map.close': 'Fechar',
  'map.print': 'Veja o mapa interativo on-line, ou a lista de parques abaixo.',
} satisfies Translation<typeof en>;
