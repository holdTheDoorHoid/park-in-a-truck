// Shared geometry for the two wood-topped gabion bench guides (gabion-bench = 4',
// gabion-bench-8 = 8'). Both PDFs build the same design; each entry script passes
// its part labels, lengths and step numbers. Plain Node, no dependencies.
//
// Axes (inches): x = the bench's length left->right as seen from the front, y = up,
// z = toward the viewer. Origin = centre of the footprint at ground level.
//
// The design (shown here right side up — the PDFs build the basket UPSIDE DOWN and
// flip it 180 degrees before filling, so their "top" mesh panel is the bottom here):
//   frame   two long RAILS and two short END pieces, 2x4s on edge (3.5" tall), ends
//           between the rails -> 15 + 2 x 1.5 = 18" wide; the bench length = rail.
//           Cross BRACES of the end-piece length sit between the rails along it.
//           The frame is the basket's top rim: its top edge is flush with the top
//           edge of the mesh, which is stapled to the frame's outside faces.
//   mesh    two long side panels (rail length x 18") and two short end panels
//           (18" x 18", centred on the end piece: 1.5" past each end of the 15"
//           board, covering the rail ends), hog-ringed at the corners; one bottom
//           panel (rail length x 18"). Panels are thin 0.15" boxes (kind "mesh").
//   brace   a piece of spare mesh across the basket width under the middle cross
//           piece ("bracing material", not a cut-list part).
//   fill    stone, from the bottom panel up to the top of the wood frame.
//   top     five 2x4 boards laid flat on the frame: the two outer boards flush with
//           the frame's outside faces, the other three equally spaced between them
//           (5 x 3.5 = 17.5" over 18" -> four 1/8" gaps).

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const T = 1.5; // 2x4 actual thickness
const W = 3.5; // 2x4 actual width
const MESH_T = 0.15; // drawn thickness of a welded-wire panel
const BASKET_H = 18; // mesh panel height
const WIDTH = 18; // frame outside width (15" end piece + 2 x 1.5" rails)
const STONE_INSET = 0.1; // keeps the fill box off the mesh/frame faces (no z-fighting)

const r = (n) => Math.round(n * 1000) / 1000;

/**
 * @param {object} c
 * @param {string} c.slug
 * @param {number} c.length            rail length = bench length (48 or 96)
 * @param {string} c.railLabel         long frame rails and top boards
 * @param {string} c.endLabel          15" end pieces and cross braces
 * @param {number[]} c.braceX          x centres of the cross braces
 * @param {{bottom:string, long:string, short:string}} c.mesh  mesh labels
 * @param {{rails:number, ends:number, braces:number, sideMesh:number, brace:number, bottomMesh:number, fill:number, topEnds:number, topMiddle:number}} c.steps
 * @param {string[]} c.notes
 * @param {object} [c.countOverrides]
 */
export function gabionBench(c) {
  const parts = [];
  const counters = {};
  const push = (idBase, p) => {
    counters[idBase] = (counters[idBase] ?? 0) + 1;
    const out = { id: `${idBase}#${counters[idBase]}`, ...p, size: p.size.map(r), position: p.position.map(r) };
    if (p.from) out.from = p.from.map(r);
    parts.push(out);
  };
  const lumber = (idBase, ref, size, position, step, from) => push(idBase, { ref, kind: 'lumber', size, position, step, from });
  const mesh = (idBase, ref, size, position, step, from) => push(idBase, { ref, kind: 'mesh', size, position, step, from });

  const L = c.length;
  const endLen = WIDTH - 2 * T; // 15
  const yFrame = BASKET_H - W / 2; // frame top flush with the mesh top

  // frame rails (on edge, along x)
  for (const zs of [-1, 1])
    lumber(zs > 0 ? 'front-rail' : 'back-rail', c.railLabel, [L, W, T], [0, yFrame, zs * (WIDTH / 2 - T / 2)], c.steps.rails, [0, 24, 0]);
  // end pieces between the rails
  for (const xs of [-1, 1])
    lumber(xs < 0 ? 'left-end' : 'right-end', c.endLabel, [T, W, endLen], [xs * (L / 2 - T / 2), yFrame, 0], c.steps.ends, [0, 24, 0]);
  // cross braces between the rails
  for (const x of c.braceX) lumber('cross-brace', c.endLabel, [T, W, endLen], [x, yFrame, 0], c.steps.braces, [0, 24, 0]);

  // side mesh, stapled to the outside of the frame
  for (const zs of [-1, 1])
    mesh(zs > 0 ? 'front-mesh' : 'back-mesh', c.mesh.long, [L, BASKET_H, MESH_T], [0, BASKET_H / 2, zs * (WIDTH / 2 + MESH_T / 2)], c.steps.sideMesh, [0, 0, zs * 30]);
  for (const xs of [-1, 1])
    mesh(xs < 0 ? 'left-mesh' : 'right-mesh', c.mesh.short, [MESH_T, BASKET_H, WIDTH], [xs * (L / 2 + MESH_T / 2), BASKET_H / 2, 0], c.steps.sideMesh, [xs * 30, 0, 0]);

  // centre brace of spare mesh, under the middle cross piece, across the full width
  mesh('centre-brace', 'Bracing material (spare 2x2 mesh)', [MESH_T, BASKET_H - W, WIDTH], [0, (BASKET_H - W) / 2, 0], c.steps.brace, [0, 30, 0]);

  // bottom panel (the PDF's "top" piece, hog-ringed on while the basket is upside down)
  mesh('bottom-mesh', c.mesh.bottom, [L, MESH_T, WIDTH], [0, MESH_T / 2, 0], c.steps.bottomMesh, [0, -20, 0]);

  // stone fill, up to the top of the wood frame
  const fillH = BASKET_H - MESH_T - STONE_INSET;
  push('stone-fill', {
    ref: 'Gabion fill material',
    kind: 'stone-fill',
    size: [L - 2 * STONE_INSET, fillH, WIDTH - 2 * STONE_INSET],
    position: [0, MESH_T + fillH / 2, 0],
    step: c.steps.fill,
    from: [0, 40, 0],
  });

  // top boards, flat on the frame
  const gap = (WIDTH - 5 * W) / 4;
  const zs = [0, 1, 2, 3, 4].map((i) => -WIDTH / 2 + W / 2 + i * (W + gap));
  const yTop = BASKET_H + T / 2;
  for (const i of [0, 4]) lumber('top-board', c.railLabel, [L, T, W], [0, yTop, zs[i]], c.steps.topEnds, [0, 30, 0]);
  for (const i of [1, 2, 3]) lumber('top-board', c.railLabel, [L, T, W], [0, yTop, zs[i]], c.steps.topMiddle, [0, 30, 0]);

  const height = BASKET_H + T;
  const model = {
    slug: c.slug,
    units: 'in',
    bounds: { length: r(L + 2 * MESH_T), width: r(WIDTH + 2 * MESH_T), height: r(height) },
    asBuilt: {
      length: L,
      width: WIDTH,
      height: r(height),
      reason: `The 2x4 top boards (1.5") sit on the wood frame, whose top edge is flush with the top of the 18" mesh sides, so the bench is ${r(height)}" tall. The PDF's cover gives 18" for the overall height, which its own parts don't add up to.`,
    },
    view: { azimuthDeg: -32, elevationDeg: 24 },
    ...(c.countOverrides ? { countOverrides: c.countOverrides } : {}),
    notes: [
      `Generated by scripts/guide-models/${c.slug}.mjs (geometry in _gabion-bench.mjs) — edit the script, not this file.`,
      'Shown right side up throughout. The PDF builds the basket upside down (frame on the ground, mesh rising from it) and turns it over before filling, so its "top" mesh panel is the bottom panel here and flies in from below.',
      `Frame: 2x4s on edge forming the basket's top rim, top edge flush with the top of the 18" mesh; the end pieces sit between the rails (15 + 2 x 1.5 = 18"). The mesh is stapled to the frame's outside faces, the 18" end panels centred on the 15" end piece (1.5" past each end, PDF step 2).`,
      `Mesh panels are drawn as ${MESH_T}" thick boxes (kind "mesh"); real 8-gauge welded mesh is a little thicker, so the basket measures a few tenths over the frame's ${L}" x ${WIDTH}".`,
      'Centre brace: "bracing material" (spare mesh, not a cut-list part) under the middle cross piece across the full width; the PDF allows anything from 4" tall up and draws it full height, so it is modelled full height below the cross piece.',
      'Stone fill is one box from the bottom panel to the top of the wood frame ("level with the top of the wood edge"), inset 0.1" from the faces. It overlaps the frame boards by design (stone packs around them).',
      `Top boards: five 2x4s flat on the frame, outer two flush with the frame's outside faces, three equally spaced between: (18 - 5 x 3.5) / 4 = ${r(gap)}" gaps.`,
      'Gravel underlay, hog rings, cable staples and screws are not modelled.',
      ...c.notes,
    ],
    parts,
  };

  const here = dirname(fileURLToPath(import.meta.url));
  const out = join(here, `../../src/data/guides/models/${c.slug}.json`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(model, null, 2) + '\n');
  console.log(`wrote ${out}: ${parts.length} parts`);
  return model;
}
