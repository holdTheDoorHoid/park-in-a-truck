// العربية — خريطة الحدائق وصفحة الحدائق. أسماء الحدائق وعناوينها لا تتغير؛ الأوصاف من src/i18n/data/ar/parks.json.
import type en from '../en/parks.ts';
import type { Translation } from '../../define.ts';

export default {
  'page.title': 'حدائق بُنيت حتى الآن',
  'page.description': 'حدائق أحياء حقيقية بُنيت بالفعل بدليل Park in a Truck في أنحاء فيلادلفيا.',
  'page.eyebrow': 'بُنيت مع Park in a Truck',
  'page.lede':
    'استخدم الجيران هذا الدليل بالفعل لبناء حدائق حقيقية في أنحاء فيلادلفيا. هذه أماكنها، مع ما نعرفه عن كل واحدة — انقر على علامة أو بطاقة لترى القصة والصور والتغطية الصحفية.',
  'park.opened': 'افتُتحت في {year}',
  'photo.credit': '{caption} — {credit}',
  'video.alt': 'فيديو: {title}',
  'link.english': '(بالإنجليزية)',
  'park.source': 'المصدر: {source}',

  'map.label': 'خريطة الحدائق التي بُنيت مع Park in a Truck',
  'map.details': 'اعرض التفاصيل',
  'map.close': 'إغلاق',
  'map.print': 'شاهد الخريطة التفاعلية على الإنترنت، أو قائمة الحدائق في الأسفل.',
} satisfies Translation<typeof en>;
