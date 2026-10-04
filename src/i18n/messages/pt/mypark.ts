// Português do Brasil — o script da página Meu parque. Glossário: docs/i18n/glossary.md
import type en from '../en/mypark.ts';
import type { Translation } from '../../define.ts';

export default {
  'project.newDefault': 'Novo parque',
  'list.openNow': '(aberto)',
  'list.open': 'Abrir',
  'list.delete': 'Apagar',
  'list.deleteLabel': 'Apagar {name}',
  'delete.confirm': 'Apagar “{name}” deste navegador? Não dá para desfazer, a não ser que você tenha salvado um arquivo do projeto.',
  'delete.done': '{name} apagado.',
  'import.opened': '“{name}” foi aberto. Agora ele é o seu projeto ativo.',
  'import.notProject': 'Este não é um arquivo de projeto do Park in a Truck.',

  'lot.address': 'Endereço',
  'lot.owner': 'Dono',
  'lot.size': 'Tamanho do terreno',
  'lot.zoning': 'Zoneamento',
  'lot.ownerLine': '{owner} — {kind}',
  'lot.measured': '{width} × {length} · {area} (medido no contorno do lote no mapa da Prefeitura)',
  'lot.record': '{frontage} × {depth} pés · {area} (registro do imóvel na Prefeitura)',
  'lot.recordNoArea': '{frontage} × {depth} pés (registro do imóvel na Prefeitura)',
  'lot.none': 'Nenhum terreno escolhido ainda. Procure um na <a href="{href}">Etapa 1: Adquirir</a>.',
  'answers.none': 'Nada preenchido ainda.',
} satisfies Translation<typeof en>;
