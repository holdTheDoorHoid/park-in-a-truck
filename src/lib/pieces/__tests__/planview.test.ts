import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { renderToString } from 'preact-render-to-string';
import PlanView from '../../../components/pieces/PlanView';
import { getPieceSet } from '../../../data/pieces/all';
import { assemble } from '../assemble';

describe('PlanView', () => {
  it('renders an assembled park as one SVG glyph per item', () => {
    const l = assemble(getPieceSet('D', 'corner-right'), { frame: 'event', front: 'event', back: 'event' });
    const svg = renderToString(h(PlanView, { layout: l, labels: true, selectedId: l.items[0]!.id }));
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('viewBox="-2.5 -2.5 93 37"');
    expect(svg.match(/data-id="/g)).toHaveLength(l.items.length);
    expect(svg).toContain('EVENT FRAME');
    expect(svg).toContain('STREET');
  });
  it('makes items focusable buttons only when selectable', () => {
    const l = assemble(getPieceSet('A', 'interior'), { frame: 'edible', front: 'edible', back: 'edible' });
    expect(renderToString(h(PlanView, { layout: l }))).not.toContain('role="button"');
    expect(renderToString(h(PlanView, { layout: l, onSelect: () => {} }))).toContain('role="button"');
  });
});
