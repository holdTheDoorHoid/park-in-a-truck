// Area "planner": the 3D planner — src/components/planner/, the Planner and SunStudy widgets, and
// the words written by src/lib/planner/ (slope summary, item positions, lot kinds, sun study).
// English is the source. See docs/i18n/HOW-TO-TRANSLATE.md.
//
// Notes for translators:
// - "the planner", "park pieces", "frame / front / back", "seam", theme and size names: see the glossary.
// - Directions are always as seen by someone standing at the park's entrance, looking in:
//   "front" = the entrance edge on the street, "back" = the far end, "left"/"right" as they stand there.
// - Arrows and symbols (← → ↻ ⇄ ⇅ ↶ ↷ ⧉ ✕ ✓ ▶ ❚❚ ▲ ▼ ·) are part of the text: keep them. Flip ← and →
//   only where they mean "back" and "next" (nav.back, nav.next, counts.cost, counts.plants).
// - Units stay US: ft, in, sq ft, °. Write "ft" the way your language normally writes feet.
// - Keyboard keys (Ctrl+Z, Esc, Enter, Shift, Alt, Delete, Backspace, R) stay as printed on keyboards.
import { defineMessages } from '../../define.ts';

export default defineMessages('planner', {
  // ---- the widgets in the workbook chapters (Planner, SunStudy) ----
  /** Screen-reader name of the planner on the Assess chapter */
  'widget.siteLabel': 'Your lot in 3D: mark what is already there and see its sun and shade',
  /** Screen-reader name of the planner on the Dream chapter */
  'widget.designLabel': 'The 3D park planner: Park in a Truck pieces fitted to your real lot',
  'widget.loading': 'Loading the 3D planner…',
  'widget.noscript': 'The 3D planner needs JavaScript. Everything else in this workbook works without it.',
  'widget.sunLabel': 'Sun and shade on your lot',
  'widget.sunLoading': 'Loading the sun study…',
  'widget.sunNoscript': 'The sun study needs JavaScript.',

  // ---- the planner frame: steps, demo lots, loading ----
  /** The planner's steps (the numbered rail at the top of the side panel, and the Back/Next buttons). Short. */
  'step.lot': 'Your lot',
  'step.size': 'Size & themes',
  'step.arrange': 'Arrange',
  'step.existing': "What's there",
  'step.sun': 'Sun & shade',
  'step.counts': 'Counts',
  /** Screen-reader name of the step rail */
  'rail.label': 'Planner steps',
  /** Button back to the previous step; {step} is a step name above. Flip the arrow in right-to-left languages. */
  'nav.back': '← {step}',
  /** Button on to the next step; {step} is a step name above. Flip the arrow in right-to-left languages. */
  'nav.next': 'Next: {step} →',
  'app.waiting': 'The 3D planner loads when you scroll to it…',
  'app.loading': 'Loading your lot and its neighbors…',
  'app.loadFailed': 'Could not load this lot.',

  /** Shown when no lot has been chosen yet */
  'cta.eyebrow': 'Plan your park',
  'cta.title': 'First, choose your lot',
  'cta.text':
    "The planner fits Park in a Truck's park pieces to a real Philadelphia lot, with the neighbors' buildings and trees around it. Look up your lot and it will appear here.",
  'cta.find': 'Find your lot',
  'cta.demo': 'Or try it out on a demo lot (nothing is saved):',
  /** Under the demo lot's address (1322 N Dover St) on its button */
  'demo.doverBlurb': 'A narrow lot between rowhouses (North Philadelphia)',
  /** Under the demo lot's address (2061 S 60th St) on its button */
  'demo.greenwayBlurb': 'A corner lot at Greenway Ave (Southwest Philadelphia)',
  /** Banner while a demo lot is open; {address} is the demo lot's street address */
  'demo.banner': '<strong>Demo lot:</strong> {address}. Nothing you do here is saved.',
  'demo.back': 'Back to your lot',
  'demo.useOwn': 'Use your own lot',

  /** Notes when the lot can't be shown or something failed */
  'note.noOutline': 'This lot has no outline in City records yet, so the planner cannot fit a park to it.',
  'note.noOutlineShort': 'This lot has no outline in City records.',
  'note.cityFailed': 'Could not reach City records for the buildings and trees around your lot. Check your connection and reload.',
  'note.farFailed':
    "Couldn't load the taller buildings farther from your lot, so the sun maps leave out their shade in low morning, evening and winter sun. Reload to try again.",
  'note.loadFailed': 'Something went wrong loading this lot. Try reloading the page.',
  'note.sunFailed': 'The sun study could not finish. Try again.',

  // ---- shared bits ----
  /** A length × width in feet, e.g. "4 × 1.5 ft" */
  'common.dims': '{length} × {width} ft',
  /** A length in feet, e.g. "24 ft" */
  'common.ft': '{ft} ft',
  /** On buttons that add a thing to the park or the map: "+ Stool" */
  'common.add': '+ {name}',
  'common.cancel': 'Cancel',
  /** Button: turn the picked thing a quarter turn */
  'action.turn': '↻ Turn',
  'action.turnTitle': 'Turn a quarter turn (R)',
  'action.duplicate': '⧉ Duplicate',
  'action.duplicateTitle': 'Put a copy right next to it (Ctrl+D)',
  'action.remove': '✕ Remove',
  'action.removeTitle': 'Remove it (Delete)',
  /** Read out after something is removed; {name} is the thing's name in lower case */
  'announce.removed': 'Removed {name}. Undo (Ctrl+Z) brings it back.',
  'announce.removedIt': 'Removed it. Undo (Ctrl+Z) brings it back.',
  /** Not shown any more (2026-10-04): clock times now follow the language's own clock, like the shade calendar's. No need to translate. */
  'time.am': '{hour}:{minute} am',
  'time.pm': '{hour}:{minute} pm',
  /** Joining the last two items of a list: "May and September" ({first} may itself be a list joined with list.sep) */
  'list.and': '{first} and {last}',
  /** Between the other items of a list: "April, May and September" */
  'list.sep': ', ',
  /** Compass directions, used after "in the" / "to the": "The sun is 20° up, in the southwest." */
  'compass.north': 'north',
  'compass.northeast': 'northeast',
  'compass.east': 'east',
  'compass.southeast': 'southeast',
  'compass.south': 'south',
  'compass.southwest': 'southwest',
  'compass.west': 'west',
  'compass.northwest': 'northwest',

  // ---- Your lot (LotPanel) ----
  'lot.size': 'Size of the lot',
  'lot.sizeValue': 'about {length} ft long × {width} ft wide ({area} sq ft)',
  'lot.kind': 'Kind of lot',
  'lot.kindCornerLeft': 'Corner — side street on your left as you walk in',
  'lot.kindCornerRight': 'Corner — side street on your right as you walk in',
  /** Kind of lot for a mid-block lot, from the City's building outlines next door */
  'lot.midBlockBoth': 'Mid-block (buildings on both sides)',
  'lot.midBlockLeft': 'Mid-block (a building on your left as you walk in, none on your right)',
  'lot.midBlockRight': 'Mid-block (a building on your right as you walk in, none on your left)',
  'lot.midBlockNone': 'Mid-block (no buildings right next to it)',
  'lot.entrance': 'Entrance',
  /** {street} is a street name as the City writes it ("N Dover St") */
  'lot.entranceFrom': 'from {street}',
  'lot.entranceFromOther': 'from {street} (not the street in the address — turn the park if this is wrong)',
  'lot.sources': "Outline from the City's parcel map; neighbors' buildings drawn at their City-recorded heights; street trees from the City's tree inventory.",
  'lot.fitTitle': 'Fit the park on the lot',
  'lot.fitHelp': "The park's entrance faces the street. If it's on the wrong end or the wrong way round, turn or flip it here.",
  'lot.otherEnd': '⇄ Entrance at the other end',
  'lot.flip': '⇅ Flip left–right',
  'lot.turn': '↻ Turn 90°',
  'lot.slideGroup': 'Slide the park on the lot, 1 foot at a time',
  'lot.slideLabel': 'Slide the park:',
  /** Names of the four arrow buttons (the arrows themselves stay as they are) */
  'lot.slideFront': 'Slide toward the entrance',
  'lot.slideBack': 'Slide toward the back',
  'lot.slideLeft': 'Slide to the left',
  'lot.slideRight': 'Slide to the right',
  'lot.noRoom': 'No room to slide it this way: the park already reaches the lot line',
  'lot.putBack': 'Put it back',
  'lot.full': "The park fills the lot, so there's no room to slide it.",
  'lot.bestSlide': 'Slide it to fit the lot as well as it can',
  'lot.overhang': 'About {area} sq ft of the park hangs over the lot line (shown in red).',
  'lot.overhangItems': {
    one: 'About {area} sq ft of the park hangs over the lot line (shown in red), and {count} thing stick out.',
    other: 'About {area} sq ft of the park hangs over the lot line (shown in red), and {count} things stick out.',
  },
  'lot.overhangTurned': 'Turned this way the park does not fit — turn it back, or pick a smaller size.',
  'lot.overhangPrinted': 'The printed pieces are bigger than your lot — try “Stretch the pieces to fill my lot” in Size & themes.',
  'lot.overhangSizeA': 'Even the smallest pieces (size A) are bigger than your lot — the Park Patch workbook may suit it better.',
  /** {size} is a size letter A–E */
  'lot.overhangTooBig':
    "Inside its lot lines your lot is only about {length} × {width} ft, and size {size}'s pieces are at least {minLength} × {minWidth} ft, so the park hangs over.",
  'lot.trySmaller': 'Try a smaller size in Size & themes.',
  'lot.overhangShape': "Your lot isn't a perfect rectangle — move or remove what sticks out in “Arrange”, or slide the park.",
  'lot.useSize': 'Use size {size} — it fits inside your lot',
  'lot.choose': 'Choose a different lot',

  // ---- Size & themes (SizePanel) ----
  'size.title': 'Park size',
  'size.intro': "Park in a Truck's pieces come in five sizes. Your lot is about {length} × {width} ft, which fits <strong>size {size}</strong>.",
  'size.introTooSmall':
    "Park in a Truck's pieces come in five sizes. Your lot is about {length} × {width} ft, which fits <strong>size {size}</strong> — it is smaller than size A, so the Park Patch workbook may suit it better.",
  'size.introTooBig':
    "Park in a Truck's pieces come in five sizes. Your lot is about {length} × {width} ft, which fits <strong>size {size}</strong> — it is bigger than size E, so use E and add more, or make two parks.",
  /** Chip that picks the size that fits the lot; {size} is a letter A–E */
  'size.fitMine': 'Fit my lot ({size})',
  /** Tooltip of a size chip */
  'size.range': '{longMin}–{longMax} ft long, {shortMin}–{shortMax} ft wide',
  'size.note': 'Size {size}: lots {longMin}–{longMax} ft long and {shortMin}–{shortMax} ft wide.',
  'size.stretchLegend': 'Stretch to the lot?',
  'size.stretch': 'Stretch the pieces to fill my lot ({length} × {width} ft — like adding the seams)',
  'size.keep': 'Keep the printed size',
  'size.keepWith': 'Keep the printed size ({length} × {width} ft)',
  'size.kindAutoMid': 'As found on the map (mid-block)',
  'size.kindAutoCorner': 'As found on the map (corner)',
  'size.kindMid': 'Mid-block',
  'size.kindLeft': 'Corner — side street on the left',
  'size.kindRight': 'Corner — side street on the right',
  'size.themes': 'Themes',
  'size.themesHelp': 'Use one theme for everything, or mix and match the frame, front and back.',
  'size.oneTheme': 'One theme for everything',
  /** The three park pieces, each with a short explanation after a dash */
  'size.frame': 'Frame',
  'size.frameHint': '— the planted border around the edge',
  'size.front': 'Front',
  'size.frontHint': '— the part by the entrance',
  'size.back': 'Back',
  'size.backHint': '— the far end',

  // ---- Arrange (ArrangePanel) ----
  'arrange.undo': '↶ Undo',
  'arrange.undoTitle': 'Undo (Ctrl+Z)',
  'arrange.redo': '↷ Redo',
  'arrange.redoTitle': 'Redo (Ctrl+Shift+Z)',
  'arrange.snapGroup': 'Snap to grid',
  'arrange.snap': 'Snap',
  'arrange.snapOff': 'Off',
  'arrange.snapOffTitle': 'Move freely, not on the grid',
  /** Where a park item came from: one of its pieces, or added by the person */
  'arrange.sourceFrame': 'frame',
  'arrange.sourceFront': 'front',
  'arrange.sourceBack': 'back',
  'arrange.sourceAdded': 'added by you',
  /** Under the picked item's name: "4 × 1.5 ft · frame · 29 ft from the entrance, 4 ft from the left side" */
  'arrange.itemFacts': '{dims} · {source} · {where}',
  'arrange.sticksOut': 'This sticks out past the lot line.',
  'arrange.move': 'Move',
  'arrange.moveFront': 'Move toward the entrance',
  'arrange.moveLeft': 'Move left',
  'arrange.moveRight': 'Move right',
  'arrange.moveBack': 'Move toward the back',
  'arrange.remove': 'Remove',
  'arrange.helpTouch': 'Drag it to move it, or drag the round handle to turn it (it turns a quarter at a time). Hold your finger on it for more.',
  'arrange.helpMouse':
    'Drag it to move it, or drag the round handle to turn it (it turns in steps; hold Shift to turn freely). Keys: arrows move, R turns, Ctrl+D duplicates, Delete removes, Esc lets go.',
  /** "Plan" is the name of the flat view button */
  'arrange.introTouch':
    '<strong>Drag</strong> anything in the park to move it. Tap it to pick it, then drag its <strong>round handle</strong> to turn it. Hold your finger on it for more. Switch to <em>Plan</em> view to see it like the paper pieces.',
  'arrange.introMouse':
    '<strong>Drag</strong> anything in the park to move it. Click it to pick it, then drag its <strong>round handle</strong> to turn it. Right-click it (or hold your finger on it) for more. Switch to <em>Plan</em> view to see it like the paper pieces.',
  'arrange.pickList': 'Or pick from the list',
  'arrange.nothingPicked': '— nothing picked —',
  /** Groups in the "pick from the list" box */
  'arrange.groupFrame': 'Frame piece',
  'arrange.groupFront': 'Front piece',
  'arrange.groupBack': 'Back piece',
  'arrange.groupAdded': 'Added by you',
  /** One line in the "pick from the list" box: an item's name and where it is */
  'arrange.itemOption': '{name} — {where}',
  'arrange.addTitle': 'Add to your park',
  'arrange.addTouch': 'Tap one to add it in the middle of the park, then drag it into place.',
  'arrange.addMouse': 'Drag one onto the park to put it where you want, or click it to add it in the middle.',
  /** Shown next to the mouse pointer while dragging a new item over the 3D view */
  'arrange.dropHere': 'Let go to put it here · Esc cancels',
  'arrange.changes': {
    one: '{count} change from the Park in a Truck design.',
    other: '{count} changes from the Park in a Truck design.',
  },
  'arrange.noChanges': 'This is the starting Park in a Truck layout.',
  'arrange.startOver': 'Start over from the Park in a Truck layout (Undo brings your changes back)',
  /** Groups of things to add (the palette) */
  'palette.seating': 'Seating',
  'palette.tables': 'Tables',
  'palette.plants': 'Plants',
  'palette.plantingPlay': 'Planting & play',
  'palette.shadeStage': 'Shade & stage',
  'palette.waterWildlife': 'Water & wildlife',
  'palette.gardenTools': 'Garden tools',

  // ---- Where an item is (said from the entrance, looking in) ----
  /** "{along}, {across}" e.g. "29 ft from the entrance, 4 ft from the left side" */
  'where.both': '{along}, {across}',
  'where.atEntrance': 'at the entrance',
  'where.fromEntrance': '{ft} ft from the entrance',
  'where.middle': 'in the middle across',
  'where.againstLeft': 'against the left side',
  'where.againstRight': 'against the right side',
  'where.fromLeft': '{ft} ft from the left side',
  'where.fromRight': '{ft} ft from the right side',
  /** Two items in a list that would read the same get numbered: "Stool — at the entrance, … (#2)" */
  'where.numbered': '{label} (#{n})',

  // ---- What's on the lot now (ExistingPanel) ----
  'existing.title': "What's on the lot now",
  'existing.titleCompact': 'Already on the lot',
  'existing.intro': "Mark what's already there: trees, a neighbor's downspout, spots that get wet, hydrants, poles and wires, old pavement.",
  'existing.cityTrees': {
    one: "The {count} street tree nearby come from the City's tree inventory.",
    other: "The {count} street trees nearby come from the City's tree inventory.",
  },
  'existing.intro2': 'Add a thing, then drag it to where it really is; an area that gets wet you draw around on the map.',
  /** Things already on the lot, with a one-line hint each */
  'existing.tree': 'Tree already there',
  'existing.treeHint': 'Set how wide its branches spread.',
  'existing.downspout': "Neighbor's downspout",
  'existing.downspoutHint': 'Where roof water comes out onto the lot.',
  'existing.wetArea': 'Area that gets wet',
  'existing.wetAreaHint': 'Puddles or soggy ground after rain.',
  'existing.hydrant': 'Fire hydrant',
  'existing.hydrantHint': 'Keep it clear.',
  'existing.pole': 'Utility pole',
  'existing.poleHint': 'Electric or phone pole.',
  'existing.wires': 'Overhead wires',
  'existing.wiresHint': 'Wires crossing over the lot — no tall trees under them.',
  'existing.pavement': 'Old pavement',
  'existing.pavementHint': 'Concrete or asphalt still on the ground.',
  /** A City tree: its species as the City lists it, and its trunk width in inches (") */
  'existing.treeSpecies': '{species} ({dbh}" trunk)',
  'existing.drawTitle': 'Draw the area that gets wet',
  'existing.redrawTitle': 'Redraw the wet area',
  'existing.drawHelp':
    'Click (or tap) on the map around the spot that gets wet, point by point. To finish, click the first point again, double-click, or press Enter — or use “Finish” on the map. Esc cancels.',
  'existing.spread': 'Branches spread {ft} ft across',
  'existing.wetSize': 'About {area} sq ft. Drag the area to move it; drag a corner to reshape it, or the small + between two corners to add one.',
  'existing.redraw': 'Redraw its outline',
  'existing.across': 'About {ft} ft across',
  'existing.drawInstead': 'Draw its outline instead',
  'existing.long': '{ft} ft long',
  'existing.wide': '{ft} ft wide',
  'existing.turn15': '↻ Turn 15°',
  'existing.turn90': '↻ 90°',
  'existing.takeOff': 'Take off the map',
  /** Tag on trees that come from the City's tree inventory */
  'existing.cityRecord': 'City record',
  'existing.keepGroup': 'Keep or remove {name}',
  'existing.keep': 'Keep',
  'existing.remove': 'Remove',
  'existing.kept': "Trees you're keeping: <strong>{count}</strong>. Kept trees shade the lot in the sun study.",
  /** Does a tree on the lot lose its leaves in winter? */
  'tree.winter': 'In winter',
  'tree.deciduous': 'Loses its leaves',
  'tree.evergreen': 'Evergreen',

  // ---- Ground & slope (SlopeCard and the slope summary) ----
  'slope.title': 'Ground & slope',
  'slope.loading': 'Getting the ground heights for your lot (U.S. Geological Survey lidar)… The lot is shown flat until they arrive.',
  'slope.failed': "Couldn't get ground heights for this lot right now, so the planner shows it as flat. Everything else works.",
  /** "Steep Slope Protection Area" is the City zoning map's name for it: keep it, with your translation in brackets */
  'slope.steepArea': 'City zoning maps this lot in the <strong>Steep Slope Protection Area</strong> (Zoning Code 14-704(2): earth moving on steep slopes).',
  /** Link to the City's zoning map, which is in English: add "(in English)" in your language */
  'slope.atlasLink': 'Zoning on atlas.phila.gov',
  'slope.show': 'Show the slope on the map',
  'slope.hide': 'Hide the slope lines',
  'slope.legend': 'Brown lines join ground of equal height; arrows point downhill, the way rain runs off. ▲ and ▼ mark the highest and lowest ground on the lot.',
  'slope.legendInches':
    'Brown lines join ground of equal height, every {inches} inches of height; arrows point downhill, the way rain runs off. ▲ and ▼ mark the highest and lowest ground on the lot.',
  'slope.legendFeet':
    'Brown lines join ground of equal height, every {ft} ft of height; arrows point downhill, the way rain runs off. ▲ and ▼ mark the highest and lowest ground on the lot.',
  'slope.directions': 'Front is the entrance edge on the street; left and right are as you stand there looking in.',
  /** {source} is the survey's name (e.g. "USGS 3DEP lidar"), {year} the year it was flown, {cell} the grid size in metres */
  'slope.accuracy':
    "Ground heights from {source} flown in {year} on a {cell}-metre grid — usually within about 4 inches on open ground. Piles, regrading or anything built since then won't show.",
  'slope.accuracyNoYear':
    "Ground heights from {source} on a {cell}-metre grid — usually within about 4 inches on open ground. Piles, regrading or anything built since then won't show.",
  /** Small heights: "4 inches" */
  'slope.inches': { one: '{count} inch', other: '{count} inches' },
  /** Larger heights: "2.3 ft" */
  'slope.feet': '{ft} ft',
  /** A slope: "0.5%" */
  'slope.pct': '{pct}%',
  /** A slope with its rise over run: "3% (about 1 ft in 33 ft)" */
  'slope.pctRun': '{pct}% (about 1 ft in {run} ft)',
  /** {amount} is slope.inches ("4 inches") */
  'slope.flat': 'The lot is practically flat: its ground varies by less than {amount}.',
  /** {amount}: "1.8 ft" or "5 inches"; {slope}: "3% (about 1 ft in 33 ft)" */
  'slope.varies': 'The ground on the lot varies by about {amount} — an average slope of {slope}.',
  /** {from} and {to} are places on the lot (slope.place*), e.g. "the back left corner", "the front edge" */
  'slope.falls': 'The ground falls about {amount} from {from} to {to} — an average slope of {slope}.',
  /** {where}: slope.toward*; {compass}: a compass direction */
  'slope.rain': 'Rain runs toward {where}, to the {compass}.',
  /** {street}: the name of the street along that edge ("N Dover St") */
  'slope.rainStreet': 'Rain runs toward {where} ({street}), to the {compass}.',
  'slope.rainTheStreet': 'Rain runs toward {where} (the street), to the {compass}.',
  'slope.steepest': 'The steepest stretch, near {where}, slopes about {slope}.',
  'slope.dip': "There is a dip inside the lot: its lowest spot, near {where}, is about {amount} lower than anywhere along the lot's edge.",
  /** Which way rain runs, used in slope.rain */
  'slope.towardFront': 'the front of the lot',
  'slope.towardBack': 'the back of the lot',
  'slope.towardLeft': 'the left side',
  'slope.towardRight': 'the right side',
  'slope.towardFrontLeft': 'the front left corner',
  'slope.towardFrontRight': 'the front right corner',
  'slope.towardBackLeft': 'the back left corner',
  'slope.towardBackRight': 'the back right corner',
  /** Places on the lot, used after "from", "to" and "near" in the sentences above */
  'slope.placeFrontLeft': 'the front left corner',
  'slope.placeFrontRight': 'the front right corner',
  'slope.placeBackLeft': 'the back left corner',
  'slope.placeBackRight': 'the back right corner',
  'slope.placeFront': 'the front edge',
  'slope.placeBack': 'the back edge',
  'slope.placeLeft': 'the left side',
  'slope.placeRight': 'the right side',
  'slope.placeMiddle': 'the middle of the lot',
  /** Labels drawn on the map at the highest and lowest ground. Short. */
  'slope.high': '▲ High',
  'slope.lowInches': '▼ Low · {inches} in lower',
  'slope.lowFeet': '▼ Low · {ft} ft lower',

  // ---- Sun & shade (SunPanel) ----
  'sun.title': 'Sun and shade',
  'sun.intro': 'Watch the shadows of the buildings and trees around your lot move through the day and the year.',
  /** What the trees look like on the date shown */
  'leaf.inLeaf': 'Trees are in leaf',
  'leaf.turning': 'Leaves are turning',
  'leaf.bare': 'Trees are bare (evergreens keep their leaves)',
  /** The same, short, over the 3D view while the year plays */
  'leaf.bareShort': 'Trees are bare',
  'leaf.comingOut': 'Leaves are coming out',
  'leaf.falling': 'Leaves are falling',
  'sun.dayOfYear': 'Day of the year',
  'sun.timeOfDay': 'Time of day',
  'sun.presetSpring': 'First day of spring',
  'sun.presetLongest': 'Longest day',
  'sun.presetFall': 'First day of fall',
  'sun.presetShortest': 'Shortest day',
  /** {rise} and {set} are times of day (time.am / time.pm) */
  'sun.riseSet': '(sunrise {rise}, sunset {set})',
  'sun.pause': '❚❚ Pause',
  'sun.playDay': '▶ Play the day',
  'sun.playYear': '▶ Play the year',
  'sun.playYearTitle': 'Same time of day, through the year',
  'sun.speed': 'Speed',
  'sun.speedSlow': 'Slow',
  'sun.speedNormal': 'Normal',
  'sun.speedFast': 'Fast',
  'sun.yearAt': 'The date moves through the year at {time} each day.',
  /** {deg}: how high the sun is in degrees; {compass}: a compass direction */
  'sun.position': 'The sun is {deg}° up, in the {compass}.',
  'sun.down': 'The sun is down.',
  'sun.litNow': 'At this moment about <strong>{pct}%</strong> of the lot is in direct sun.',
  'sun.mapTitle': 'Sun hours on the map',
  /** Label of a list of periods ("…over the growing season, Apr 15 – Oct 15", "…over June") */
  'sun.over': 'Average hours of direct sun a day over',
  'sun.optGrowing': 'the growing season, {from} – {to}',
  'sun.optDay': 'this day only ({date})',
  'sun.optSeasons': 'A season',
  'sun.optMonths': 'A month',
  'sun.optYear': 'the whole year',
  /** Seasons in the list of periods, at the start of the line */
  'season.spring': 'Spring',
  'season.summer': 'Summer',
  'season.fall': 'Fall',
  'season.winter': 'Winter',
  /** Seasons inside a sentence ("This map shows winter (Dec 21 – Mar 19).") */
  'period.spring': 'spring',
  'period.summer': 'summer',
  'period.fall': 'fall',
  'period.winter': 'winter',
  /** A season and its dates: "winter (Dec 21 – Mar 19)" */
  'period.range': '{season} ({from} – {to})',
  /** The growing season inside a sentence */
  'period.growing': 'the growing season ({from} – {to})',
  'period.year': 'the whole year',
  /** Progress while the growing-season sun hours are worked out */
  'sun.working': 'Working it out… {pct}%',
  /** {period}: e.g. "June", "winter (Dec 21 – Mar 19)", "Jun 21", "the whole year" */
  'sun.workingPeriod': 'Working out {period}… {pct}%',
  'sun.workOut': 'Work out sun hours',
  'sun.workOutAgain': 'Work it out again',
  'sun.workOutPeriod': 'Work out sun hours for {period}',
  'sun.staleTrees': "You've changed what's on the lot since this was worked out — work it out again to include it.",
  'sun.staleFar':
    'Sun hours now also count the shade of taller buildings farther away. This was worked out before that — work it out again to include them (the counts update too).',
  'sun.staleBuildings': "The City's buildings around the lot have changed since this was worked out — work it out again to include them.",
  'sun.legendSun': 'Sun — 6 hours or more: <strong>{pct}%</strong> of the lot',
  'sun.legendPart': 'Part sun — 3 to 6 hours: <strong>{pct}%</strong>',
  'sun.legendShade': 'Shade — under 3 hours: <strong>{pct}%</strong>',
  /** How sunny the lot is over the growing season (the workbook's sun classes) */
  'sun.classFullSun': 'Full sun — almost all of the lot gets 6 or more hours of direct sun a day.',
  'sun.classMostlySun': 'Mostly sunny — at least half the lot gets 6 or more hours a day.',
  'sun.classMostlyShade': 'Mostly shady — less than half the lot gets 6 hours a day.',
  'sun.classDeepShade': 'Deep shade — very little of the lot gets 6 hours of sun a day.',
  'sun.showOnMap': 'Show it on the map',
  'sun.countsTreat': "The counts treat part sun as shade, like the workbook's sun/shade plant count.",
  'sun.mapShows': 'This map shows {period}. The counts and the Assess summary always use the growing season.',
  'sun.mapShowsNotYet': 'This map shows {period}. The counts and the Assess summary always use the growing season (not worked out yet).',
  'sun.spotTitle': 'Sun through the year at one spot',
  'sun.spotHelp': 'Click or tap a spot on the lot, or pick something on it, to see its sun month by month.',
  'sun.spotMiddle': 'Middle of the lot',
  'sun.spotPicked': 'Where the picked thing is',
  /** Which spot the chart is for, used after "direct sun" in the chart's sentences */
  'spot.middle': 'at the middle of the lot',
  'spot.picked': 'at the spot you picked',
  /** {name}: the picked thing's name in lower case ("where the stool is") */
  'spot.thing': 'where the {name} is',
  'sun.assumeTitle': 'What the sun maps and chart count',
  'sun.assumeDirect':
    'Only direct sun: the hours when nothing stands between the sun and a point 1 ft above the ground. Cloudy days and light bouncing off walls are not counted.',
  /** {near} and {far} are distances in feet */
  'sun.assumeBuildings': 'Buildings: every building within about {near} ft of the lot, plus taller buildings up to {far} ft away whose shadow can reach it.',
  'sun.assumeBuildingsCount':
    'Buildings: every building within about {near} ft of the lot, plus taller buildings up to {far} ft away whose shadow can reach it ({count} for this lot).',
  /** "the El" is Philadelphia's elevated train */
  'sun.assumeBuildings2':
    "Their outlines and heights are the City's, measured from the air (lidar). Each is a flat-topped block at its usual roof height, so pitched roofs and chimneys aren't counted, and neither are walls, fences, billboards or the El.",
  'sun.assumeTrees':
    "Trees are the City's street and park trees (their size worked out from trunk width) and the trees marked on the lot. A tree in leaf blocks about {inLeaf}% of the sun; bare branches about {bare}%.",
  'sun.assumeLeaves':
    'Leaves come out between {outFrom} and {outTo} and fall between {dropFrom} and {dropTo}. Evergreens (pines, spruces, hollies, southern magnolias…) keep theirs all year.',
  'sun.assumeGround': 'The slope of the ground is included.',
  'sun.assumeFlat': 'The ground is taken as flat (its heights are not known for this lot).',

  // ---- The year at one spot (SpotChart) ----
  /** Read out for the chart. {where}: spot.*; {best}/{worst}: month names; hours with one decimal */
  'chart.label': 'Average hours of direct sun a day {where}, month by month: most in {best} ({bestHours} hours), least in {worst} ({worstHours} hours).',
  /** {months}: "May to August", "April, May and September" */
  'chart.labelFull': '6 hours or more in {months}.',
  'chart.labelNone': 'No month reaches 6 hours.',
  /** Three or more months in a row */
  'chart.monthRun': '{from} to {to}',
  /** The 6-hour line's label, on two short lines beside the chart */
  'chart.fullLine1': 'full',
  'chart.fullLine2': 'sun',
  /** Pop-up over a month's column */
  'chart.tipSun': '{hours} h of direct sun a day',
  'chart.tipUp': 'the sun is up {hours} h',
  /** The chart's key: a dark square, then this */
  'chart.keyDirect': 'direct sun {where}',
  /** …then a pale square, then this */
  'chart.keyUp': 'hours the sun is up.',
  'chart.averaged': 'Hours a day, averaged over each month.',
  'chart.full': '6 hours or more (full sun) in <strong>{months}</strong>.',
  'chart.none': 'No month reaches 6 hours of direct sun here.',
  'chart.table': 'Show as a table',
  'chart.month': 'Month',
  'chart.direct': 'Direct sun',
  'chart.up': 'Sun is up',
  /** Hours with one decimal: "9.7 h" */
  'chart.hours': '{hours} h',

  // ---- Counts (CountsPanel) ----
  'counts.title': 'Count your pieces',
  'counts.length': 'Length',
  'counts.lengthHint': '— the long side',
  'counts.width': 'Width',
  'counts.widthHint': '— the short side',
  'counts.planting': 'Planting',
  'counts.plantingHint': '— green squares',
  'counts.wall': 'Gabion wall',
  'counts.wallHint': '— the grey band along the street edges',
  'counts.wallHintPieces': {
    one: '— the grey band along the street edges, plus {count} wall piece you added',
    other: '— the grey band along the street edges, plus {count} wall pieces you added',
  },
  'counts.naturePlay': 'Nature play squares',
  'counts.furnishings': 'Furnishings',
  'counts.none': 'None yet.',
  'counts.plantsTitle': 'Count your plants',
  'counts.sun': 'Sun',
  'counts.shade': 'Shade',
  'counts.perennials': 'Perennials',
  'counts.perennialsHint': '(green squares)',
  'counts.shrubs': 'Shrubs',
  'counts.smallTrees': 'Small trees',
  'counts.largeTrees': 'Large trees',
  'counts.allSun': 'Everything counts as sun until you work out the sun hours (Sun & shade step).',
  'counts.placeholder': 'These counts come from a stand-in park layout while the real Park in a Truck pieces are being added.',
  'counts.cost': 'Estimate the cost →',
  'counts.plants': 'Pick your plants →',
  'counts.saved': 'Your counts are saved with your project, so the cost estimate and plant picker use them.',

  // ---- The 3D view: toolbar, hints, bars, menu (Viewport) ----
  /** Screen-reader name of the 3D picture */
  'view.canvas': '3D view of your lot and park design',
  'view.loading': 'Loading the 3D view…',
  'view.noWebgl': 'Your browser could not start the 3D view (WebGL is off or not supported). The steps and counts still work.',
  'view.loadFailed': 'The 3D view could not load. Check your connection and reload the page.',
  /** Screen-reader name of the toolbar over the 3D view */
  'view.toolbar': 'View',
  /** The two views: 3D, and Plan (flat, from above, like the paper pieces). Very short. */
  'view.3d': '3D',
  'view.plan': 'Plan',
  'view.zoomIn': 'Zoom in',
  'view.zoomOut': 'Zoom out',
  'view.resetTitle': 'Back to the starting view',
  'view.reset': 'Reset view',
  'view.moreTitle': 'More',
  'view.more': 'More options',
  'view.aerial': 'Aerial photo',
  'view.streetTrees': 'Street trees',
  'view.grid': '1-ft grid',
  'view.heat': 'Sun-hours map',
  'view.slope': 'Slope lines',
  'view.savePicture': 'Save picture',
  'view.print': 'Print plan',
  'view.northTitle': 'North',
  /** On the compass: one letter for north */
  'view.northLetter': 'N',
  /** Name of the picked thing in the bar over the 3D view (screen readers) */
  'view.picked': '{name} (picked)',
  'view.gabionInfo': 'Gabion wall: one row of 12″ × 12″ × 48″ stone baskets along the street edge.',
  'view.gabionInfoFt': 'Gabion wall: one row of 12″ × 12″ × 48″ stone baskets along the street edge — {ft} ft in all (see Counts).',
  /** The hint line under the 3D view: what the mouse or finger does right now */
  'hint.drawTap': 'Tap around the wet area, point by point',
  'hint.drawTapCount': 'Tap around the wet area, point by point ({count} so far)',
  'hint.drawClick': 'Click around the wet area, point by point · Esc cancels',
  'hint.drawClickCount': 'Click around the wet area, point by point ({count} so far) · Esc cancels',
  'hint.closeTap': 'Tap the first point (or Finish) to close the outline',
  'hint.closeClick': 'Click the first point, double-click or press Enter to finish · Backspace takes back a point · Esc cancels',
  'hint.overTouch': 'This would stick out past the lot line (red)',
  'hint.overMouse': 'This would stick out past the lot line (red) · Esc puts it back',
  'hint.liftTouch': 'Lift your finger to put it here',
  'hint.letGo': 'Let go to put it here · hold Alt to skip the grid · Esc puts it back',
  'hint.turnedTouch': 'Turned to {deg}°',
  'hint.turnedMouse': 'Turned to {deg}° · hold Shift to turn freely · Esc puts it back',
  'hint.lookPlan': 'Drag to move around · pinch or scroll to zoom',
  'hint.look3d': 'Drag to turn · right-drag or two fingers to move · scroll or pinch to zoom',
  'hint.touchPlan': 'Drag things to move them · hold one for more · drag empty ground to move the map',
  'hint.touch3d': 'Drag things to move them · hold one for more · drag empty ground to look around',
  'hint.mousePlan': 'Drag things to move them · drag the round handle to turn · drag empty ground to move the map · scroll to zoom',
  'hint.mouse3d': 'Drag things to move them · drag the round handle to turn · drag empty ground to look around · scroll to zoom',
  /** The bar shown while drawing a wet area's outline */
  'draw.toolbar': 'Drawing a wet area',
  'draw.points': { one: 'Wet area · {count} point', other: 'Wet area · {count} points' },
  'draw.undo': '↶ Undo point',
  'draw.undoTitle': 'Take back the last point (Backspace)',
  'draw.finish': '✓ Finish',
  'draw.finishTitle': 'Close the outline (Enter)',
  'draw.cancel': '✕ Cancel',
  'draw.cancelTitle': 'Stop drawing (Esc)',

  // ---- The printed plan (Print plan) ----
  'print.eyebrow': 'Park in a Truck · park plan',
  /** {size}: a letter A–E; {frame}/{front}/{back}: theme names */
  'print.summary': 'Size {size} · {length} ft × {width} ft · frame {frame}, front {front}, back {back}',
  'print.alt': 'Plan view of the park design on {address}, on a 1-foot grid with 4-foot squares.',
  'print.length': 'Length (long side)',
  'print.width': 'Width (short side)',
  'print.squares': 'Green squares (perennials)',
  'print.sunShade': '{sun} in sun, {shade} in shade',
});
