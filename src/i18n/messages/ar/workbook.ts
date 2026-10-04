// العربية — النصوص التي تظهر في الصفحة الرئيسية وصفحات الخطوات حتى الآن (التقدم وعلامة الإنجاز).
// The rest of this area is still to translate (npm run i18n:check -- --locale ar --verbose lists it).
import type en from '../en/workbook.ts';
import type { Translation } from '../../define.ts';

export default {
  'done.mark': 'ضع علامة: أُنجزت هذه الخطوة',
  'done.done': 'أُنجزت — أحسنت!',
  'done.badge': '✓ أُنجزت',
  'progress.of': '{done} من {total}',
  'progress.done': 'المنجز: {done} من {total}',
  'progress.total': 'الخطوات المنجزة: {done} من {total}',
  'chapter.toc': 'في هذه الخطوة',
  'chapter.pager': 'الخطوات',
  'chapter.prev': '→ {title}',
  'chapter.prevStep': '→ الخطوة {n}: {title}',
  'chapter.next': 'التالي: الخطوة {n} — {title} ←',
  'chapter.notTranslated': 'لم يُترجم هذا الفصل بعد، لذا يظهر بالإنجليزية. تُحفظ إجاباتك بالطريقة نفسها في كل اللغات.',
  'file.english': 'بالإنجليزية',
} satisfies Translation<typeof en>;
