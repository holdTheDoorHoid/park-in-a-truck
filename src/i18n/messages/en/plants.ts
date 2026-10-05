// Area "plants": the plant picker (src/components/plants/) and the /plants/ page
// (src/pages/plants/). Plant names and notes come from the plants data overlay
// (src/i18n/data/<code>/plants.json); scientific names never change.
import { defineMessages } from '../../define.ts';

export default defineMessages('plants', {
  // ---- The /plants/ page ----
  /** Browser tab title and page heading */
  'page.title': 'Plants',
  'page.description': "Every plant from the Dream workbook's four theme plant lists, with photos, sizes and costs — plus a picker sized to your own design.",
  'page.eyebrow': 'Dream workbook · plant lists',
  'page.lede':
    "The Dream workbook's four theme plant lists (Edible, Sanctuary, Nature, Event), all in one place — browse what's in each, then use the picker to choose species and quantities sized to your own design.",
  'page.search': 'Search',
  'page.searchPlaceholder': 'Common or botanical name…',
  /** Filter names; each is followed by buttons */
  'page.theme': 'Theme',
  'page.type': 'Type',
  'page.light': 'Light',
  /** The filter button that shows everything */
  'page.all': 'All',
  'page.sun': 'Sun',
  'page.shade': 'Shade',
  /** Under the filters: "12 of 160 plants" */
  'page.count': { one: '{shown} of {count} plant', other: '{shown} of {count} plants' },
  /** One plant's line: "Small trees · sun or shade" */
  'tile.meta': '{type} · {light}',
  /** The same with the size when grown: "Small trees · sun or shade · mature 20-30'" */
  'tile.metaMature': '{type} · {light} · mature {size}',
  'tile.light.sun': 'sun',
  'tile.light.shade': 'shade',
  'tile.light.both': 'sun or shade',
  'page.pick': 'Pick your plants',
  'page.pickLede':
    'Choose one theme, or mix two (the workbook allows it) — then set your counts (or pull them straight from your 3D design) and choose exactly which plants and how many.',

  /** Kinds of plant (filters, picker headings) */
  'type.largeTree': 'Large trees',
  'type.smallTree': 'Small trees',
  'type.shrub': 'Shrubs',
  'type.perennial': 'Perennials',

  /** Description of a plant photo: "Serviceberry (Amelanchier laevis)" */
  'photo.alt': '{common} ({botanical})',

  // ---- The picker (src/components/plants/PlantPickerIsland.tsx) ----
  /** The Dream workbook's "Count your plants" boxes */
  'count.squareSun': 'Green squares — sun',
  'count.squareShade': 'Green squares — shade',
  'count.shrubSun': 'Shrubs — sun',
  'count.shrubShade': 'Shrubs — shade',
  /** Groups of the picker */
  'bucket.perennialSun': 'Perennials — sun',
  'bucket.perennialShade': 'Perennials — shade',
  'bucket.shrubSun': 'Shrubs — sun',
  'bucket.shrubShade': 'Shrubs — shade',
  /** Label over the theme buttons: one theme chosen, or several */
  'picker.themes': { one: 'Theme', other: 'Themes' },
  'picker.mixHint': "Mixing two themes? The Dream workbook says that's fine — pick plants from both lists.",
  'picker.useDesign': 'Use the counts from your design',
  /** {summary} is picker.summary */
  'picker.fromDesign': '✓ Filled in from your design — {summary}',
  'picker.fromDesignTyped': '✓ From your design and the numbers you typed — {summary}',
  'picker.summary': '{perennials} perennials ({per} per green square, as in Park in a Truck’s plant lists), {shrubs} shrubs, {small} small trees, {large} large trees',
  'picker.chooseTheme': 'Choose a theme above to see its plant list.',
  /** "12 of 35 planned" */
  'picker.planned': '{chosen} of {count} planned',
  'picker.fillEvenly': 'Fill evenly',
  'picker.clear': 'Clear',
  'picker.mature': 'Mature: {size}',
  /** The plant's pot size when you buy it ("#2") */
  'picker.atPurchase': 'At purchase: {size}',
  /** Pot sizes from PiaT's plant lists (the others are nursery numbers like "#2", the same everywhere) */
  'pot.quart': 'Quart',
  'pot.oneQuart': '1 quart',
  'picker.each': '{price} each',
  /** Read by screen readers on each quantity box */
  'picker.howMany': 'How many {name}?',
  'picker.picked': '<strong>{chosen}</strong> of <strong>{count}</strong> plants picked',
  'picker.cost': 'Estimated cost: <strong>{cost}</strong>',
  'picker.print': 'Print shopping list',
  'picker.csv': 'Download CSV',
  /** File name of the download; no spaces */
  'picker.csvFile': 'park-in-a-truck-plant-list.csv',
  'csv.common': 'Common name',
  'csv.botanical': 'Botanical name',
  'csv.type': 'Type',
  'csv.light': 'Light',
  'csv.quantity': 'Quantity',
  'csv.unitCost': 'Unit cost',
  'csv.lineCost': 'Line cost',
  'csv.total': 'TOTAL',
  /** Values in the CSV file's Type and Light columns (English uses the list's own short words) */
  'csv.type.largeTree': 'large-tree',
  'csv.type.smallTree': 'small-tree',
  'csv.type.shrub': 'shrub',
  'csv.type.perennial': 'perennial',
  'csv.light.sun': 'sun',
  'csv.light.shade': 'shade',
  'csv.light.both': 'both',
});
