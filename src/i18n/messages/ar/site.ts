// العربية الفصحى المبسطة. اتجاه الكتابة من اليمين إلى اليسار. المسرد: docs/i18n/glossary.md
// Arrows point the way the reader moves: "next" is ← in Arabic.
import type en from '../en/site.ts';
import type { Translation } from '../../define.ts';

export default {
  'meta.description': 'خطِّط لحديقة في حيّك وابنِها واعتنِ بها، بمساعدة دليل Park in a Truck.',
  'skip': 'انتقل إلى المحتوى',

  'header.home': 'Park in a Truck — الصفحة الرئيسية',
  'header.menu': 'القائمة',
  'nav.label': 'التنقل الرئيسي',
  'nav.steps': 'الخطوات',
  'nav.lot': 'ابحث عن قطعة أرض',
  'nav.planner': 'التصميم ثلاثي الأبعاد',
  'nav.build': 'أدلة البناء',
  'nav.plants': 'النباتات',
  'nav.parks': 'الحدائق',
  'nav.myPark': 'حديقتي:',

  'lang.label': 'اللغة',
  'lang.choose': 'اختر لغة',

  'notice.machine': 'تُرجمت هذه الصفحة من الإنجليزية آليًّا، لذا قد لا تكون بعض الكلمات دقيقة.',
  'notice.readEnglish': 'اقرأها بالإنجليزية',
  'notice.notReady': 'ستتوفر {language} قريبًا؛ هذه الصفحة ما زالت بالإنجليزية.',

  'offer.question': 'هل تريد عرض هذا الموقع بالعربية؟',
  'offer.yes': 'نعم',
  'offer.no': 'لا، شكرًا',

  'footer.about':
    'دليل لإنشاء حدائق الأحياء بنفسك، من برنامج هندسة المناظر الطبيعية ومختبر الابتكار الاجتماعي والحضري في جامعة توماس جيفرسون في فيلادلفيا. محتوى الدليل وكراسات العمل مِلك لهم، ونستخدمه بإذنهم.',
  'footer.questions': 'لديك أسئلة؟',
  'footer.aboutSite': 'عن هذا الموقع',
  'footer.saved': 'تُحفظ إجاباتك وتصميماتك في هذا المتصفح فقط. استخدم <a href="{href}">حديقتي</a> لحفظ نسخة أو مشاركتها مع لجنتك.',
  'footer.resources': 'الموارد والشركاء والصحافة',
  'footer.legal': 'إشعار قانوني',

  'welcome.eyebrow': 'أهلًا بعودتك',
  'welcome.lot': 'تابِع العمل على قطعة الأرض في {address}.',
  'welcome.project': 'تابِع العمل على مشروعك.',
  'welcome.continue': 'تابِع: {title} ←',
  'welcome.myPark': 'اعرض حديقتي ←',

  'path.subDone': 'من الخطوات الفرعية منجزة',
} satisfies Translation<typeof en>;
