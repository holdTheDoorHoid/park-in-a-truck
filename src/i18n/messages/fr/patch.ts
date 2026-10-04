// Français. « vous ». Les propres mots de PiaT ; paragraphes entiers. Glossaire : docs/i18n/glossary.md
import type en from '../en/patch.ts';
import type { Translation } from '../../define.ts';

export default {
  'title': 'Park Patch',
  'description':
    'La taille n’a pas d’importance : transformez un carré de 4x4, une cour avant ou une jardinière de fenêtre en un coin fleuri pour les pollinisateurs avec le cahier Park Patch.',
  'lede':
    'Vous n’avez pas de terrain vacant ? La taille n’a pas d’importance. Le cahier Pollinator Planting Patch (un coin de plantations pour les pollinisateurs) transforme n’importe quel espace — un carré de 4×4, une cour avant, même une jardinière de fenêtre — en plantation de plantes indigènes pour les pollinisateurs, avec le même genre de guide étape par étape que pour un parc complet.',
  'originalPdf': '📄 Cahier original (PDF)',
  'printAnswers': '🖨 Imprimer mes réponses',
  'intro':
    'Planter des plantes indigènes pour les pollinisateurs apporte de nombreux bienfaits : cela améliore la santé du sol et empêche l’érosion, nourrit et abrite la faune locale, offre une beauté unique, pousse bien dans votre climat local avec moins d’eau et moins de produits chimiques, et aide l’écologie de votre quartier à mieux résister au changement climatique — tout en demandant moins d’entretien qu’un massif ordinaire.',

  'yourArea.title': 'Votre zone de plantation',
  'yourArea.text':
    'Évaluez la zone que vous voulez planter à l’aide de votre plan de base de l’étape Évaluer ou, si vous n’en avez pas, estimez la surface (en pieds carrés) que vous voulez consacrer aux plantations.',
  'yourArea.lengthLabel': 'Quelle est la longueur de votre coin ?',
  'yourArea.widthLabel': 'Quelle est la largeur de votre coin ?',
  'yourArea.sunLabel': 'Quelles sont la longueur et la largeur de la partie au soleil ?',
  'yourArea.shadeLabel': 'Quelles sont la longueur et la largeur de la partie à l’ombre ?',
  'yourArea.alt':
    'Plan quadrillé d’un coin de plantation, avec ce qui existe déjà sur place — la maison d’un voisin et sa gouttière, un érable, une zone parfois humide, un cornouiller et un pommier sauvage, des lignes électriques aériennes et une bouche d’incendie — et les zones de plantation pour les pollinisateurs indiquées au soleil et à l’ombre',

  'palette.title': 'Choisissez une palette de plantes',
  'palette.text':
    'Que vous rêviez d’un coin douillet d’herbes et de fleurs sauvages, ou d’un espace luxuriant avec des arbustes et des arbres, choisissez la palette qui vous convient le mieux, à vous et à votre site. (La ligne pointillée de chaque exemple indique 6 pieds, soit la hauteur des yeux : utile si vous voulez cacher une vue ou la garder dégagée.)',
  'palette.chooseLabel': 'Quelle palette convient à votre espace ?',
  'palette.alt': 'Exemple de plan de plantation pour la palette {name}, avec l’espacement et les groupes de plantes indiqués',
  'palette.plantListLabel': 'Liste de plantes du coin pour pollinisateurs',
  'palette.plantListNote': 'Un seul tableur, un onglet par palette : faites-en votre propre copie pour la modifier',

  'palette.grasses-wildflowers.name': 'Herbes et fleurs sauvages',
  'palette.grasses-wildflowers.good': 'Les petits espaces, favoriser la biodiversité et soutenir les pollinisateurs',
  'palette.grasses-wildflowers.why.sightlines': 'Une vue dégagée : en général moins de 3 pieds de haut, donc la vue reste ouverte.',
  'palette.grasses-wildflowers.why.waterWise': 'Une solution économe en eau pour remplacer la pelouse : moins d’eau, d’engrais et de tonte.',
  'palette.grasses-wildflowers.why.buffet': 'Un buffet de pollen, de nectar et de graines pour les pollinisateurs.',
  'palette.grasses-wildflowers.why.fullSun': 'Pousse très bien en plein soleil.',
  'palette.grasses-wildflowers.why.color': 'De la couleur toute la saison.',

  'palette.grasses-shrubs.name': 'Herbes, fleurs sauvages + arbustes',
  'palette.grasses-shrubs.good': 'Cacher quelque chose de laid et donner de la structure, avec moins d’entretien que les herbes et les fleurs sauvages seules',
  'palette.grasses-shrubs.why.screens': 'Cache les vues disgracieuses.',
  'palette.grasses-shrubs.why.shelter': 'Plus d’abris et un restaurant cinq étoiles pour les pollinisateurs.',
  'palette.grasses-shrubs.why.structure': 'Donne de la structure et un peu plus de hauteur : la plupart des arbustes restent sous 4 pieds.',
  'palette.grasses-shrubs.why.lowMaintenance':
    'Moins d’entretien que les herbes et les fleurs sauvages seules ; une légère taille la 3e ou la 4e année garde le tout bien net.',

  'palette.grasses-shrubs-trees.name': 'Herbes, fleurs sauvages, arbustes + arbres',
  'palette.grasses-shrubs-trees.good': 'Un habitat complet, le plus résistant toute l’année',
  'palette.grasses-shrubs-trees.why.habitat': 'Crée un véritable habitat et un abri douillet pour la faune.',
  'palette.grasses-shrubs-trees.why.resilience': 'Renforce la résistance de toute la plantation.',
  'palette.grasses-shrubs-trees.why.sanctuary': 'Un refuge privé plein de vie, toute l’année.',

  'palette.grasses-trees.name': 'Herbes, fleurs sauvages + arbres',
  'palette.grasses-trees.good': 'Un peu d’ombre, avec une vue dégagée en dessous',
  'palette.grasses-trees.why.elegance': 'Les arbres indigènes apportent une élégance locale adaptée à votre région.',
  'palette.grasses-trees.why.airQuality': 'Un air de meilleure qualité : les arbres absorbent les polluants et libèrent de l’oxygène.',
  'palette.grasses-trees.why.habitat': 'Un habitat et de la nourriture pour la faune locale.',
  'palette.grasses-trees.why.carbon': 'Stockage du carbone.',
  'palette.grasses-trees.why.shade':
    'Un peu d’ombre avec un tapis de plantes en dessous, tout en gardant une bonne visibilité sur tout le site.',

  'notes.title': 'Conseils généraux de plantation',
  'notes.groups': 'Plantez vos herbes et vos fleurs sauvages en groupes, d’au moins 4 à 5 plantes par groupe, en triangle, à 24" les unes des autres.',
  'notes.shrubs': 'Plantez les arbustes en triangle à 48" les uns des autres, aux endroits où vous voulez un peu d’abri ou cacher une vue.',
  'notes.trees': 'Plantez les arbres au milieu du massif, à 15\' les uns des autres.',
  'notes.mulch': 'Après la plantation, ajoutez 3" de paillis pour tenir les mauvaises herbes à distance.',
  'notes.sign': 'Ajoutez un panneau près de vos plantes pour que les voisins sachent ce qui pousse (et ce qui est une mauvaise herbe).',
  'notes.callout':
    '[Comment sortir des plantes de terre (en anglais) ↗](https://www.youtube.com/watch?v=-5gk2yVAQtM) · [Comment planter un arbre (en anglais) ↗](https://www.youtube.com/watch?v=RypqSrLZVlw) · [Que faire d’un arbre aux racines enroulées dans le pot (en anglais) ↗](https://www.youtube.com/watch?v=-5Wk_6fz4rc)',

  'maintenance.title': 'Entretien',
  'maintenance.firstSeason': 'Première saison',
  'maintenance.waterItem': 'Arrosez abondamment : donnez 1" d’eau par semaine pendant la première saison.',
  'maintenance.weedItem': 'Reconnaître les mauvaises herbes : marquez les mauvaises herbes indésirables avec des bâtons et enlevez-les.',
  'maintenance.secondSeason': 'À partir de la deuxième saison',
  'maintenance.consult.label': 'Conseil d’un professionnel',
  'maintenance.consult.hint': 'Demandez conseil 2 à 3 fois par an à un jardinier ou à l’équipe PiaT',
  'maintenance.expand.label': 'Agrandir l’habitat',
  'maintenance.expand.hint': 'Ajoutez des plantes au besoin et partagez celles en trop avec le quartier',
  'maintenance.arborist.label': 'Arboriste en hiver',
  'maintenance.arborist.hint': 'Engagez un arboriste en hiver pour tailler les arbustes et les arbres avec le quartier',
  'maintenance.cutback.label': 'Rabattre les vivaces',
  'maintenance.cutback.hint': 'Coupez-les à au moins 3" au-dessus du sol, entre le 1er avril et le 1er mai',
  'maintenance.replace.label': 'Remplacements après l’hiver',
  'maintenance.replace.hint': 'Remplacez les plantes qui n’ont pas survécu à l’hiver',
  'maintenance.leafMold.label': 'Terreau de feuilles',
  'maintenance.leafMold.hint': 'À ajouter seulement là où le sol a été retourné ou est à nu',
  'maintenance.spotWeed.label': 'Désherbage ponctuel chaque mois',
  'maintenance.drought.label': 'Arrosage en cas de sécheresse',
  'maintenance.drought.hint': 'Arrosez pendant les longues sécheresses : plus de 2 semaines sans pluie',
  'maintenance.signs.label': 'Panneaux éducatifs',
  'maintenance.signs.hint': 'À placer au milieu de chaque groupe de plantes ou au pied des arbres, avec des informations sur la plante et ses pollinisateurs',
  'maintenance.sustainNote':
    'Consultez l’étape Entretenir pour d’autres conseils d’entretien des plantations, même si elle est écrite pour un parc complet. [Aller à Entretenir →](/steps/sustain/)',

  'ready.title': 'Êtes-vous prêts ?',
  'ready.text': 'Félicitations, vous avez terminé le cahier de plantation ! Cochez chaque étape ci-dessous.',
  'ready.size.label': 'Taille du massif',
  'ready.size.hint': 'Vous savez quelle surface vous allez planter, et si elle est au soleil ou à l’ombre',
  'ready.plantChoice.label': 'Choix des plantes',
  'ready.plantChoice.hint': 'Vous avez utilisé le calculateur de plantes et la liste de plantes',
  'ready.maintenance.label': 'Conseils d’entretien',
  'ready.maintenance.hint': 'Vous avez relu les conseils d’entretien',
} satisfies Translation<typeof en>;
