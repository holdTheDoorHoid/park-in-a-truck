// Area "pages": the prose of the stand-alone pages in src/pages/ — home, steps index,
// lot, my-park (chrome only; its script is the "mypark" area), planner (chrome only;
// the planner app itself is the "planner" area), resources (chrome only; resource text
// is the `resources` dataset overlay). /parks/ and /plants/ chrome belongs to the cost
// workstream. Park Patch and Playful Learning are their own areas: `patch`, `playful`.
// Prefix keys with the page: "home.", "steps.", "lot.", "myPark.", "planner.",
// "resources.". Rendered at build time only, so it is not shipped to the browser.
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

    'lot.title': 'Find a lot',
    'lot.description': "Look up any Philadelphia lot's owner, size, zoning and vacancy, and browse vacant land on a map.",
    'lot.eyebrow': 'Step 1 · Acquire',
    'lot.h1': 'Find a lot',
    'lot.lede':
      "Type an address, or browse the map of vacant land. The site checks the same City records atlas.phila.gov shows — owner, lot size, zoning, vacancy — and tells you which Park in a Truck size fits.",
    'lot.lookupH2': 'Look up an address',
    'lot.mapH2': 'Vacant land near you',
    'lot.mapText':
      "Lots the City lists as vacant land, coloured by who owns them. Click one to see its owner and size, then save it as your park lot or add it to your list. Walk the block too — the City's list misses some lots and includes some that are already in use.",
    'lot.compareH2': 'Compare your possible lots',
    'lot.nextH2': 'Next steps',
    'lot.next.owner.title': 'Who owns that lot?',
    'lot.next.owner.text': 'Public or private owner — the ways to get the right to build a park.',
    'lot.next.organize.title': 'Organize',
    'lot.next.organize.text': 'Community organizations, schools, gardens and other assets near your lot.',
    'lot.next.assess.title': 'Assess',
    'lot.next.assess.text': 'Measured edges, a printable base map, trees and neighboring buildings.',
    'lot.next.planner.title': 'Plan in 3D',
    'lot.next.planner.text': 'Fit the park pieces to your lot and see sun and shade.',

    // myPark.*: chrome only — the My park page's script (owner names, answers summary) is
    // the "mypark" area's job, not this one. The project's own name defaults through the
    // "workbook" catalog's project.default key, same as the header button.
    'myPark.title': 'My park',
    'myPark.eyebrow': 'Saved in this browser',
    'myPark.lede':
      'Everything you fill in on this site is saved here, on this device only — no account, nothing sent anywhere. To work with your committee, save a project file and send it to them; they can open it here on their own device.',
    'myPark.storageWarning':
      'This browser is not letting the site save anything (private window or blocked site data). Save a project file before you leave, or your answers will be lost.',
    'myPark.thisProject': 'This project',
    'myPark.nameLabel': 'Name',
    'myPark.saveFile': '⬇ Save project file',
    'myPark.openFile': '⬆ Open a project file',
    'myPark.printEverything': '🖨 Print everything',
    'myPark.allProjects': 'All projects',
    'myPark.newProjectPlaceholder': 'New project name',
    'myPark.newProject': '+ New project',
    'myPark.progress': 'Progress',
    'myPark.yourLot': 'Your lot',
    'myPark.noLotYet': 'No lot chosen yet. Look one up in <a href="{href}">Step 1: Acquire</a>.',
    'myPark.yourAnswers': 'Your answers',
    'myPark.nothingFilledIn': 'Nothing filled in yet.',

    'planner.title': 'Plan in 3D',
    'planner.description':
      "Fit Park in a Truck's park pieces to your real Philadelphia lot, see its sun and shade, and count everything for the cost estimate and plant lists.",
    'planner.h1': 'Plan your park in 3D',
    'planner.loading': 'Loading the planner…',
    'planner.noscript': 'The 3D planner needs JavaScript turned on.',

    'resources.title': 'Resources, partners & press',
    'resources.description':
      "Park in a Truck's partners, press coverage, suppliers, the full Toolkit Library, contact info and legal notice.",
    'resources.eyebrow': 'Beyond the workbooks',
    'resources.lede':
      "Who helps build these parks, who's written about them, where to get materials and plants, and how to reach the Park in a Truck team.",
    'resources.sectionsNav': 'Sections on this page',
    'resources.sections.partners': 'Partners',
    'resources.sections.press': 'Featured press & video',
    'resources.sections.suppliers': 'Suppliers & useful links',
    'resources.sections.toolkitLibrary': 'Toolkit library',
    'resources.sections.contact': 'Contact',
    'resources.sections.acknowledgments': 'Acknowledgments',
    'resources.sections.legal': 'Legal notice',
    'resources.deadHeadsUp': 'Heads up',
    'resources.deadLinks': {
      one: '{count} link on this page is currently dead (checked {date}) — kept here rather than silently dropped, and marked below.',
      other: '{count} links on this page are currently dead (checked {date}) — kept here rather than silently dropped, and marked below.',
    },
    'resources.status.dead': 'link currently dead',
    'resources.status.unverified': 'could not verify automatically',
    'resources.status.unconfirmed': 'unconfirmed',
    'resources.partnersIntro': 'Organizations that help make Park in a Truck parks possible.',
    'resources.videoAlt': 'Video: {title}',
    'resources.suppliersIntro': "Pulled from links inside the workbooks themselves, grouped by what they're for.",
    'resources.contact.email': 'Email:',
    'resources.contact.founder': 'Founder:',
    'resources.contact.phone': 'Phone:',
    'resources.contact.instagram': 'Instagram:',
    'resources.contact.facebook': 'Facebook:',
    // The 404 page (src/pages/404.astro): GitHub Pages shows it for any address that doesn't exist.
    // There is one 404 page for the whole site; when the address was in your language (/es/…),
    // it shows these words in your language, with links to your language's pages.
    /** Page title and heading */
    'notFound.title': 'Page not found',
    'notFound.lede': "There's no page at this address. The link may be old, or it may have a typo.",
    /** Button to the home page */
    'notFound.home': 'Go to the home page',
    /** Button to the list of the six steps */
    'notFound.steps': 'See the six steps',
    /** "My park" is the page with the person's saved project (same name as in the menu) */
    'notFound.saved': 'Anything you saved is still in this browser, in <a href="{href}">My park</a>.',
  },
  { client: false },
);
