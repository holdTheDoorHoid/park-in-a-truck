// Русский — карта парков и страница /parks/. Названия парков и адреса не меняются.
import type en from '../en/parks.ts';
import type { Translation } from '../../define.ts';

export default {
  'page.title': 'Уже построенные парки',
  'page.description': 'Настоящие парки в районах Филадельфии, уже построенные с руководством Park in a Truck.',
  'page.eyebrow': 'Построено с Park in a Truck',
  'page.lede':
    'Соседи уже построили по этому руководству настоящие парки в Филадельфии. Вот где они и что о каждом известно — нажмите на метку или карточку, чтобы узнать историю, посмотреть фото и публикации.',
  'park.opened': 'открыт в {year} г.',
  'photo.credit': '{caption} — {credit}',
  'video.alt': 'Видео: {title}',
  'link.english': '(на английском)',
  'park.source': 'Источник: {source}',

  'map.label': 'Карта парков, построенных с Park in a Truck',
  'map.details': 'Подробнее',
  'map.close': 'Закрыть',
  'map.print': 'Интерактивную карту можно посмотреть на сайте, а список парков — ниже.',
} satisfies Translation<typeof en>;
