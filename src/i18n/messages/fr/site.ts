// Français (international : lecteurs d'Afrique de l'Ouest, d'Haïti, d'Europe et du Canada). « vous ».
// Glossaire : docs/i18n/glossary.md. Espace insécable (U+00A0) avant : ; ? ! et dans « ».
import type en from '../en/site.ts';
import type { Translation } from '../../define.ts';

export default {
  'meta.description': 'Planifiez, construisez et entretenez un parc de quartier avec la boîte à outils Park in a Truck.',
  'skip': 'Aller au contenu',

  'header.home': 'Park in a Truck — accueil',
  'header.menu': 'Menu',
  'nav.label': 'Principal',
  'nav.steps': 'Étapes',
  'nav.lot': 'Trouver un terrain',
  'nav.planner': 'Plan en 3D',
  'nav.build': 'Guides de montage',
  'nav.plants': 'Plantes',
  'nav.parks': 'Parcs',
  'nav.myPark': 'Mon parc :',

  'lang.label': 'Langue',
  'lang.choose': 'Choisissez une langue',

  'notice.machine': 'Cette page a été traduite de l’anglais par une machine : certains mots peuvent être inexacts.',
  'notice.readEnglish': 'La lire en anglais',
  'notice.notReady': 'Le {language} arrive bientôt ; pour l’instant, cette page est en anglais.',

  'offer.question': 'Voir ce site en français ?',
  'offer.yes': 'Oui',
  'offer.no': 'Non merci',

  'footer.about':
    'Une boîte à outils pour créer soi-même un parc de quartier, conçue par le programme d’architecture du paysage et le Laboratoire d’innovation sociale et urbaine de Thomas Jefferson University, à Philadelphie. Le contenu de la boîte à outils et des cahiers leur appartient ; il est utilisé avec leur permission.',
  'footer.questions': 'Des questions ?',
  'footer.aboutSite': 'À propos de ce site',
  'footer.saved':
    'Vos réponses et vos plans sont enregistrés uniquement dans ce navigateur. Allez dans <a href="{href}">Mon parc</a> pour en garder une copie ou la partager avec votre comité.',
  'footer.resources': 'Ressources, partenaires et presse',
  'footer.legal': 'Mentions légales',

  'welcome.eyebrow': 'Bon retour parmi nous',
  'welcome.lot': 'Continuez avec votre terrain au {address}.',
  'welcome.project': 'Continuez votre projet.',
  'welcome.continue': 'Continuer : {title} →',
  'welcome.myPark': 'Voir Mon parc →',

  'path.subDone': 'sous-étapes terminées',
} satisfies Translation<typeof en>;
