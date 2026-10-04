// Area "pages": the prose of the stand-alone pages in src/pages/ (home, the steps
// index, and — in the extraction round — lot, my-park, planner, parks, resources…).
// Prefix keys with the page: "home.", "steps.", "lot.", "myPark.", … Rendered at
// build time only, so it is not shipped to the browser.
import { defineMessages } from '../../define.ts';

export default defineMessages(
  'pages',
  {
    'home.eyebrow': 'A do-it-yourself toolkit for neighborhood parks',
    'home.title': "Turn a vacant lot into your neighborhood's park.",
    'home.lede':
      'Park in a Truck walks you and your neighbors through every step — finding a lot, organizing a team, designing the park, building it, and keeping it beautiful. This site turns the toolkit into a guided, interactive workbook that does the lookups for you.',
    'home.start': 'Start here →',
    'home.allSteps': 'See all six steps',
    'home.heroAlt':
      'Neighbors unloading a pickup truck labelled Park in a Truck, carrying a bench, planting trees and gardening, with rowhouses behind.',
    'home.path': 'Your path',
    'home.lotTitle': 'Have a lot in mind?',
    'home.lotLede':
      "Type a Philadelphia address. We'll find the owner, the lot size, zoning and the lot's outline — no need to dig through atlas.phila.gov.",
    'home.tools': 'Tools that do the legwork',
    'home.tool.lot': 'Find a lot',
    'home.tool.lot.text': 'Map of vacant land near you with owner, size and zoning.',
    'home.tool.planner': 'Plan in 3D',
    'home.tool.planner.text': 'Fit the Park in a Truck park pieces to your real lot and see sun and shade.',
    'home.tool.build': 'Build guides',
    'home.tool.build.text': 'Step-by-step instructions for benches, tables, planters, shade and more.',
    'home.tool.plants': 'Plants',
    'home.tool.plants.text': 'Native plant lists for each park theme, for sun and shade.',
    'home.tool.parks': 'Parks built so far',
    'home.tool.parks.text': 'See what neighbors across Philadelphia have already created.',
    'home.tool.myPark': 'My park',
    'home.tool.myPark.text': 'Your answers, saved in this browser. Share a copy with your committee.',

    'steps.title': 'The steps',
    'steps.eyebrow': 'The Park in a Truck process',
    'steps.h1': 'Six steps to a park',
    'steps.lede':
      'Every Park in a Truck park goes through the same six steps. Work through them in order — each one builds on the last. Mark sub-steps done as you go; your progress is saved in this browser.',
  },
  { client: false },
);
