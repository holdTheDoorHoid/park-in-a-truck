// Area "schedule": the build schedule (Create) and the stewardship calendar (Sustain) in
// src/components/schedule/, including the text inside the calendar (.ics) files people download.
// The phases and tasks are Park in a Truck's own words (Create workbook; Sustain workbook and the
// toolkit's Park Stewardship Annual Workplan). Units stay US: inches ("), hours.
import { defineMessages } from '../../define.ts';

export default defineMessages('schedule', {
  // ---- the eight build phases (each about a weekend's work) ------------------------------------
  'phase.organize.title': 'Phase 1: Organize',
  'phase.organize.blurb': 'Assemble your team and set the schedule',
  'phase.prepare-lot.title': 'Phase 2: Prepare the lot',
  'phase.prepare-lot.blurb': 'Clear, protect and level the site',
  'phase.layout-gravel.title': 'Phase 3: Layout & gravel base',
  'phase.layout-gravel.blurb': 'Stake out beds and elements, install the sub-base',
  'phase.install-edge.title': 'Phase 4: Install the edge',
  'phase.install-edge.blurb': 'Gabion baskets and wood edging',
  'phase.spread-topsoil.title': 'Phase 5: Spread topsoil',
  'phase.spread-topsoil.blurb': 'Grade and fill the planting beds',
  'phase.plant.title': 'Phase 6: Plant',
  'phase.plant.blurb': 'Trees, shrubs and perennials go in the ground',
  'phase.install-gravel.title': 'Phase 7: Install the gravel surface',
  'phase.install-gravel.blurb': 'Finish gravel, tamped and level',
  'phase.install-elements.title': 'Phase 8: Install park elements',
  'phase.install-elements.blurb': 'Benches, tables and structures',

  // ---- build schedule (Create) --------------------------------------------------------------------
  'build.start': 'When do you want to start building?',
  'build.hint':
    "Pick any date — we'll start the first phase on the Saturday on or after it. Each phase gets its own weekend; you can edit any date or skip a weekend below.",
  /** Screen-reader name of a phase's date box: "Date for Phase 2: Prepare the lot" */
  'build.dateFor': 'Date for {phase}',
  'build.reset': 'Reset to auto date',
  /** The arrow points forward in time; turn it around for right-to-left languages */
  'build.skip': 'Skip this weekend →',
  'build.skipped': 'Skipped weekends',
  /** A skipped weekend; clicking it puts the weekend back. {date} is a date like "Sat, March 14, 2027" */
  'build.unskip': '{date} ✕',
  'build.download': '⬇ Add to my calendar',
  'build.print': '🖨 Print schedule',
  'build.noAddress': "Add your lot's address in Acquire to include it as the location on calendar events.",

  // ---- stewardship calendar (Sustain) ---------------------------------------------------------------
  // The workbook's three calendars: Survive (critical care), Thrive (extra effort), Socialize (ideas)
  'category.survive': 'Survive',
  'category.thrive': 'Thrive',
  'category.socialize': 'Socialize',
  'calendar.prevYear': 'Previous year',
  'calendar.nextYear': 'Next year',
  /** Button arrows for the previous and next year; swap them for right-to-left languages */
  'calendar.prev': '←',
  'calendar.next': '→',
  /** {year} is a year like 2026 */
  'calendar.progress': '{done} of {total} done in {year}',
  'calendar.download': '⬇ Add reminders to my calendar',
  'calendar.print': '🖨 Print',
  /** Small badge on the current month */
  'calendar.now': 'now',
  /** Tasks done in one month: "2/5" */
  'calendar.monthCount': '{done}/{total}',

  // Survive (critical)
  'task.water-weekly': 'Water weekly — soak 3 hrs or water by hand, 6–8" deep',
  'task.weed-weekly': 'Weed weekly (pull, or spray with 20% vinegar)',
  'task.monthly-inspection': 'Monthly inspection — pests, weeds, mulch, dead plants, trash',
  'task.rake-beds': 'Lightly rake out beds',
  'task.cutback-perennials': 'Cut back unsightly perennials',
  'task.preemergent-spring': 'Apply pre-emergent; spray weeds with 20% vinegar',
  'task.mulch-spring': 'Mulch beds — 2–3" deep, donut around trees, not touching trunks',
  'task.annuals-spring': 'Add pansies / cool-season annuals for early color',
  'task.prune-evergreens': 'Prune evergreen shrubs',
  'task.preemergent-summer': 'Apply pre-emergent; spray weeds with 20% vinegar',
  'task.inspect-weeds-fall': 'Inspect plant areas to make sure weeds are eradicated',
  'task.prune-dormant': 'Prune shrubs & trees after leaves fall (leave perennial stems for pollinators)',
  'task.mulch-fall': 'Mulch beds, or plan to mulch in spring',
  'task.water-trees-fall': 'Water trees deeply before the ground freezes',
  // Thrive (optional extra effort)
  'task.seed-catalogs': 'Browse seed catalogs',
  'task.order-seeds': 'Order seeds for veggies and annuals',
  'task.start-seeds': 'Start seeds indoors for an edible garden',
  'task.fertilize-bulbs': 'Fertilize bulbs, 4–6 weeks before anticipated bloom',
  'task.buy-annuals': 'Buy desired annual flowers',
  'task.plant-seedlings': 'Transfer seedlings to planters once weather warms',
  'task.plant-annuals': 'Plant annuals (April if warm, June if cool)',
  'task.deadhead-bulbs': 'Deadhead bulb flowers after bloom',
  'task.remove-bulb-foliage': 'Remove bulb foliage once it has turned yellow',
  'task.order-bulbs': 'Order bulbs; store in a cool, dry space',
  'task.plant-bulbs': 'Plant bulbs (between Halloween & Thanksgiving)',
  // Socialize (the workbook's ideas, not obligations)
  'task.info-meeting': 'Park information meeting (idea)',
  'task.bird-watching': 'Bird-watching event (idea)',
  'task.earth-day': 'Earth Day celebration (idea)',
  'task.community-cleanup': 'Community clean-up (idea)',
  'task.nature-camp': 'Summer nature camp (idea)',
  'task.ribbon-cutting': 'Ribbon cutting (idea)',

  // ---- inside the downloaded calendar (.ics) files ----------------------------------------------------
  /** Name of the calendar a phone or computer shows */
  'ics.buildCalendar': 'Park build schedule',
  /** One calendar event: "Park build: Phase 2: Prepare the lot" */
  'ics.buildEvent': 'Park build: {phase}',
  'ics.stewardCalendar': 'Park stewardship {year}',
  /** One yearly reminder: "Survive: Prune evergreen shrubs" */
  'ics.stewardEvent': '{category}: {task}',
});
