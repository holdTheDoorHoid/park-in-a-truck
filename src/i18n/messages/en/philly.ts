// Area "philly": the City-data widgets (src/components/philly/: address lookup, lot card, list of
// possible lots, vacant-land map, site report, base map, neighborhood assets) and the words the
// City-data client makes (src/lib/philly/: zoning explanations, owner kinds, Land Bank statuses,
// ways to get a lot, errors).
//
// City data VALUES are never translated: owner names, street names and addresses, zoning codes
// (RSA-5), OPA numbers, park and school names. Only our words around them are.
// Agency names (Philadelphia Land Bank, PHDC, SEPTA…) are names: keep them as they are, and
// translate only the words in brackets or around them (see docs/i18n/glossary.md).
// Units stay US (ft, sq ft, mi): write them the way your language normally writes feet and miles.
import { defineMessages } from '../../define.ts';

export default defineMessages('philly', {
  // ---- loading (shown before the widget's script runs) ----------------------------------------
  'loading.lookup': 'Loading the address lookup… (it needs JavaScript)',
  'loading.map': 'Loading the vacant-land map… (it needs JavaScript)',
  'loading.report': "Loading your lot's site report… (it needs JavaScript)",
  'loading.assets': 'Loading neighborhood assets… (it needs JavaScript)',
  'loading.basemap': 'Drawing your base map… (it needs JavaScript)',

  // ---- units and small words --------------------------------------------------------------------
  /** A length in feet: "14.0 ft" */
  /** Plural forms: the form follows the number of feet in {n} ("1 ft", "2 ft"); give the forms your language needs */
  'unit.ft': { one: '{n} ft', other: '{n} ft' },
  /** An area in square feet: "1,235 sq ft" */
  /** Plural forms: the form follows the number of square feet in {n} ("1 ft", "2 ft"); give the forms your language needs */
  'unit.sqft': { one: '{n} sq ft', other: '{n} sq ft' },
  /** A distance in miles: "0.5 mi" */
  /** Plural forms: the form follows the number of miles in {n} ("1 ft", "2 ft"); give the forms your language needs */
  'unit.mi': { one: '{n} mi', other: '{n} mi' },
  /** Distance in a list of places: the place is right next to the lot */
  'distance.nextDoor': 'next door',
  /** The letter for north on the arrow of a map or drawing (one letter or character) */
  'map.north': 'N',
  // The map's own buttons (tooltips and screen-reader names) and its scale bar
  'map.ui.zoomIn': 'Zoom in',
  'map.ui.zoomOut': 'Zoom out',
  'map.ui.resetBearing': 'Drag to rotate map, click to reset north',
  'map.ui.closePopup': 'Close popup',
  'map.ui.attribution': 'Toggle attribution',
  'map.ui.feedback': 'Map feedback',
  'map.ui.title': 'Map',
  /** Scale bar units: feet and miles, the way your language abbreviates them */
  'map.ui.feet': 'ft',
  'map.ui.miles': 'mi',

  // ---- zoning (Philadelphia Zoning Code base districts; the code itself, RSA-5, stays) ----------
  /** "RSA-5 · Residential — single-family attached houses (rowhouses and twins)" */
  'zoning.line': '{code} · {meaning}',
  'zoning.rsd': 'Residential — single-family detached houses',
  'zoning.rsa': 'Residential — single-family attached houses (rowhouses and twins)',
  'zoning.rta': 'Residential — two-family attached houses',
  'zoning.rmx': 'Residential mixed-use',
  'zoning.rm': 'Residential — multi-family (apartments)',
  'zoning.cmxCenter': 'Center City commercial mixed-use',
  'zoning.cmx3': 'Community commercial mixed-use',
  'zoning.cmx': 'Neighborhood commercial mixed-use (shops with homes above)',
  'zoning.ca': 'Auto-oriented commercial',
  'zoning.irmx': 'Industrial-residential mixed-use',
  'zoning.icmx': 'Industrial-commercial mixed-use',
  'zoning.ip': 'Port industrial',
  'zoning.i1': 'Light industrial',
  'zoning.i2': 'Medium industrial',
  'zoning.i3': 'Heavy industrial',
  'zoning.spPoA': 'Parks and open space (active)',
  'zoning.spPoP': 'Parks and open space (passive)',
  'zoning.spEnt': 'Entertainment (casinos)',
  'zoning.spIns': 'Institutional (campuses, hospitals)',
  'zoning.spSta': 'Stadium',
  'zoning.spAir': 'Airport',

  // ---- FEMA flood zones ({zone} is FEMA's code, e.g. AE) --------------------------------------
  'flood.none': 'Not in a FEMA flood zone',
  'flood.xShaded': 'Zone X (shaded) — moderate flood risk (0.2% chance a year, the "500-year" floodplain)',
  'flood.x': 'Zone X — minimal flood risk',
  'flood.high': 'Zone {zone} — high flood risk (1% chance a year, the "100-year" floodplain)',
  'flood.waves': 'Zone {zone} — high flood risk with waves',
  'flood.other': 'Zone {zone}',

  // ---- owners ------------------------------------------------------------------------------------
  // Public agencies as the site names them. Proper names stay; translate the words in brackets
  // and plain descriptions ("United States government", "Port / bridge authority").
  'agency.landbank': 'Philadelphia Land Bank',
  'agency.redevelopment': 'Philadelphia Redevelopment Authority',
  'agency.pha': 'Philadelphia Housing Authority (PHA)',
  'agency.phdc': 'Philadelphia Housing Development Corporation (PHDC)',
  'agency.city': 'City of Philadelphia',
  'agency.schools': 'School District of Philadelphia',
  'agency.septa': 'SEPTA (regional transit)',
  'agency.commonwealth': 'Commonwealth of Pennsylvania',
  'agency.usa': 'United States government',
  'agency.pidc': 'Philadelphia Authority for Industrial Development (PIDC)',
  'agency.parking': 'Philadelphia Parking Authority',
  'agency.port': 'Port / bridge authority',
  'agency.pgw': 'Philadelphia Gas Works (City-owned utility)',
  'agency.amtrak': 'Amtrak (federal railroad)',
  /** Short owner name in the list of lots under the map (no "(PHA)") */
  'agency.phaShort': 'Philadelphia Housing Authority',
  // The agency inside a sentence ("This lot belongs to the School District of Philadelphia, …").
  'agencyIn.pha': 'the Philadelphia Housing Authority (PHA)',
  'agencyIn.schools': 'the School District of Philadelphia',
  'agencyIn.septa': 'SEPTA',
  'agencyIn.commonwealth': 'the Commonwealth of Pennsylvania',
  'agencyIn.usa': 'the United States government',
  'agencyIn.pidc': 'the Philadelphia Authority for Industrial Development (PIDC)',
  'agencyIn.parking': 'the Philadelphia Parking Authority',
  'agencyIn.port': 'a port or bridge authority',
  'agencyIn.pgw': 'the Philadelphia Gas Works',
  'agencyIn.amtrak': 'Amtrak',
  /** A public agency the site doesn't know by name: {name} is the agency's name */
  'agencyIn.named': 'the {name}',
  'agencyIn.unknown': 'this public agency',

  // The ways to get a lot, from the Acquire workbook ("Who owns that lot?"), by owner.
  'paths.otherAgency.title': 'Owned by another public agency',
  /** {agency} is the agency inside a sentence (agencyIn.*), used twice */
  'paths.otherAgency.text':
    "This lot belongs to {agency}, a public agency separate from the City. Its land is not sold or leased through PHDC or the Philadelphia Land Bank, and the Land Bank's map won't list it. Contact the landowner — {agency} — about the lot.",
  /** Link to the agency's own website (English only): "SEPTA website" */
  'paths.otherAgency.link': '{agency} website',
  'paths.purchasePublic.title': 'Potential purchase',
  'paths.purchasePublic.text':
    'Publicly owned land in Philadelphia is sold or leased through the Philadelphia Housing Development Corporation (PHDC) and the Philadelphia Land Bank. Do a property search to find out if public land is available for purchase.',
  /** Link to an English-only website: add "(in English)" in your language */
  'paths.purchasePublic.link': 'Land Bank Community Use map',
  'paths.donation.title': 'Potential donation',
  'paths.donation.text': 'Contact the landowner about permanently donating the property to the neighborhood for use as a park.',
  'paths.sale.title': 'Potential sale',
  'paths.sale.text': 'Watch for a public sale listing or auction of the property. In Philadelphia this may also include a Sheriff Sale.',
  /** Link to an English-only website: add "(in English)" in your language */
  'paths.sale.link': 'Sheriff Sale listings (Bid4Assets)',
  'paths.purchase.title': 'Negotiate a purchase agreement',
  'paths.purchase.text': 'Contact the landowner and negotiate a sale of the underutilized property for neighborhood use.',
  'paths.inKind.title': 'In-kind agreement',
  'paths.inKind.text':
    'Contact the landowner and discuss the mutual benefits of granting the neighborhood "in-kind" use of the lot as a park, while the owner keeps ownership.',
  /** The bold title of one way forward, followed by its text: "Potential purchase." */
  'paths.titleDot': '{title}.',
  'paths.label': 'What this means for getting the lot',
  'paths.public': 'Public owner — your path',
  'paths.private': 'Private owner — four ways forward',

  // ---- the Philadelphia Land Bank's status for public land ---------------------------------------
  'landBank.available': 'Available',
  'landBank.availableNoBuild': 'Available — no construction permitted',
  'landBank.availableNotSideYard': 'Available — but not as a side yard',
  'landBank.holdAffordable': 'On hold for affordable housing',
  /** {what} is the Land Bank's own words or abbreviation, kept as they write it */
  'landBank.holdFor': 'On hold for {what}',
  'landBank.hold': 'On hold',
  'landBank.otherApplicant': 'Another applicant is in process — not available',
  'landBank.gsi': 'Not available — green stormwater project',
  'landBank.managed': 'Managed by the agency — not available',
  'landBank.notAvailable': 'Not available',
  'landBank.salePending': 'Sale pending',
  'landBank.rfp': 'Offered through a request for proposals (RFP)',
  'landBank.soon': 'To be listed soon',
  'landBank.bids': 'Open for competitive bids',
  'landBank.councilHold': 'Held for the district Councilmember',
  'landBank.unknown': 'Status not known yet (Land Bank research pending)',
  'landBank.none': 'No status listed',
  /** "Available · side-yard eligible" */
  'landBank.sideYardLine': '{status} · side-yard eligible',
  'landBank.sideYardMeans': 'Side-yard eligible: a homeowner who lives next door can apply to buy it from the Land Bank as a side or rear yard.',
  /** Before a Land Bank status in short lists: "Land Bank: Available" */
  'landBank.prefix': 'Land Bank:',

  // ---- lot type and why (the reasons are saved in English and translated when shown) -------------
  'lotType.midBlock': 'Mid-block lot',
  'lotType.corner': 'Corner lot',
  'lotType.alley': 'Breezeway / alley',
  'lotType.unknown': 'Not sure',
  /** {width} and {length} are lengths like "14 ft" */
  'lotType.why.narrow': 'Long and very narrow ({width} wide, {length} long), like a breezeway or alley.',
  /** {streets} is a list of street names */
  'lotType.why.corner': 'Streets on two sides: {streets}.',
  'lotType.why.passage': 'A narrow strip that reaches streets at both ends ({streets}), like a passage across the block.',
  'lotType.why.recorded': 'City records describe it as an alley or passage.',
  'lotType.why.through': 'Runs through the block, with streets at both ends ({streets}).',
  'lotType.why.oneStreet': 'Faces one street ({streets}) with neighbors on the other sides.',
  'lotType.why.noStreet': "We couldn't find a street right next to this lot — it may be reached by a driveway or alley.",
  'lotType.why.irregular': 'Its shape is irregular, so the size is for the rectangle around it.',

  // ---- errors and problems -------------------------------------------------------------------------
  /** {place} is the street corner as typed or as the City writes it */
  'error.cornerPick': '"{place}" is a street corner, not a property. Here are vacant lots near it — pick one:',
  'error.cornerType': '"{place}" is a street corner, not a property. Type the address of a lot near it instead.',
  'error.noParcel': "There's no property at that spot — it may be a street or sidewalk. Tap inside a lot.",
  'error.opaDigits': 'An OPA account number has 9 digits.',
  'error.tooShort': 'Type a street address, like "1322 N Dover St".',
  /** {typed} is what the person typed */
  'error.didYouMean': 'We couldn\'t find "{typed}" exactly. Did you mean one of these?',
  'error.notFound': 'We couldn\'t find "{typed}" in the City\'s address list. Check the house number and street name (for example "1322 N Dover St").',
  'error.notInRecords': 'We couldn\'t find "{typed}" in the City\'s property records.',
  'error.noLocation': 'We found "{typed}" but the City has no location for it.',
  'error.generic': 'Something went wrong looking that up. Try again in a minute.',
  'error.genericShort': 'Something went wrong. Try again in a minute.',
  'error.cancelled': 'Cancelled.',
  // The City's services, inside the messages below.
  'service.ais': 'the City address service (AIS)',
  'service.opa': 'the City property database (OPA)',
  'service.arcgis': 'the City map service',
  'service.other': 'a City service',
  // {service} is one of the names above; {Service} is the same name starting with a capital
  // letter, for the start of a sentence (use whichever your sentence needs).
  'http.unreachable': "We couldn't reach {service}. It may be busy or down — try again in a minute. Anything you typed is still saved.",
  /** {status} is an HTTP error number such as 503 */
  'http.status': '{Service} answered with an error ({status}). Try again in a minute. Anything you typed is still saved.',
  'http.stopped': '{Service} stopped answering. Try again in a minute.',
  'http.unreadable': "{Service} sent something we couldn't read. Try again in a minute.",
  'http.problem': '{Service} reported a problem. Try again in a minute.',
  /** {detail} is the service's own error message, in English */
  'http.problemDetail': '{Service} reported a problem ({detail}). Try again in a minute.',
  // A part of the City's records that didn't load (saved with the lot in English, translated when shown).
  'warn.record': "Couldn't load the City's property record (owner, size) right now.",
  'warn.vacantList': "Couldn't load the City's vacant-land list right now.",
  'warn.rcos': "Couldn't load community organizations (RCOs) right now.",
  'warn.landBank': "Couldn't load the Land Bank's status for this lot right now.",
  'warn.flood': "Couldn't load FEMA flood zones right now.",
  'warn.deedOutline': "Couldn't load the deed parcel outline right now.",
  'warn.neighbours': "Couldn't load neighbouring parcels right now.",
  'warn.streets': "Couldn't load street centerlines right now.",
  'warn.buildings': "Couldn't load building outlines and heights right now.",
  'warn.parcels': "Couldn't load parcel outlines right now.",
  'warn.trees': "Couldn't load City tree inventory right now.",

  // ---- "Check it yourself" links (English-only websites: add "(in English)" in your language) ------
  'source.atlas': 'This property on atlas.phila.gov',
  'source.property': 'Property assessment (property.phila.gov)',
  'source.zoning': 'Zoning on atlas.phila.gov',
  'source.landBank': "Philadelphia Land Bank's property map",
  'source.rcos': 'Registered Community Organizations (City of Philadelphia)',

  // ---- address search ---------------------------------------------------------------------------------
  'search.label': 'Address',
  /** Placeholder in the address box: keep the example address as it is */
  'search.placeholder': 'e.g. 1322 N Dover St',
  'search.hint': 'A Philadelphia street address, a corner like "60th & Greenway", or a 9-digit OPA number.',
  'search.button': 'Look up',
  'search.down': 'The City address service is not answering right now.',
  /** Screen-reader name of the list of suggestions under the address box */
  'search.listLabel': 'Matching addresses',
  'search.corner': 'Street corner — shows lots nearby',
  /** {owner} is the owner's name as the City lists it */
  'search.owner': 'Owner: {owner}',

  // ---- address lookup (Acquire, Find a lot) ---------------------------------------------------------
  'lookup.label': 'Address of the lot',
  'lookup.labelCandidate': 'Add a possible lot by address',
  'lookup.placeholderCandidate': 'Address to add, e.g. 2424 N Mole St',
  'lookup.hintCandidate': 'Looks the lot up and adds it to your list of possible lots below.',
  'lookup.add': 'Add',
  'lookup.checking': 'Checking City records (owner, size, zoning, vacancy)…',
  'lookup.updated': 'Updated from City records.',
  /** {address} is the lot's street address */
  'lookup.nowYourLot': '{address} is now your park lot.',
  'lookup.nowYourLotFilled': '{address} is now your park lot. The owner and address fields on this page are filled in from City records.',
  'lookup.added': 'Added {address} to your list of possible lots.',
  'lookup.addedBelow': "Added {address} to your list of possible lots — it's in the table below.",
  'lookup.different': 'Look up a different lot',
  'lookup.refresh': 'Refresh from City records',
  'lookup.findOnMap': 'Find lots on the map',
  'lookup.tryAgain': 'Try again',
  'lookup.orBrowse': 'Or <a href="{href}">browse the vacant-land map</a>.',
  'lookup.onlyStreet':
    'Only know the street, not the house number? Type the street name into the <a href="{href}">vacant-land map\'s "Go to an address or corner" box</a> and pick your block — the map shows the vacant lots on it.',
  'action.use': 'Use this as my park lot',
  'action.isYourLot': '✓ This is your park lot',
  'action.add': '+ Add to my list',
  'action.onList': '✓ On your list',
  'badge.yourLot': 'Your park lot',
  'badge.public': 'Public owner',
  'badge.private': 'Private owner',
  'badge.unknown': 'Owner unknown',

  // ---- lot card ----------------------------------------------------------------------------------------
  /** Screen-reader name of the card: "City records for 1322 N Dover St" */
  'card.label': 'City records for {address}',
  /** {district} is the City's planning district name, e.g. "Lower North" */
  'card.district': '{district} planning district',
  /** {zip} is a ZIP code */
  'card.zip': 'Philadelphia {zip}',
  /** {opa} is the City's 9-digit property account number */
  'card.opa': 'OPA #{opa}',
  'card.owner': 'Owner',
  'card.notOnRecord': 'Not on record',
  'card.landBank': 'Land Bank status',
  'card.lbNotInInventory': "Not in the Land Bank's inventory of public land",
  'card.lbSeparate': "Not in the Land Bank's inventory — a separate agency owns it",
  'card.lbFrom': "From the Land Bank's own property list.",
  /** Link to an English-only website: add "(in English)" in your language */
  'card.lbMap': 'Land Bank property map',
  'card.lastSold': 'Last sold',
  'card.cityRecords': '(City property records)',
  'card.mailing': "Owner's mailing address",
  'card.asOnFile': '(as the City has it on file)',
  'card.lotSize': 'Lot size',
  'card.parkSize': 'Park size',
  'card.lotType': 'Lot type',
  'card.zoning': 'Zoning',
  'card.vacant': 'Vacant?',
  'card.vacantYes': "Yes — on the City's list of vacant land",
  'card.vacantRecorded': "Recorded as vacant land, but not on the City's current vacant-land list (it may be in use)",
  'card.vacantNo': "Not on the City's vacant-land list",
  /** {category} is the City's own category, e.g. "vacant land", "residential" (in English) */
  'card.vacantNoCategory': "Not on the City's vacant-land list (the property record lists it as {category})",
  'card.council': 'Council district',
  'card.councilDistrict': 'District {district}',
  /** {member} is the Councilmember's name */
  'card.councilMember': 'District {district} — Councilmember {member}',
  'card.rcos': 'Community groups (RCOs)',
  'card.flood': 'Flood zone',
  /** {warnings} is one or more of the "Couldn't load …" sentences */
  'card.missing': 'Some details are missing: {warnings}',
  'card.checkIt': 'Check it yourself:',
  // Lot size. {width}, {length}, {area} come formatted ("14.1 ft", "701 sq ft").
  'size.measured': '{width} × {length} · {area}',
  'size.irregular': 'irregular shape (size of the rectangle around it)',
  /** Size from the property record when there's no outline: numbers in feet */
  'size.record': '{frontage} × {depth} ft (City records)',
  'size.recordArea': '{frontage} × {depth} ft (City records) · {area}',
  'size.recordShort': '{frontage} × {depth} ft',
  /** Park in a Truck sizes are the letters A–E; the letter stays */
  'park.size': 'Size {size}',
  'park.closest': '(closest fit — the biggest set whose pieces fit inside the lot)',
  /** Follows "Size A", in smaller type */
  'park.pieceSet': '— the Park in a Truck piece set for this lot',
  'park.tooSmall': 'Smaller than size A — the <a href="{href}">Park Patch workbook</a> fits small spaces better.',
  'park.nearest': '(Nearest: size {size})',
  'park.tooBig': 'Bigger than size E — start from size E and expand.',
  'park.dreamWorkbook': '(Dream workbook)',

  // ---- list of possible lots (Acquire) ----------------------------------------------------------------
  'compare.empty': 'Your list of possible lots is empty. Look up an address above, or add lots from the map.',
  'compare.title': 'Your possible lots ({count})',
  'compare.caption': 'Possible park lots compared',
  'compare.address': 'Address',
  'compare.vacantList': 'Vacant list',
  'compare.actions': 'Actions',
  'compare.yourLot': '✓ your lot',
  'compare.public': 'Public',
  'compare.private': 'Private',
  'compare.unknown': 'Unknown',
  'compare.notInInventory': "Not in the Land Bank's inventory",
  /** Lot size in the table: "14 ft × 50 ft" */
  'compare.size': '{width} × {length}',
  'compare.underA': 'Under A (Park Patch)',
  'compare.overE': 'Over E',
  'compare.midBlock': 'Mid-block',
  'compare.corner': 'Corner',
  'compare.yes': 'Yes',
  'compare.no': 'No',
  'compare.make': 'Make this my lot',
  'compare.remove': 'Remove',
  'compare.removeLabel': 'Remove {address} from the list',

  // ---- vacant-land map (Acquire, Find a lot) ------------------------------------------------------------
  'finder.label': 'Go to an address or corner',
  /** Placeholder: keep the example addresses as they are */
  'finder.placeholder': 'e.g. 2233 N Uber St, N Uber St, or 22nd & Diamond',
  'finder.hint': 'Takes the map there. Only know the street? Type its name and pick your block.',
  'finder.form': 'Move the vacant-land map',
  'finder.go': 'Go',
  'finder.nearMe': '📍 Near me',
  'finder.streetMap': 'Street map',
  'finder.aerial': 'Aerial photo',
  'finder.checking': 'Checking City records…',
  'finder.found': 'Found <strong>{address}</strong> — the map is on it, and <a href="{href}">its details are under the map ↓</a>',
  'finder.added': 'Added {address} to your list.',
  'finder.onlyStreet': 'Only know the street? Type just its name, like "N Uber St", and pick your block.',
  'map.canvas': 'Map of vacant land. Arrow keys move the map, plus and minus zoom. The same lots are listed below the map.',
  'map.region': 'Map of vacant land. Click a coloured lot to see its owner and size, or use the list below the map.',
  'map.failed': "The map couldn't load (the basemap service may be unreachable). You can still look lots up by address.",
  'map.loadingMap': 'Loading the map…',
  'map.zoomIn': 'Zoom in to see vacant lots',
  'map.loading': 'Loading vacant lots…',
  'map.zoomInAll': 'Zoom in to see every vacant lot here',
  'map.noneHere': 'No lots on the City vacant list here',
  'map.loadError': "Couldn't load vacant lots — the City map service may be busy",
  'map.noGeo': 'This browser cannot share its location.',
  'map.finding': 'Finding you…',
  'map.noLocation': 'Location not shared — search for an address instead.',
  'popup.checking': 'Checking City records…',
  'popup.ownerMissing': 'Owner not listed',
  'popup.details': 'Details',
  'popup.saved': '✓ Saved as your park lot',
  'popup.added': '✓ Added to your list',
  'popup.below': 'Details are below the map.',
  'popup.notVacant': "Not on the City's vacant-land list.",
  'popup.lookUp': 'Look up this property',
  'legend.label': 'Map legend',
  'legend.lbAvailable': 'Public — the Land Bank lists it as available',
  'legend.lbOther': 'Public — on hold, in process or not available (Land Bank)',
  'legend.agency': 'Public — another agency owns it (not sold through the Land Bank)',
  'legend.public': 'Vacant — public owner',
  'legend.private': 'Vacant — private owner',
  'legend.yourList': 'Your list',
  'legend.note': "Vacant lots appear when you zoom in close. Source: City of Philadelphia vacant-land list; Land Bank status from the Land Bank's own property list.",
  'legend.noteNoLb': "Vacant lots appear when you zoom in close. Source: City of Philadelphia vacant-land list. The Land Bank's status couldn't load right now.",
  /** {hundred} is a house number like 2200 (the 2200 block = numbers 2200–2299) */
  'street.block': '{hundred} block',
  'street.firstBlock': 'First block (under 100)',
  /** {street} is a street name as the City writes it */
  'street.showingBlock': "Showing the {hundred} block of {street}. Vacant lots on the City's list are coloured, and listed under the map.",
  'street.showingFirst': "Showing the first block of {street}. Vacant lots on the City's list are coloured, and listed under the map.",
  'street.showingCorner': 'Showing the corner of {corner}. Vacant lots near it are coloured, and listed under the map.',
  'street.notFound': 'We couldn\'t find a street called "{street}" on the City\'s street map. Check the spelling, or type a full address like "2233 N Uber St".',
  /** {q} is what the person typed */
  'street.which': 'More than one street matches "{q}". Which one?',
  'street.blocks': {
    one: "{street} has {count} block on the City's street map. Which block is yours? (The 2200 block is house numbers 2200–2299.)",
    other: "{street} has {count} blocks on the City's street map. Which block is yours? (The 2200 block is house numbers 2200–2299.)",
  },
  /** Screen-reader name of the row of block buttons */
  'street.blocksLabel': 'Blocks of {street}',
  'inView.title': 'Vacant lots on the map now',
  'inView.titleCount': 'Vacant lots on the map now ({count})',
  'inView.notReady': 'The list appears once the map has loaded.',
  'inView.zoom': 'Zoom in on a few blocks, or type an address or street above, to list the vacant lots there.',
  'inView.none': "No lots on the City's vacant-land list in this part of the map.",
  'inView.order': 'Nearest the middle of the map first. Move the map to change the list.',
  'inView.noAddress': 'Lot without an address',
  'inView.notLandBank': 'not through the Land Bank',
  'inView.detailsFor': 'Details for {name}',
  'inView.addLabel': 'Add {name} to my list',
  'inView.more': 'Show {count} more',

  // ---- site report (Assess) -------------------------------------------------------------------------------
  'report.noLot':
    'Choose your lot first — look it up in <a href="{acquire}">Step 1: Acquire</a> or on the <a href="{lot}">Find a lot</a> page. This report then fills itself in from City records.',
  /** {date} is the date the City records were looked up */
  'report.from':
    "From City of Philadelphia records for <strong>{address}</strong> (looked up {date}). Measurements come from the City's parcel outline — check them with a tape measure on site; field measurements win.",
  'report.edges': 'Measured edges',
  // One measured side: "14.0 ft — entrance side, along N Dover St (from the starting point, blue dot)"
  'report.edgeSideStreet': '— {side}, along {street}',
  'report.edgeSide': '— {side}',
  'report.edgeStreet': ', along {street}',
  'report.edgeStart': '(from the starting point, blue dot)',
  'side.x0': 'entrance side',
  'side.x1': 'back',
  'side.y0': 'right side as you stand at the entrance',
  'side.y1': 'left side as you stand at the entrance',
  'report.longShort': 'Long × short edge',
  /** "50.3 ft × 14.1 ft" */
  'report.longShortValue': '{long} × {short}',
  'report.rectNote':
    "The smallest rectangle the lot fits in — what the park sizes below are measured against. It can be a few inches longer than the sides above when the lot isn't quite square.",
  'report.area': 'Area',
  'report.fromOutline': '(from the parcel outline)',
  'report.assessed': "the City's tax assessment says {area}",
  'report.shape': 'Shape',
  'report.irregular': 'Irregular — long and short edge are the rectangle around it.',
  /** {frontage} and {depth} are numbers of feet (or "?") */
  'report.noOutline': 'The City has no outline for this lot. Its property record says {frontage} × {depth} ft — measure it on site.',
  'sizes.caption': 'Park in a Truck sizes A to E',
  'sizes.size': 'Size',
  'sizes.long': 'Long edge',
  'sizes.short': 'Short edge',
  /** A range of lengths: "44–64 ft". In right-to-left languages a dash between two numbers can swap them on screen; write "from {min} to {max}" in your words if it does. */
  'sizes.range': '{min}–{max} ft',
  /** {long} and {short} are lengths like "50.3 ft" */
  'report.tooSmall': 'Your lot ({long} × {short}) is smaller than size A — the <a href="{href}">Park Patch workbook</a> is made for spaces like this.',
  'report.tooBig': 'Your lot ({long} × {short}) is bigger than size E — start from E and expand.',
  'report.fits': 'Your lot ({long} × {short}) is size {size}.',
  'report.fitsClosest': 'Your lot ({long} × {short}) is size {size} (closest fit — the biggest set whose pieces fit inside the lot).',
  'report.location': 'Lot location',
  'report.streetSides': 'Street sides',
  'report.streetSide': '{street} — {side}',
  'report.flooding': 'Flooding',
  'report.historic': 'Historic district',
  'report.sketch': 'Sketch of the lot with its sides numbered to match the list of measurements, drawn as you stand at the entrance; the arrow points north',
  'report.sketchStreet':
    'Sketch of the lot with its sides numbered to match the list of measurements, drawn as you stand at the entrance on {street}; the arrow points north',
  'report.aerial': 'Aerial photo of {address} with the lot outlined, turned to match the sketch above',
  'report.photoNote': 'The photo is turned to match the sketch, as you stand at the entrance. The arrows point north.',
  'report.around': 'Around the lot',
  'report.aroundFailed': "Couldn't load nearby buildings and trees.",
  'report.loadingAround': 'Loading buildings and trees…',
  'report.nextDoor': 'Buildings next door',
  /** {count} buildings touch the lot; {height} is "25" or "25–32"; {storeys} is report.storeys */
  'report.nextDoorValue': {
    one: '{count} touching your lot — {height} ft tall (about {storeys})',
    other: '{count} touching your lot — {height} ft tall (about {storeys})',
  },
  'report.storeys': { one: '{count} storey', other: '{count} storeys' },
  'report.noneTouching': 'None touching the lot',
  'report.estimated': '(some heights estimated)',
  'report.tallest': 'Tallest nearby',
  'report.tallestValue': '{height} ft (within 150 ft)',
  'report.trees': 'City trees',
  'report.treesValue': '{on} on the lot · {near} within 30 ft',
  /** A City tree with no species name */
  'report.tree': 'tree',
  'report.sources': 'Building heights: City LiDAR (LI building footprints). Trees: Parks & Recreation tree inventory 2025.',
  /** {year} is the year the photo was taken */
  'aerial.credit': 'Aerial photo {year} © City of Philadelphia. Your lot is outlined in blue.',
  'outline.label': 'Outline of the lot, about {width} by {length} feet. North is up; street sides are drawn thick.',
  'outline.labelNoSize': 'Outline of the lot. North is up; street sides are drawn thick.',

  // ---- base map (Assess: "Diagram your lot") ------------------------------------------------------------
  'basemap.noLot': "Choose your lot first (<a href=\"{href}\">Find a lot</a>) — the base map then draws itself from the City's parcel outline.",
  'basemap.noOutline': "The City has no parcel outline for {address}, so the base map can't be drawn. Use the workbook's grid sheet and your own measurements.",
  'basemap.title': 'Base map — {address}',
  'basemap.notePwd':
    'Lot outline from City of Philadelphia parcel records (Water Department parcels). Small squares = 1 ft; heavy lines every 4 ft. Measure on site — field measurements win.',
  'basemap.noteDor':
    'Lot outline from City of Philadelphia parcel records (Records Department deed parcels). Small squares = 1 ft; heavy lines every 4 ft. Measure on site — field measurements win.',
  /** Screen-reader description of each side: "Side 1: 14.0 feet along N Dover St" */
  'basemap.side': 'Side {n}: {length} feet',
  'basemap.sideStreet': 'Side {n}: {length} feet along {street}',
  /** Printed on the drawing at the measuring corner; capital letters where your script has them */
  'basemap.start': 'PROJECT STARTING POINT',
  /** Under the scale bar */
  'basemap.feet': 'feet',
  /** A drawing scale that isn't a standard one: "1″ = 12′ (fit to page)" */
  'basemap.fitScale': '1″ = {feet}′ (fit to page)',
  'basemap.scale': 'Scale {scale}',
  'basemap.printActual': 'Print at 100% (“Actual size”)',
  'basemap.printFooter': 'Park in a Truck · {date}',
  'basemap.print': '🖨 Print base map',
  'basemap.neighbours': "Neighbors' lot lines",
  'basemap.existing': 'Existing conditions ({count})',
  'basemap.prints': 'Prints on Letter paper, landscape, at {scale}.',
  'basemap.rounded': 'Side lengths are rounded to a tenth of a foot. Scale {scale} when printed at 100%.',

  // ---- neighborhood assets (Organize) --------------------------------------------------------------------
  // The three lists of the Organize workbook
  'assets.list.citizens': 'Citizens associations',
  'assets.list.institutions': 'Local institutions',
  'assets.list.physical': 'Neighborhood physical assets',
  'assets.cat.rcos': 'Registered Community Organizations',
  'assets.cat.council': 'City Council district',
  'assets.cat.friends': 'Park friends groups',
  'assets.cat.schools': 'Schools',
  'assets.cat.libraries': 'Libraries',
  'assets.cat.parks': 'Recreation centers & parks',
  'assets.cat.hospitals': 'Hospitals',
  'assets.cat.universities': 'Universities & colleges',
  'assets.cat.gardens': 'Community gardens & farms',
  'assets.cat.art': 'Murals & public art',
  'assets.cat.historic': 'Historic places',
  'assets.note.rcos': 'Groups registered with the City for this address. Developers must notify them about zoning changes — good partners to know.',
  'assets.note.art': "City-commissioned art and park monuments. Mural Arts' murals aren't in the City's open data — check their map too.",
  'assets.note.twoMiles': 'Within two miles.',
  'assets.note.oneMile': 'Within a mile.',
  // Sources (English-only websites: add "(in English)" in your language). Names stay.
  'assets.source.rcos': 'City of Philadelphia — RCOs',
  'assets.source.council': 'Philadelphia City Council',
  'assets.source.parks': 'Philadelphia Parks & Recreation',
  'assets.source.schools': 'OpenDataPhilly — Schools',
  'assets.source.libraries': 'Free Library of Philadelphia',
  'assets.source.hospitals': 'OpenDataPhilly — Hospitals',
  'assets.source.universities': 'OpenDataPhilly — Universities & colleges',
  'assets.source.murals': 'Mural Arts Philadelphia — mural map',
  'assets.source.historic': 'Philadelphia Historical Commission',
  'assets.partial': "Part of this list couldn't load from the City right now, so it may be missing some places.",
  'assets.failed': "Couldn't load this list from the City right now.",
  // A place the City lists without a name
  'assets.unnamed.friends': 'Friends group',
  'assets.unnamed.school': 'School',
  'assets.unnamed.library': 'Library',
  'assets.unnamed.park': 'Park',
  'assets.unnamed.hospital': 'Hospital',
  'assets.unnamed.college': 'College',
  'assets.unnamed.garden': 'Community garden',
  'assets.unnamed.farm': 'Urban farm',
  'assets.unnamed.artwork': 'Public artwork',
  'assets.unnamed.monument': 'Monument',
  'assets.unnamed.building': 'Historic building',
  'assets.unnamed.district': 'Historic district',
  // One line of detail under a place
  /** {park} is the park's name */
  'assets.detail.caresFor': 'Cares for {park}',
  'assets.detail.friends': 'Park friends group',
  'assets.detail.garden': 'Registered community garden',
  'assets.detail.urbanAg': 'Parks & Rec urban agriculture',
  /** {program} is the City's program name (English) */
  'assets.detail.urbanAgProgram': 'Parks & Rec urban agriculture · {program}',
  'assets.detail.inPark': 'In a City park',
  'assets.detail.register': 'Philadelphia Register of Historic Places',
  /** {year} is the year the building was listed */
  'assets.detail.registerListed': 'Philadelphia Register of Historic Places · listed {year}',
  'assets.detail.localDistrict': 'Local historic district',
  'assets.detail.coversLot': 'Covers your lot',
  /** {from} and {to} are months like "January 2024" */
  'assets.detail.council': 'Council member for the {from} – {to} term',
  /** {name} is a campus building's name */
  'assets.detail.nearestBuilding': 'Nearest building: {name}',
  /** {member} is the Councilmember's name */
  'assets.council': 'Council District {district} — Councilmember {member}',
  'assets.councilOnly': 'Council District {district}',
  'assets.mapLabel': 'Map of the assets listed below; your lot is the blue dot',
  'assets.mapFailed': "The map couldn't load; the lists below still work.",
  'assets.loadFailed': "Couldn't load the City's lists right now.",
  'assets.noLot':
    'Look up your lot first — then this lists the community organizations, schools, libraries, parks, gardens, public art and historic places around it.',
  /** Before the distance menu: "Search within ¼ mile" */
  'assets.within': 'Search within',
  'assets.quarterMile': '¼ mile (a 5-minute walk)',
  'assets.halfMile': '½ mile (a 10-minute walk)',
  'assets.around': 'Around <strong>{address}</strong> · <a href="{href}">change lot</a>',
  'assets.loading': "Looking up what's around your lot…",
  'assets.onList': { one: '{count} on your list', other: '{count} on your list' },
  'assets.trying': 'Trying…',
  'assets.none': 'None found nearby in City data.',
  /** Link to a group's or place's own website */
  'assets.website': 'website',
  /** Distance column for a place that is on the lot itself */
  'assets.here': 'here',
  'assets.source': 'Source:',
  'assets.more':
    "The workbook also asks about churches, block captains, cultural groups, businesses and the places people like to meet — the City's data doesn't list those, so add them yourself.",
});
