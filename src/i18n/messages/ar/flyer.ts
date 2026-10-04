// العربية — نشرة الاجتماع. جمل قصيرة: تُطبع بخط كبير على نصف صفحة.
// The flyer speaks to the whole neighbourhood, so it addresses a group (أنتم).
import type en from '../en/flyer.ts';
import type { Translation } from '../../define.ts';

export default {
  'eyebrow': 'أنتم مدعوون',
  'headline': 'اجتماع للجيران: حديقة جديدة لحيّنا',
  'when': 'متى',
  'where': 'أين',
  'lot': 'قطعة الأرض',
  'contact': 'لديكم أسئلة؟ تواصلوا مع',
  'committee': 'لجنة حديقتنا',
  'credit': 'صُنعت بدليل Park in a Truck · Thomas Jefferson University',

  'ui.empty':
    'املأ في الأعلى تاريخ الاجتماع ووقته ومكانه والغرض منه (وأضف عضوًا من اللجنة) لترى شكل نشرتك.',
  'ui.noContact': 'أضف عضوًا من اللجنة في الأعلى لتضع هنا جهة للتواصل.',
  'ui.print': '🖨 اطبع النشرة',
  'ui.language': 'لغة النشرة',
  'ui.second': 'لغة ثانية، جنبًا إلى جنب',
  'ui.none': 'لا شيء',
  'ui.notReady': '{language} (لم تُترجم بعد)',
  'ui.purpose2': 'الغرض من الاجتماع، باللغة: {language} (اختياري)',
  'ui.purpose2Hint': 'ما كتبته في الأعلى يُطبع كما هو؛ أضف هنا ترجمة له للعمود الثاني.',
} satisfies Translation<typeof en>;
