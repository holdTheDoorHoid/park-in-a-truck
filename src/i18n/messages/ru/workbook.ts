// Русский — компоненты рабочей тетради, отметки «выполнено», слова для данных города.
// Глоссарий: docs/i18n/glossary.md
import type en from '../en/workbook.ts';
import type { Translation } from '../../define.ts';

export default {
  'project.default': 'Мой парк',

  'callout.tip': 'Совет',
  'callout.note': 'Примечание',
  'callout.warning': 'Внимание',
  'callout.contact': 'Попросите помощи',
  'callout.auto': 'Сделано за вас',
  'callout.site': 'Примечание этого сайта, а не Park in a Truck',

  'field.choose': 'Выберите…',
  'field.auto': '✓ Заполнено по данным города — можно исправить',
  'list.noscript': 'Включите JavaScript, чтобы заполнить эту таблицу, или распечатайте исходную страницу рабочей тетради.',
  // {row} is always in the nominative case: «+ Ещё строка», «+ Ещё участок»
  'list.row': 'строка',
  'list.add': '+ Ещё {row}',
  'list.fillFirst': 'Сначала заполните строку выше ({row}) или впишите в неё что-нибудь.',
  'list.remove': 'Удалить',
  'list.removeRow': 'Удалить строку {n}',
  'list.removed': 'Удалено: {row}.',
  'list.cell': '{label}, строка {n}',

  'done.mark': 'Отметить как выполненное',
  'done.done': 'Выполнено — отлично!',
  'done.badge': '✓ выполнено',
  'progress.of': '{done} из {total}',
  'progress.done': 'выполнено {done} из {total}',
  'progress.total': 'Выполнено пунктов: {done} из {total}',

  'pdf.label': 'Исходная страница рабочей тетради',
  'pdf.page': '(стр. {page} в PDF)',
  'file.english': 'на английском',
  'figure.credit': 'Фото: {credit}',

  'chapter.pdf': '📄 Рабочая тетрадь (PDF)',
  'chapter.print': '🖨 Распечатать мои ответы',
  'chapter.toc': 'В этом шаге',
  'chapter.pager': 'Шаги',
  'chapter.prev': '← {title}',
  'chapter.prevStep': '← Шаг {n}: {title}',
  'chapter.next': 'Далее: шаг {n} — {title} →',
  'chapter.notTranslated':
    'Эта глава ещё не переведена, поэтому показана на английском. Ваши ответы сохраняются одинаково на всех языках.',

  'auto.owner.city': 'Город Филадельфия (государственный)',
  'auto.owner.landbank': 'Philadelphia Land Bank (государственный)',
  'auto.owner.pha': 'Жилищное управление Филадельфии, PHA (государственный)',
  'auto.owner.redevelopment': 'Управление реконструкции Филадельфии (государственный)',
  'auto.owner.other-public': 'Другое государственное ведомство',
  'auto.owner.private': 'Частный владелец (человек, организация или компания)',
  'auto.owner.unknown': 'Неизвестно',
  'auto.lot.mid-block': 'Участок посреди квартала',
  'auto.lot.corner': 'Угловой участок',
  'auto.lot.alley': 'Проход / переулок / сервитут',
  'auto.lot.unknown': 'Не знаю',
  'auto.sun.full-sun': 'Солнце весь день',
  'auto.sun.mostly-sun': 'В основном солнце',
  'auto.sun.mostly-shade': 'В основном тень',
  'auto.sun.deep-shade': 'Густая тень весь день',
  'auto.kind.interior': 'Участок посреди квартала',
  'auto.kind.corner-right': 'Угловой участок (улица справа)',
  'auto.kind.corner-left': 'Угловой участок (улица слева)',
  'auto.trees.none': 'Деревьев нет',
  'auto.trees.few': 'Одно или два дерева',
  'auto.trees.several': 'Несколько деревьев',
  'auto.yes': 'Да',
  'auto.no': 'Нет',
  'auto.sqft': '{n} кв. фт',
  'auto.ft': '{n} фт',
  'auto.size': 'Размер {size}',
} satisfies Translation<typeof en>;
