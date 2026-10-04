// Saved projects from before the park-size fix (usability test 2026-10-04, veteran S2)
// get a size that fits inside the lot when they are opened.
import { describe, expect, it } from 'vitest';
import { blankProject, importProject } from '../project';

describe('saved park size is worked out again on load', () => {
  it('a 61 x 41 ft lot saved as size C opens as size A', () => {
    const p = blankProject('old save');
    p.extra.site = { sizeId: 'C', sizeExact: false, tooSmall: false, tooBig: false, lengthFt: 61.4, widthFt: 40.6, lotKind: 'interior', sunClass: 'mostly-sun' };
    const back = importProject(JSON.stringify({ kind: 'park-in-a-truck-project', project: p }));
    expect(back.extra.site).toMatchObject({ sizeId: 'A', sizeExact: false, lengthFt: 61.4, widthFt: 40.6, lotKind: 'interior', sunClass: 'mostly-sun' });
  });
  it('leaves a correct size and projects without a lot alone', () => {
    const p = blankProject('fine');
    p.extra.site = { sizeId: 'A', sizeExact: true, tooSmall: false, tooBig: false, lengthFt: 50, widthFt: 14 };
    expect(importProject(JSON.stringify({ kind: 'park-in-a-truck-project', project: p })).extra.site).toEqual(p.extra.site);
    const q = blankProject('empty');
    expect(importProject(JSON.stringify({ kind: 'park-in-a-truck-project', project: q })).extra).toEqual({});
  });
});
