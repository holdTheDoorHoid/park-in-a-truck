// العربية — ما يكتبه سكربت صفحة «حديقتي»: قائمة المشاريع، والحذف، وفتح ملف مشروع، وملخص قطعة الأرض والإجابات.
import type en from '../en/mypark.ts';
import type { Translation } from '../../define.ts';

export default {
  'project.newDefault': 'حديقة جديدة',
  'list.openNow': '(مفتوح)',
  'list.open': 'افتح',
  'list.delete': 'احذف',
  'list.deleteLabel': 'احذف {name}',
  'delete.confirm': 'هل تحذف «{name}» من هذا المتصفح؟ لا يمكن التراجع عن ذلك إلا إذا كنت قد حفظت ملف المشروع.',
  'delete.done': 'حُذف: {name}.',
  'import.opened': 'فُتح «{name}». أصبح الآن مشروعك النشط.',
  'import.notProject': 'هذا ليس ملف مشروع من Park in a Truck.',

  'lot.address': 'العنوان',
  'lot.owner': 'المالك',
  'lot.size': 'مساحة قطعة الأرض',
  'lot.zoning': 'التصنيف العمراني',
  'lot.ownerLine': '{owner} — {kind}',
  'lot.measured': '{width} × {length} · {area} (مقيسة من حدود قطعة الأرض لدى المدينة)',
  'lot.record': '{frontage} × {depth} قدم · {area} (سجل العقار لدى المدينة)',
  'lot.recordNoArea': '{frontage} × {depth} قدم (سجل العقار لدى المدينة)',
  'lot.none': 'لم تختر قطعة أرض بعد. ابحث عن واحدة في <a href="{href}">الخطوة 1: الحصول على قطعة أرض</a>.',
  'answers.none': 'لم تملأ شيئًا بعد.',
} satisfies Translation<typeof en>;
