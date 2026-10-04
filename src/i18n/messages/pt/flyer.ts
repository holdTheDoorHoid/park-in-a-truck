// Português do Brasil — o folheto da reunião (impresso em letras grandes; frases curtas).
import type en from '../en/flyer.ts';
import type { Translation } from '../../define.ts';

export default {
  'eyebrow': 'Você está convidado',
  'headline': 'Reunião do bairro: um novo parque para a nossa vizinhança',
  'when': 'Quando',
  'where': 'Onde',
  'lot': 'O terreno',
  'contact': 'Dúvidas? Fale com',
  'committee': 'Nossa comissão do parque',
  'credit': 'Feito com o guia Park in a Truck · Thomas Jefferson University',

  'ui.empty': 'Preencha acima a data, a hora, o local e o objetivo da reunião (e adicione um membro da comissão) para ver o seu folheto tomar forma.',
  'ui.noContact': 'Adicione acima um membro da comissão para colocar um contato aqui.',
  'ui.print': '🖨 Imprimir folheto',
  'ui.language': 'Idioma do folheto',
  'ui.second': 'Segundo idioma, lado a lado',
  'ui.none': 'Nenhum',
  'ui.notReady': '{language} (ainda não traduzido)',
  'ui.purpose2': 'Objetivo, em {language} (opcional)',
  'ui.purpose2Hint': 'O que você escreveu acima é impresso do jeito que está; coloque aqui uma tradução para a segunda coluna.',
} satisfies Translation<typeof en>;
