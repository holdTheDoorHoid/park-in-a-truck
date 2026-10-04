// Português do Brasil. Tratamento por "você". Glossário: docs/i18n/glossary.md
import type en from '../en/site.ts';
import type { Translation } from '../../define.ts';

export default {
  'meta.description': 'Planeje, construa e cuide de um parque de bairro com o guia Park in a Truck.',
  'skip': 'Pular para o conteúdo',

  'header.home': 'Park in a Truck — início',
  'header.menu': 'Menu',
  'nav.label': 'Principal',
  'nav.steps': 'Etapas',
  'nav.lot': 'Terrenos',
  'nav.planner': 'Planejar em 3D',
  'nav.build': 'Guias de montagem',
  'nav.plants': 'Plantas',
  'nav.parks': 'Parques',
  'nav.myPark': 'Meu parque:',

  'lang.label': 'Idioma',
  'lang.choose': 'Escolha um idioma',

  'notice.machine': 'Esta página foi traduzida do inglês por máquina, então algumas palavras podem não estar certas.',
  'notice.readEnglish': 'Ler em inglês',
  'notice.notReady': '{language} em breve — esta página ainda está em inglês.',

  'offer.question': 'Ver este site em português?',
  'offer.yes': 'Sim',
  'offer.no': 'Não, obrigado',

  'footer.about':
    'Um guia faça-você-mesmo para parques de bairro, do Programa de Arquitetura Paisagística e do Laboratório de Inovação Social e Urbana (Lab for Social and Urban Innovation) da Thomas Jefferson University, Filadélfia. O conteúdo do guia e dos cadernos de trabalho é deles, usado com permissão.',
  'footer.questions': 'Dúvidas?',
  'footer.aboutSite': 'Sobre este site',
  'footer.saved': 'Suas respostas e seus desenhos ficam salvos só neste navegador. Use <a href="{href}">Meu parque</a> para guardar uma cópia ou compartilhar com a sua comissão.',
  'footer.resources': 'Recursos, parceiros e imprensa',
  'footer.legal': 'Aviso legal',

  'welcome.eyebrow': 'Que bom ver você de novo',
  'welcome.lot': 'Continue com o seu terreno em {address}.',
  'welcome.project': 'Continue com o seu projeto.',
  'welcome.continue': 'Continuar: {title} →',
  'welcome.myPark': 'Ver Meu parque →',

  'path.subDone': 'subetapas feitas',
} satisfies Translation<typeof en>;
