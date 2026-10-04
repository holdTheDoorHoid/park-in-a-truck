// Русский — скрипт страницы «Мой парк»: список проектов, файл проекта, сводка об участке.
import type en from '../en/mypark.ts';
import type { Translation } from '../../define.ts';

export default {
  'project.newDefault': 'Новый парк',
  'list.openNow': '(открыт)',
  'list.open': 'Открыть',
  'list.delete': 'Удалить',
  'list.deleteLabel': 'Удалить «{name}»',
  'delete.confirm': 'Удалить «{name}» из этого браузера? Отменить это нельзя, если вы не сохранили файл проекта.',
  'delete.done': '«{name}» удалён.',
  'import.opened': 'Открыт «{name}». Теперь это ваш текущий проект.',
  'import.notProject': 'Это не файл проекта Park in a Truck.',

  'lot.address': 'Адрес',
  'lot.owner': 'Владелец',
  'lot.size': 'Размер участка',
  'lot.zoning': 'Зонирование',
  'lot.ownerLine': '{owner} — {kind}',
  'lot.measured': '{width} × {length} · {area} (измерено по границам участка на карте города)',
  'lot.record': '{frontage} × {depth} фт · {area} (данные города о недвижимости)',
  'lot.recordNoArea': '{frontage} × {depth} фт (данные города о недвижимости)',
  'lot.none': 'Участок ещё не выбран. Найдите его в разделе <a href="{href}">Шаг 1: Приобрести</a>.',
  'answers.none': 'Пока ничего не заполнено.',
} satisfies Translation<typeof en>;
