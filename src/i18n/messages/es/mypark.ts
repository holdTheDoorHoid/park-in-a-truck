// Español — lo que escribe el script de la página Mi parque. Glosario: docs/i18n/glossary.md
import type en from '../en/mypark.ts';
import type { Translation } from '../../define.ts';

export default {
  'project.newDefault': 'Parque nuevo',
  'list.openNow': '(abierto)',
  'list.open': 'Abrir',
  'list.delete': 'Borrar',
  'list.deleteLabel': 'Borrar {name}',
  'delete.confirm': '¿Borrar “{name}” de este navegador? No se puede deshacer, a menos que haya guardado un archivo del proyecto.',
  'delete.done': 'Se borró {name}.',
  'import.opened': 'Se abrió “{name}”. Ahora es su proyecto activo.',
  'import.notProject': 'Este no es un archivo de proyecto de Park in a Truck.',

  'lot.address': 'Dirección',
  'lot.owner': 'Dueño',
  'lot.size': 'Tamaño del lote',
  'lot.zoning': 'Zonificación',
  'lot.ownerLine': '{owner} — {kind}',
  'lot.measured': '{width} × {length} · {area} (medido a partir del contorno de la parcela de la Ciudad)',
  'lot.record': '{frontage} × {depth} pies · {area} (registro de la propiedad de la Ciudad)',
  'lot.recordNoArea': '{frontage} × {depth} pies (registro de la propiedad de la Ciudad)',
  'lot.none': 'Todavía no eligió un lote. Busque uno en <a href="{href}">Paso 1: Adquirir</a>.',
  'answers.none': 'Todavía no ha llenado nada.',
} satisfies Translation<typeof en>;
