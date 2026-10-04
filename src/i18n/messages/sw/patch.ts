// Kiswahili. Msomaji ni "wewe". Glossary: docs/i18n/glossary.md (### sw). "Park Patch" is a program name and stays.
import type en from '../en/patch.ts';
import type { Translation } from '../../define.ts';

export default {
  'title': 'Park Patch',
  'description':
    'Ukubwa si muhimu — geuza kipande cha 4x4, uwanja wa mbele ya nyumba au sanduku la maua dirishani kuwa upandaji wa maua kwa ajili ya wachavushaji, ukitumia kitabu cha kazi cha Park Patch.',
  'lede':
    'Huna kiwanja kitupu? Ukubwa si muhimu. Kitabu cha kazi cha Pollinator Planting Patch (kipande cha kupanda kwa ajili ya wachavushaji) kinageuza nafasi yoyote — kipande cha 4×4, uwanja wa mbele ya nyumba, hata sanduku la maua dirishani — kuwa upandaji wa mimea asilia kwa ajili ya wachavushaji, kwa mwongozo uleule wa hatua kwa hatua kama wa bustani kamili.',
  'originalPdf': '📄 Kitabu cha kazi halisi (PDF)',
  'printAnswers': '🖨 Chapisha majibu yangu',
  'intro':
    'Kupanda mimea asilia kwa ajili ya wachavushaji kunaleta faida nyingi: kunaboresha afya ya udongo na kuzuia mmomonyoko, kunawasaidia wanyamapori wa eneo kwa chakula na makazi, kunaleta uzuri wa kipekee, kunatumia mimea inayostawi katika hali ya hewa ya eneo lako kwa maji kidogo na kemikali chache, na kunasaidia mazingira ya mtaa wako kubaki imara mbele ya mabadiliko ya tabianchi — na yote haya kwa utunzaji mdogo kuliko kitalu cha kawaida.',

  'yourArea.title': 'Eneo lako la kupanda',
  'yourArea.text':
    'Tathmini eneo unalotaka kupanda kwa kutumia Ramani yako ya msingi kutoka hatua ya Kagua, au — kama huna — kadiria eneo kwa futi za mraba unalotaka kutenga kwa ajili ya kupanda.',
  'yourArea.lengthLabel': 'Kipande chako kina urefu gani?',
  'yourArea.widthLabel': 'Kipande chako kina upana gani?',
  'yourArea.sunLabel': 'Sehemu yako yenye jua ina urefu na upana gani?',
  'yourArea.shadeLabel': 'Sehemu yako yenye kivuli ina urefu na upana gani?',
  'yourArea.alt':
    'Mchoro wa miraba wa kipande cha kupanda chenye alama za hali zilizopo — nyumba ya jirani na bomba lake la maji ya paa, mti wa maple, eneo linalotuama maji mara kwa mara, mti wa dogwood na wa crabapple, nyaya za juu za umeme na bomba la maji la zimamoto — pamoja na maeneo ya kupanda kwa ajili ya wachavushaji yaliyowekwa alama kwenye jua na kwenye kivuli',

  'palette.title': 'Chagua mchanganyiko wa mimea',
  'palette.text':
    'Iwe unaota kona tulivu ya nyasi na maua ya porini, au nafasi yenye kijani tele ya vichaka na miti, chagua mchanganyiko unaokufaa wewe na eneo lako. (Mstari wa nukta katika kila mfano unaonyesha futi 6, au usawa wa macho — inasaidia kama unataka kuzuia mandhari fulani isionekane au kuiacha wazi.)',
  'palette.chooseLabel': 'Mchanganyiko upi unafaa nafasi yako?',
  'palette.alt': 'Mfano wa mpango wa kupanda kwa mchanganyiko wa {name}, ukionyesha nafasi kati ya mimea na jinsi inavyopangwa kwa makundi',
  'palette.plantListLabel': 'Orodha ya mimea ya kipande cha wachavushaji',
  'palette.plantListNote': 'Jedwali moja, lenye kichupo kwa kila mchanganyiko — tengeneza nakala yako ili uweze kulihariri',

  'palette.grasses-wildflowers.name': 'Nyasi na maua ya porini',
  'palette.grasses-wildflowers.good': 'Nafasi ndogo, kukuza bioanuwai na kuwasaidia wachavushaji',
  'palette.grasses-wildflowers.why.sightlines': 'Mandhari isiyozuiliwa — kwa kawaida ni chini ya futi 3 kwa urefu, kwa hiyo mtu anaweza kuona mbali.',
  'palette.grasses-wildflowers.why.waterWise': 'Mbadala wa nyasi za kawaida unaotumia maji kidogo: maji kidogo, mbolea kidogo na kukata nyasi mara chache.',
  'palette.grasses-wildflowers.why.buffet': 'Karamu ya wachavushaji ya chavua, mbochi (nectar) na mbegu.',
  'palette.grasses-wildflowers.why.fullSun': 'Hustawi kwenye jua kamili.',
  'palette.grasses-wildflowers.why.color': 'Rangi msimu mzima.',

  'palette.grasses-shrubs.name': 'Nyasi, maua ya porini + vichaka',
  'palette.grasses-shrubs.good': 'Kuficha kitu kisichopendeza na kuongeza umbo, kwa utunzaji mdogo kuliko nyasi na maua ya porini peke yake',
  'palette.grasses-shrubs.why.screens': 'Huficha mandhari isiyopendeza.',
  'palette.grasses-shrubs.why.shelter': 'Makazi zaidi na mlo wa hadhi ya juu kwa wachavushaji.',
  'palette.grasses-shrubs.why.structure': 'Huongeza umbo na kimo kidogo zaidi — vichaka vingi hubaki chini ya futi 4.',
  'palette.grasses-shrubs.why.lowMaintenance':
    'Utunzaji mdogo kuliko nyasi na maua ya porini peke yake; kupogoa kidogo mwaka wa 3–4 kunaweka mambo nadhifu.',

  'palette.grasses-shrubs-trees.name': 'Nyasi, maua ya porini, vichaka + miti',
  'palette.grasses-shrubs-trees.good': 'Makazi kamili ya viumbe yenye uimara zaidi mwaka mzima',
  'palette.grasses-shrubs-trees.why.habitat': 'Huunda makazi kamili na nyumba ya starehe kwa wanyamapori.',
  'palette.grasses-shrubs-trees.why.resilience': 'Huongeza sana uimara wa upandaji wote.',
  'palette.grasses-shrubs-trees.why.sanctuary': 'Mahali pa faragha penye uhai mwaka mzima.',

  'palette.grasses-trees.name': 'Nyasi, maua ya porini + miti',
  'palette.grasses-trees.good': 'Kivuli kidogo, huku chini yake kukiwa wazi kuonekana',
  'palette.grasses-trees.why.elegance': 'Miti asilia huleta urembo wa eneo unaofaa eneo lako.',
  'palette.grasses-trees.why.airQuality': 'Hewa bora zaidi — miti hunyonya uchafuzi na kutoa oksijeni.',
  'palette.grasses-trees.why.habitat': 'Makazi na chakula kwa wanyamapori wa eneo.',
  'palette.grasses-trees.why.carbon': 'Kuhifadhi kaboni ardhini na mitini.',
  'palette.grasses-trees.why.shade':
    'Kivuli kidogo chenye zulia la mimea chini yake, huku eneo lote likibaki wazi kuonekana.',

  'notes.title': 'Maelezo ya jumla ya kupanda',
  'notes.groups': 'Panda nyasi na maua ya porini kwa makundi, angalau mimea 4–5 katika kundi moja, kwa mpangilio wa pembetatu wenye nafasi ya 24" kati ya mmea mmoja na mwingine.',
  'notes.shrubs': 'Panda vichaka kwa mpangilio wa pembetatu wenye nafasi ya 48" kati yake, mahali ambapo ungependa kivuli au kuficha mandhari fulani.',
  'notes.trees': "Panda miti katikati ya kitalu, kwa nafasi ya 15' kati ya mti mmoja na mwingine.",
  'notes.mulch': 'Baada ya kupanda, weka matandazo (mulch) ya 3" ili kuzuia magugu.',
  'notes.sign': 'Weka kibao kwenye mimea yako ili majirani wajue kinachoota (na nini ni gugu).',
  'notes.callout':
    '[Jinsi ya kung\'oa mimea ↗](https://www.youtube.com/watch?v=-5gk2yVAQtM) · [Jinsi ya kupanda mti ↗](https://www.youtube.com/watch?v=RypqSrLZVlw) · [Jinsi ya kushughulikia mti ambao mizizi yake imejikunja ndani ya chombo ↗](https://www.youtube.com/watch?v=-5Wk_6fz4rc) (kwa Kiingereza)',

  'maintenance.title': 'Utunzaji',
  'maintenance.firstSeason': 'Msimu wa kwanza',
  'maintenance.waterItem': 'Mwagilia vizuri: toa maji ya inchi 1 kila wiki wakati wa msimu wa kwanza.',
  'maintenance.weedItem': 'Kutambua magugu: weka alama kwenye magugu yasiyotakiwa kwa vijiti na uyaondoe.',
  'maintenance.secondSeason': 'Msimu wa pili na kuendelea',
  'maintenance.consult.label': 'Ushauri wa kitaalamu',
  'maintenance.consult.hint': 'Omba ushauri mara 2–3 kwa mwaka kutoka kwa mkulima wa bustani au timu ya PiaT',
  'maintenance.expand.label': 'Kupanua makazi ya viumbe',
  'maintenance.expand.hint': 'Ongeza mimea inapohitajika na ugawe ya ziada kwa jamii',
  'maintenance.arborist.label': 'Mtaalamu wa miti wakati wa baridi',
  'maintenance.arborist.hint': 'Mlipe mtaalamu wa miti (arborist) wakati wa majira ya baridi ili apogoe vichaka na miti pamoja na jamii',
  'maintenance.cutback.label': 'Kukata mimea ya kudumu',
  'maintenance.cutback.hint': 'Kata hadi angalau inchi 3 juu ya udongo kati ya tarehe 1 Aprili na 1 Mei',
  'maintenance.replace.label': 'Kubadilisha mimea baada ya baridi',
  'maintenance.replace.hint': 'Badilisha mimea ambayo haikustahimili majira ya baridi',
  'maintenance.leafMold.label': 'Majani yaliyooza (leaf mold)',
  'maintenance.leafMold.hint': 'Weka tu kwenye maeneo ya udongo uliochimbuliwa au ulio wazi',
  'maintenance.spotWeed.label': "Kung'oa magugu hapa na pale kila mwezi",
  'maintenance.drought.label': 'Kumwagilia wakati wa ukame',
  'maintenance.drought.hint': 'Mwagilia wakati wa ukame wa muda mrefu — hakuna mvua kwa zaidi ya wiki 2',
  'maintenance.signs.label': 'Vibao vya elimu',
  'maintenance.signs.hint': 'Viweke katikati ya kila kundi la mimea au chini ya miti, vikiwa na taarifa kuhusu mmea/mchavushaji',
  'maintenance.sustainNote':
    'Angalia hatua ya Tunza kwa vidokezo zaidi vya kutunza mimea, ingawa imeandikwa kwa ajili ya bustani kamili. [Nenda kwenye Tunza →](/steps/sustain/)',

  'ready.title': 'Uko tayari?',
  'ready.text': 'Hongera kwa kumaliza kitabu cha kazi cha Kupanda! Weka alama kwenye kila hatua iliyo hapa chini.',
  'ready.size.label': 'Ukubwa wa kitalu',
  'ready.size.hint': 'Unajua ukubwa wa eneo utakalopanda, na kama lina jua au kivuli',
  'ready.plantChoice.label': 'Uchaguzi wa mimea',
  'ready.plantChoice.hint': 'Umetumia kikokotoo cha mimea na orodha ya mimea',
  'ready.maintenance.label': 'Maelezo ya utunzaji',
  'ready.maintenance.hint': 'Umepitia maelezo ya utunzaji',
} satisfies Translation<typeof en>;
