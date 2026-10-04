// Tagalog — prose of the stand-alone pages (home, steps, lot, my-park, planner, resources).
// Glossary: docs/i18n/glossary.md (tl section)
import type en from '../en/pages.ts';
import type { Translation } from '../../define.ts';

export default {
  'home.eyebrow': 'Isang toolkit para kayo mismo ang gumawa ng parke sa kapitbahayan',
  'home.title': 'Gawing parke ng inyong kapitbahayan ang isang bakanteng lote.',
  'home.lede':
    'Gagabayan kayo at ang inyong mga kapitbahay ng Park in a Truck sa bawat hakbang — paghahanap ng lote, pagbuo ng grupo, pagdidisenyo ng parke, pagtatayo nito, at pagpapanatiling maganda nito. Ginagawa ng site na ito ang Toolkit na isang interactive na workbook na may gabay, at ito na ang naghahanap ng impormasyon para sa inyo.',
  'home.start': 'Magsimula rito →',
  'home.allSteps': 'Tingnan ang anim na hakbang',
  'home.heroAlt':
    'Mga kapitbahay na nagbababa ng gamit mula sa isang pickup truck na may nakasulat na Park in a Truck, may bitbit na upuan, nagtatanim ng puno at naghahardin, at may mga rowhouse sa likod.',
  'home.path': 'Ang inyong landas',
  'home.lotTitle': 'May lote na ba kayong naiisip?',
  'home.lotLede':
    'Mag-type ng address sa Philadelphia. Hahanapin namin ang may-ari, ang laki ng lote, ang zoning at ang hugis ng lote — hindi na ninyo kailangang maghalughog sa atlas.phila.gov.',
  'home.tools': 'Mga kasangkapang gumagawa ng mabigat na trabaho',
  'home.tool.lot': 'Maghanap ng lote',
  'home.tool.lot.text': 'Mapa ng bakanteng lupa malapit sa inyo, kasama ang may-ari, laki at zoning.',
  'home.tool.planner': 'Magplano sa 3D',
  'home.tool.planner.text': 'Ilapat ang mga piraso ng parke ng Park in a Truck sa inyong totoong lote at tingnan ang araw at lilim.',
  'home.tool.build': 'Mga gabay sa paggawa',
  'home.tool.build.text': 'Sunud-sunod na tagubilin para sa mga upuan, mesa, taniman, silungan at iba pa.',
  'home.tool.plants': 'Mga halaman',
  'home.tool.plants.text': 'Mga listahan ng katutubong halaman para sa bawat tema ng parke, para sa araw at lilim.',
  'home.tool.parks': 'Mga parkeng naitayo na',
  'home.tool.parks.text': 'Tingnan kung ano na ang nagawa ng mga kapitbahay sa buong Philadelphia.',
  'home.tool.myPark': 'Aking parke',
  'home.tool.myPark.text': 'Ang inyong mga sagot, naka-save sa browser na ito. Magbahagi ng kopya sa inyong komite.',

  'steps.title': 'Ang mga hakbang',
  'steps.eyebrow': 'Ang proseso ng Park in a Truck',
  'steps.h1': 'Anim na hakbang tungo sa isang parke',
  'steps.lede':
    'Dumaraan sa parehong anim na hakbang ang bawat parke ng Park in a Truck. Sundan ang mga ito nang sunud-sunod — nakasandig ang bawat isa sa nauna. Markahang tapos ang maliliit na hakbang habang tumatagal; naka-save sa browser na ito ang inyong progreso.',

  'lot.title': 'Maghanap ng lote',
  'lot.description': 'Alamin ang may-ari, laki, zoning at kung bakante ang anumang lote sa Philadelphia, at tingnan ang bakanteng lupa sa mapa.',
  'lot.eyebrow': 'Hakbang 1 · Kumuha ng lote',
  'lot.h1': 'Maghanap ng lote',
  'lot.lede':
    'Mag-type ng address, o tingnan ang mapa ng bakanteng lupa. Sinusuri ng site ang parehong mga rekord ng Lungsod na ipinapakita ng atlas.phila.gov — may-ari, laki ng lote, zoning, kung bakante — at sinasabi kung aling laki ng Park in a Truck ang babagay.',
  'lot.lookupH2': 'Maghanap ng address',
  'lot.mapH2': 'Bakanteng lupa malapit sa inyo',
  'lot.mapText':
    'Mga loteng nakalista sa Lungsod bilang bakanteng lupa, may kulay ayon sa may-ari. I-click ang isa para makita ang may-ari at laki nito, saka i-save ito bilang lote ng inyong parke o idagdag sa inyong listahan. Lakarin din ang block — may mga loteng wala sa listahan ng Lungsod, at may ilan dito na ginagamit na.',
  'lot.compareH2': 'Paghambingin ang mga posibleng lote',
  'lot.nextH2': 'Mga susunod na hakbang',
  'lot.next.owner.title': 'Sino ang may-ari ng loteng iyon?',
  'lot.next.owner.text': 'Pampubliko o pribadong may-ari — ang mga paraan para makuha ang karapatang magtayo ng parke.',
  'lot.next.organize.title': 'Mag-organisa',
  'lot.next.organize.text': 'Mga organisasyon ng komunidad, paaralan, hardin at iba pang yaman malapit sa inyong lote.',
  'lot.next.assess.title': 'Magsuri',
  'lot.next.assess.text': 'Sinukat na mga gilid, base map na mapi-print, mga puno at mga katabing gusali.',
  'lot.next.planner.title': 'Magplano sa 3D',
  'lot.next.planner.text': 'Ilapat ang mga piraso ng parke sa inyong lote at tingnan ang araw at lilim.',

  'myPark.title': 'Aking parke',
  'myPark.eyebrow': 'Naka-save sa browser na ito',
  'myPark.lede':
    'Lahat ng sinasagutan ninyo sa site na ito ay naka-save dito, sa device na ito lamang — walang account, walang ipinapadala kahit saan. Para makatrabaho ang inyong komite, mag-save ng file ng proyekto at ipadala ito sa kanila; mabubuksan nila ito rito sa sarili nilang device.',
  'myPark.storageWarning':
    'Hindi pinapayagan ng browser na ito na mag-save ng kahit ano ang site (private window o naka-block ang data ng site). Mag-save ng file ng proyekto bago umalis, o mawawala ang inyong mga sagot.',
  'myPark.thisProject': 'Ang proyektong ito',
  'myPark.nameLabel': 'Pangalan',
  'myPark.saveFile': '⬇ I-save ang file ng proyekto',
  'myPark.openFile': '⬆ Magbukas ng file ng proyekto',
  'myPark.printEverything': '🖨 I-print lahat',
  'myPark.allProjects': 'Lahat ng proyekto',
  'myPark.newProjectPlaceholder': 'Pangalan ng bagong proyekto',
  'myPark.newProject': '+ Bagong proyekto',
  'myPark.progress': 'Progreso',
  'myPark.yourLot': 'Ang inyong lote',
  'myPark.noLotYet': 'Wala pang napiling lote. Maghanap sa <a href="{href}">Hakbang 1: Kumuha ng lote</a>.',
  'myPark.yourAnswers': 'Ang inyong mga sagot',
  'myPark.nothingFilledIn': 'Wala pang nasasagutan.',

  'planner.title': 'Magplano sa 3D',
  'planner.description':
    'Ilapat ang mga piraso ng parke ng Park in a Truck sa inyong totoong lote sa Philadelphia, tingnan ang araw at lilim nito, at bilangin ang lahat para sa tantiya ng gastos at sa mga listahan ng halaman.',
  'planner.h1': 'Planuhin ang inyong parke sa 3D',
  'planner.loading': 'Binubuksan ang planner…',
  'planner.noscript': 'Kailangang naka-on ang JavaScript para sa 3D planner.',

  'resources.title': 'Mga mapagkukunan, katuwang at balita',
  'resources.description':
    'Mga katuwang ng Park in a Truck, mga balita tungkol dito, mga supplier, ang buong Toolkit Library, paraan ng pakikipag-ugnayan at paunawang legal.',
  'resources.eyebrow': 'Lampas sa mga workbook',
  'resources.lede':
    'Sino ang tumutulong magtayo ng mga parkeng ito, sino ang sumulat tungkol sa kanila, saan kukuha ng materyales at halaman, at paano makipag-ugnayan sa grupo ng Park in a Truck.',
  'resources.sectionsNav': 'Mga seksiyon sa pahinang ito',
  'resources.sections.partners': 'Mga katuwang',
  'resources.sections.press': 'Mga balita at video',
  'resources.sections.suppliers': 'Mga supplier at kapaki-pakinabang na link',
  'resources.sections.toolkitLibrary': 'Toolkit library',
  'resources.sections.contact': 'Makipag-ugnayan',
  'resources.sections.acknowledgments': 'Pasasalamat',
  'resources.sections.legal': 'Paunawang legal',
  'resources.deadHeadsUp': 'Mag-ingat',
  'resources.deadLinks': {
    other:
      'Hindi gumagana ngayon ang {count} link sa pahinang ito (sinuri noong {date}) — iniwan namin dito sa halip na tahimik na alisin, at may marka sa ibaba.',
  },
  'resources.status.dead': 'hindi gumagana ang link ngayon',
  'resources.status.unverified': 'hindi ma-verify nang awtomatiko',
  'resources.status.unconfirmed': 'hindi pa kumpirmado',
  'resources.partnersIntro': 'Mga organisasyong tumutulong para maging posible ang mga parke ng Park in a Truck.',
  'resources.videoAlt': 'Video: {title}',
  'resources.suppliersIntro': 'Kinuha mula sa mga link sa loob mismo ng mga workbook, pinagsama-sama ayon sa gamit nila.',
  'resources.contact.email': 'Email:',
  'resources.contact.founder': 'Tagapagtatag:',
  'resources.contact.phone': 'Telepono:',
  'resources.contact.instagram': 'Instagram:',
  'resources.contact.facebook': 'Facebook:',
} satisfies Translation<typeof en>;
