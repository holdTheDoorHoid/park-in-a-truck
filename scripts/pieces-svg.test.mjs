// Writes one PlanView SVG per piece set and theme for the validation images
// (docs/pieces-validation, made by scripts/pieces_validate.py).
// Skipped unless PIECES_SVG_DIR is set:
//   PIECES_SVG_DIR=/tmp/svg npx vitest run scripts/pieces-svg.test.mjs
import { describe, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { h } from 'preact';
import { renderToString } from 'preact-render-to-string';
import PlanView from '../src/components/pieces/PlanView';
import { PIECE_SETS } from '../src/data/pieces/all';
import { THEME_ORDER } from '../src/data/themes';
import { assemble } from '../src/lib/pieces/assemble';

const dir = process.env.PIECES_SVG_DIR;
describe.skipIf(!dir)('park-piece validation renders', () => {
  it('writes SVGs', () => {
    mkdirSync(dir, { recursive: true });
    for (const s of Object.values(PIECE_SETS)) {
      for (const th of THEME_ORDER) {
        const l = assemble(s, { frame: th, front: th, back: th });
        writeFileSync(join(dir, `${s.id}-${th}.svg`), renderToString(h(PlanView, { layout: l, scale: 16, showPieces: false })));
      }
    }
  });
});
