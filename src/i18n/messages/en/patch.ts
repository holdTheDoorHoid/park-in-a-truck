// Area "patch": Park Patch (src/pages/park-patch/index.astro) — the Pollinator Planting Patch
// workbook for small spaces. PiaT's own words; keep paragraphs whole. Rendered at build time
// only (client: false). Field ids/values (patch.*) and part/plant data stay English — not here.
import { defineMessages } from '../../define.ts';

export default defineMessages(
  'patch',
  {
    'title': 'Park Patch',
    'description':
      "Size doesn't matter — turn a 4x4 plot, a front yard or a window box into a pollinator planting with the Park Patch workbook.",
    'lede':
      "Don't have a vacant lot? Size doesn't matter. The Pollinator Planting Patch workbook turns any space — a 4×4 plot, a front yard, even a window box — into a native pollinator planting, using the same kind of step-by-step guide as the full park.",
    'originalPdf': '📄 Original workbook (PDF)',
    'printAnswers': '🖨 Print my answers',
    'intro':
      "Planting native plants for pollinators brings a host of benefits: it improves soil health and prevents erosion, supports local wildlife with food and shelter, offers unique beauty, thrives in your local climate with less water and fewer chemicals, and helps your neighborhood's ecology stay resilient to a changing climate — all while needing less maintenance than a typical bed.",

    'yourArea.title': 'Your planting area',
    'yourArea.text':
      "Assess the area you want to plant using your Base Plan from Assess, or — if you don't have one — estimate the square footage you want to dedicate to planting.",
    'yourArea.lengthLabel': 'How long is your patch?',
    'yourArea.widthLabel': 'How wide is your patch?',
    'yourArea.sunLabel': 'How long and wide is your area in sun?',
    'yourArea.shadeLabel': 'How long and wide is your area in shade?',
    'yourArea.alt':
      "Grid diagram of a patch marked with existing conditions — a neighbor's house and downspout, a maple tree, a periodically wet area, a dogwood and crabapple tree, overhead utility lines and a fire hydrant — with pollinator planting areas marked in sun and in shade",

    'palette.title': 'Choose a planting palette',
    'palette.text':
      "Whether you're dreaming of a cozy corner of grasses and wildflowers, or a lush space with shrubs and trees, pick the palette that best suits you and your site. (The dotted line in each example shows 6 feet, or eye level — useful if you want to block a view or keep it open.)",
    'palette.chooseLabel': 'Which palette fits your space?',
    'palette.alt': 'Example planting plan for the {name} palette, with planting spacing and grouping called out',
    'palette.plantListLabel': 'Pollinator patch plant list',
    'palette.plantListNote': 'One spreadsheet, a tab per palette — make your own copy to edit it',

    'palette.grasses-wildflowers.name': 'Grasses & wildflowers',
    'palette.grasses-wildflowers.good': 'Smaller spaces, promoting biodiversity and supporting pollinators',
    'palette.grasses-wildflowers.why.sightlines': 'Unobstructed views — generally under 3 feet tall, so sightlines stay open.',
    'palette.grasses-wildflowers.why.waterWise': 'A water-wise alternative to lawn: less water, fertilizer and mowing.',
    'palette.grasses-wildflowers.why.buffet': 'A pollinator buffet of pollen, nectar and seeds.',
    'palette.grasses-wildflowers.why.fullSun': 'Thrives in full sun.',
    'palette.grasses-wildflowers.why.color': 'Season-long color.',

    'palette.grasses-shrubs.name': 'Grasses, wildflowers + shrubs',
    'palette.grasses-shrubs.good': 'Screening an eyesore and adding structure, with less upkeep than grasses and wildflowers alone',
    'palette.grasses-shrubs.why.screens': 'Screens unsightly views.',
    'palette.grasses-shrubs.why.shelter': 'More shelter and five-star dining for pollinators.',
    'palette.grasses-shrubs.why.structure': 'Adds structure and a bit more height — most shrubs stay under 4 feet.',
    'palette.grasses-shrubs.why.lowMaintenance':
      'Lower-maintenance than grasses and wildflowers alone; a light pruning in year 3–4 keeps things tidy.',

    'palette.grasses-shrubs-trees.name': 'Grasses, wildflowers, shrubs + trees',
    'palette.grasses-shrubs-trees.good': 'A full habitat with the most year-round resilience',
    'palette.grasses-shrubs-trees.why.habitat': 'Creates a full-on habitat and a cozy home for wildlife.',
    'palette.grasses-shrubs-trees.why.resilience': "Amps up the planting's overall resilience.",
    'palette.grasses-shrubs-trees.why.sanctuary': 'A lively, year-round private sanctuary.',

    'palette.grasses-trees.name': 'Grasses, wildflowers + trees',
    'palette.grasses-trees.good': 'A little shade with open sightlines underneath',
    'palette.grasses-trees.why.elegance': 'Native trees bring local elegance suited to your region.',
    'palette.grasses-trees.why.airQuality': 'Better air quality — trees absorb pollutants and release oxygen.',
    'palette.grasses-trees.why.habitat': 'Habitat and food for local wildlife.',
    'palette.grasses-trees.why.carbon': 'Carbon sequestration.',
    'palette.grasses-trees.why.shade':
      'A little shade with a planted carpet underneath, while keeping visibility across the whole site open.',

    'notes.title': 'General planting notes',
    'notes.groups': 'Plant your grasses and wildflowers in groups, at a minimum of 4–5 in a group, in a triangle formation 24" apart.',
    'notes.shrubs': 'Plant shrubs in a triangle formation 48" apart, in areas where you might want some shelter or to shield a view.',
    'notes.trees': "Plant trees in the middle of the bed, 15' apart.",
    'notes.mulch': 'After planting, add 3" of mulch to keep weeds at bay.',
    'notes.sign': "Add a sign to your plants so neighbors know what's growing (and what's a weed).",
    'notes.callout':
      '[How to unearth plants ↗](https://www.youtube.com/watch?v=-5gk2yVAQtM) · [How to plant a tree ↗](https://www.youtube.com/watch?v=RypqSrLZVlw) · [How to deal with a root-bound tree ↗](https://www.youtube.com/watch?v=-5Wk_6fz4rc)',

    'maintenance.title': 'Maintenance',
    'maintenance.firstSeason': 'First season',
    'maintenance.waterItem': 'Water thoroughly: provide 1" of water weekly during the first season.',
    'maintenance.weedItem': 'Weed identification: mark undesirable weeds with sticks and remove them.',
    'maintenance.secondSeason': 'Second season and on',
    'maintenance.consult.label': 'Professional consultation',
    'maintenance.consult.hint': 'Seek advice 2–3 times a year from a gardener or the PiaT team',
    'maintenance.expand.label': 'Habitat expansion',
    'maintenance.expand.hint': 'Add plants as needed and share extras with the community',
    'maintenance.arborist.label': 'Winter arborist',
    'maintenance.arborist.hint': 'Hire an arborist in winter to prune shrubs and trees with the community',
    'maintenance.cutback.label': 'Perennial cutback',
    'maintenance.cutback.hint': 'Trim to a minimum of 3" above soil between April 1 and May 1',
    'maintenance.replace.label': 'Winter replacements',
    'maintenance.replace.hint': "Replace plants that didn't survive the winter",
    'maintenance.leafMold.label': 'Leaf mold',
    'maintenance.leafMold.hint': 'Add only in disturbed or bare soil areas',
    'maintenance.spotWeed.label': 'Monthly spot weeding',
    'maintenance.drought.label': 'Drought watering',
    'maintenance.drought.hint': 'Water during prolonged droughts — no rain for more than 2 weeks',
    'maintenance.signs.label': 'Educational signs',
    'maintenance.signs.hint': 'Place at the middle of each plant group or the base of trees, with plant/pollinator info',
    'maintenance.sustainNote':
      "Check the Sustain step for more planting maintenance tips, even though it's written for a full park. [Go to Sustain →](/steps/sustain/)",

    'ready.title': 'Are you ready?',
    'ready.text': 'Congratulations for completing the Planting workbook! Check off each step below.',
    'ready.size.label': 'Size of bed',
    'ready.size.hint': "You know how big an area you'll plant, and whether it's sun or shade",
    'ready.plantChoice.label': 'Plant choice',
    'ready.plantChoice.hint': 'You used the plant calculator and plant list',
    'ready.maintenance.label': 'Maintenance notes',
    'ready.maintenance.hint': "You've reviewed the maintenance notes",
  },
  { client: false },
);
