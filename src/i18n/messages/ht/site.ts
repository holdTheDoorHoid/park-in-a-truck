// Kreyòl ayisyen — ankadreman chak paj. Nou di "ou" ak moun k ap li a. Glosè: docs/i18n/glossary.md
import type en from '../en/site.ts';
import type { Translation } from '../../define.ts';

export default {
  'meta.description': 'Fè plan, bati epi pran swen yon pak nan katye ou ak gid Park in a Truck la.',
  'skip': 'Ale nan kontni an',

  'header.home': 'Park in a Truck — akèy',
  'header.menu': 'Meni',
  'nav.label': 'Prensipal',
  'nav.steps': 'Etap yo',
  'nav.lot': 'Chèche yon teren',
  'nav.planner': 'Fè plan an 3D',
  'nav.build': 'Gid konstriksyon',
  'nav.plants': 'Plant yo',
  'nav.parks': 'Pak yo',
  'nav.myPark': 'Pak mwen:',

  'lang.label': 'Lang',
  'lang.choose': 'Chwazi yon lang',

  'notice.machine': 'Se yon machin ki tradui paj sa a soti nan anglè, kidonk kèk mo ka pa egzat.',
  'notice.readEnglish': 'Li l an anglè',
  'notice.notReady': '{language} ap vini talè — pou kounye a, paj sa a toujou an anglè.',

  'offer.question': 'Ou vle wè sit sa a an kreyòl ayisyen?',
  'offer.yes': 'Wi',
  'offer.no': 'Non, mèsi',

  'footer.about':
    'Yon gid pou vwazen fè yon pak nan katye yo ak pwòp men yo. Li soti nan Pwogram Achitekti Peyizaj la ak Laboratwa pou Inovasyon Sosyal ak Vil (Lab for Social and Urban Innovation) nan Thomas Jefferson University, Filadèlfi. Kontni gid la ak kaye travay yo se pou yo; nou sèvi ak yo avèk pèmisyon yo.',
  'footer.questions': 'Ou gen kesyon?',
  'footer.aboutSite': 'Konsènan sit sa a',
  'footer.saved':
    'Repons ou ak desen ou yo anrejistre sèlman nan navigatè sa a. Sèvi ak <a href="{href}">Pak mwen</a> pou sere yon kopi oswa pou pataje l ak komite w.',
  'footer.resources': 'Resous, patnè ak laprès',
  'footer.legal': 'Avi legal',

  'welcome.eyebrow': 'Byenvini ankò',
  'welcome.lot': 'Kontinye ak teren ou an nan {address}.',
  'welcome.project': 'Kontinye ak pwojè ou a.',
  'welcome.continue': 'Kontinye: {title} →',
  'welcome.myPark': 'Gade Pak mwen →',

  'path.subDone': 'ti etap fini',
} satisfies Translation<typeof en>;
