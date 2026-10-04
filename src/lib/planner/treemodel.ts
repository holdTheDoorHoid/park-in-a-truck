// Trees in the sun study and the 3D view (shadows workstream, 2026-10-04): when the
// leaves are out, which trees keep them all year, and where a crown sits. Pure (no DOM,
// no three) so the sun maths, the Web Worker and the scene all share one model.
//
// Leaf season for Philadelphia (documented assumption):
// - Leaves come out between Apr 1 and May 1 (about half out by mid-April). Pennsylvania's
//   maples leaf out from late March, oaks, cherries and birches from mid-April to early May.
// - Leaves fall between Oct 25 and Nov 20. Fall colour peaks in the Philadelphia area around
//   Halloween, a little into early November.
// Leafing is linear across each window. Evergreens keep their leaves or needles all year.
//
// How much a crown blocks (documented assumption):
// - In leaf: 60% of direct sun (CROWN_BLOCKING in sunhours.ts; the crown is a generous
//   sphere, so less than the 70-90% measured right under a dense canopy).
// - Bare: 30%. Heisler (1986, USDA Forest Service) measured a sugar maple cutting the sun
//   in its shade by about 80% in leaf and nearly 40% bare; bare branches block about half as
//   much as leaves, so the planner counts half of 60%.

const YEAR = 2026;

export const LEAF_SEASON = {
  /** 'MM-DD' — bare before, full leaf after `outTo` */
  outFrom: '04-01',
  outTo: '05-01',
  /** full leaf before `dropFrom`, bare after `dropTo` */
  dropFrom: '10-25',
  dropTo: '11-20',
} as const;

/** Fall colour in the 3D view only (not in the sun maths): leaves turn from Oct 5 to Oct 25. */
const AUTUMN = { from: '10-05', to: '10-25' } as const;

export function dayOfYear(month: number, day: number): number {
  return Math.round((Date.UTC(YEAR, month - 1, day) - Date.UTC(YEAR, 0, 1)) / 86400000) + 1;
}

function doyOf(mmdd: string): number {
  const [m, d] = mmdd.split('-').map(Number) as [number, number];
  return dayOfYear(m, d);
}

function ramp(x: number, a: number, b: number): number {
  return x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a);
}

/** How far into leaf a deciduous tree is on a date: 0 = bare, 1 = full leaf. */
export function leafFraction(month: number, day: number): number {
  const n = dayOfYear(month, day);
  if (n < doyOf(LEAF_SEASON.dropFrom)) return ramp(n, doyOf(LEAF_SEASON.outFrom), doyOf(LEAF_SEASON.outTo));
  return 1 - ramp(n, doyOf(LEAF_SEASON.dropFrom), doyOf(LEAF_SEASON.dropTo));
}

/** 0..1 how far the leaves have turned (3D view colour only). */
export function autumnTint(month: number, day: number): number {
  const n = dayOfYear(month, day);
  return ramp(n, doyOf(AUTUMN.from), doyOf(AUTUMN.to)) * (n <= doyOf(LEAF_SEASON.dropTo) ? 1 : 0);
}

/** Plain words for the trees on a date. */
export function leafWords(month: number, day: number): string {
  const f = leafFraction(month, day);
  if (f >= 1) return autumnTint(month, day) > 0.3 ? 'Leaves are turning' : 'Trees are in leaf';
  if (f <= 0) return 'Trees are bare (evergreens keep their leaves)';
  return dayOfYear(month, day) < 183 ? 'Leaves are coming out' : 'Leaves are falling';
}

// ---- evergreen or not, from the City tree inventory's species name ------------------

export interface TreeLook {
  /** keeps its leaves or needles all winter */
  evergreen: boolean;
  /** needle tree drawn as a cone (pines, spruces, firs…; also larch and bald cypress, which drop their needles) */
  conifer: boolean;
}

export const BROADLEAF: TreeLook = { evergreen: false, conifer: false };

/** Needle trees that keep their needles. */
const EVERGREEN_CONIFER_GENERA = new Set([
  'pinus', 'picea', 'abies', 'tsuga', 'thuja', 'juniperus', 'chamaecyparis', 'cedrus', 'cryptomeria',
  'taxus', 'pseudotsuga', 'cupressus', 'sequoia', 'sequoiadendron', 'sciadopitys', 'thujopsis', 'platycladus',
  'cephalotaxus', 'cunninghamia', 'calocedrus', 'casuarina',
]);
/** Needle trees that drop their needles in fall. */
const DECIDUOUS_CONIFER_GENERA = new Set(['larix', 'taxodium', 'metasequoia', 'glyptostrobus', 'pseudolarix']);
/** Broadleaf trees that keep their leaves (genus, or "genus epithet"). */
const EVERGREEN_BROADLEAF = new Set([
  'ilex', 'magnolia grandiflora', 'prunus caroliniana', 'prunus laurocerasus', 'quercus virginiana',
  'buxus', 'rhododendron', 'kalmia', 'eriobotrya', 'osmanthus',
]);

const DECIDUOUS_CONIFER_WORDS = /\b(larch|tamarack|bald ?cypress|pond ?cypress|dawn redwood)\b/;
const EVERGREEN_CONIFER_WORDS = /\b(pine|spruce|fir|hemlock|cedar|redcedar|arborvitae|juniper|cypress|yew|redwood|sequoia)\b/;
const EVERGREEN_BROADLEAF_WORDS = /\b(holly|southern magnolia|laurel cherry|cherry ?laurel|live oak|boxwood|rhododendron|mountain laurel|loquat)\b/;
const NOT_EVERGREEN_WORDS = /\b(deciduous holly|winterberry|possumhaw|chinese toon)\b/;

/**
 * Is this tree evergreen, and is it a needle tree? Works with the inventory's
 * "PINUS STROBUS - EASTERN WHITE PINE" names and with plain common names ("Eastern White Pine").
 * Unknown or missing names count as broadleaf deciduous (most of Philadelphia's street trees).
 */
export function treeLook(species: string | null | undefined): TreeLook {
  const s = (species ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!s || /^unknown/.test(s)) return BROADLEAF;
  const parts = s.split(/\s[-–]\s/);
  const sci = parts.length > 1 ? parts[0]! : '';
  const common = parts.length > 1 ? parts.slice(1).join(' ') : s;
  if (NOT_EVERGREEN_WORDS.test(common)) return BROADLEAF;
  const words = (sci || s).split(' ').filter((w) => w !== 'x');
  const genus = words[0] ?? '';
  const binomial = words.length > 1 ? `${genus} ${words[1]}` : genus;
  if (DECIDUOUS_CONIFER_GENERA.has(genus)) return { evergreen: false, conifer: true };
  if (EVERGREEN_CONIFER_GENERA.has(genus)) return { evergreen: true, conifer: true };
  if (EVERGREEN_BROADLEAF.has(genus) || EVERGREEN_BROADLEAF.has(binomial)) return { evergreen: true, conifer: false };
  // A recognised scientific name that isn't in the lists above is a broadleaf deciduous tree
  // ("CEDRELLA SINENSIS - CHINESE TOON" must not match "cedar").
  if (sci) return BROADLEAF;
  if (DECIDUOUS_CONIFER_WORDS.test(common)) return { evergreen: false, conifer: true };
  if (EVERGREEN_BROADLEAF_WORDS.test(common)) return { evergreen: true, conifer: false };
  if (EVERGREEN_CONIFER_WORDS.test(common)) return { evergreen: true, conifer: true };
  return BROADLEAF;
}

/**
 * A tree on the lot (existing conditions): the person's choice wins; otherwise the City's
 * species name decides; trees added by hand without a choice are deciduous.
 */
export function existingTreeLook(e: { leafHabit?: 'deciduous' | 'evergreen'; species?: string | null }): TreeLook {
  const fromName = treeLook(e.species);
  if (e.leafHabit === 'evergreen') return fromName.evergreen ? fromName : { evergreen: true, conifer: true };
  if (e.leafHabit === 'deciduous') return { evergreen: false, conifer: fromName.conifer && !fromName.evergreen };
  return fromName;
}

// ---- where a crown sits ---------------------------------------------------------------

/**
 * A tree's crown as the sun study counts it: a sphere of radius `crownR` whose centre is
 * `centerFt` above the ground at the trunk. The 3D view draws the crown in the same place.
 */
export function crownCenterFt(heightFt: number, crownR: number): number {
  return Math.max(crownR + 4, heightFt - crownR);
}
