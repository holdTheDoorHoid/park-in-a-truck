// importProject dedup logic (fix-site-ux, block-captain F5): importing a
// project file into a browser that only has the untouched auto-created
// default should replace that default, not sit beside it as a second,
// identically-named "My park" row.
//
// $saved is a module-level singleton, so each test re-imports the module
// fresh (vi.resetModules) to start from a clean, in-memory `fresh()` state —
// this runs in Node (no jsdom), so project.ts's window-gated localStorage
// code never runs and everything stays purely in-memory.
import { describe, expect, it, vi } from 'vitest';
import type * as ProjectModule from '../project';

async function freshModule(): Promise<typeof ProjectModule> {
  vi.resetModules();
  return import('../project');
}

function fileWith(id: string, overrides: Partial<Record<string, unknown>> = {}) {
  return JSON.stringify({
    kind: 'park-in-a-truck-project',
    exportedAt: '2026-10-04T00:00:00.000Z',
    project: {
      v: 1,
      id,
      name: 'My park',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      fields: {},
      done: {},
      lot: null,
      candidates: [],
      design: null,
      extra: {},
      ...overrides,
    },
  });
}

describe('importProject', () => {
  it('replaces the untouched default project a fresh browser auto-creates', async () => {
    const { $saved, importProject } = await freshModule();
    expect(Object.keys($saved.get().projects)).toHaveLength(1);

    const imported = importProject(fileWith('imported-1', { fields: { 'acquire.notes': 'hi' } }));

    const after = $saved.get();
    expect(Object.keys(after.projects)).toEqual([imported.id]);
    expect(after.activeId).toBe(imported.id);
  });

  it('keeps the default project alongside imports once the browser has other projects', async () => {
    const { $saved, importProject, newProject } = await freshModule();
    newProject('Backup lot');
    expect(Object.keys($saved.get().projects)).toHaveLength(2);

    importProject(fileWith('imported-2'));
    expect(Object.keys($saved.get().projects)).toHaveLength(3);
  });

  it('keeps the default if it already has answers recorded', async () => {
    const { $saved, importProject, setField } = await freshModule();
    setField('acquire.notes', 'already working on something');
    expect(Object.keys($saved.get().projects)).toHaveLength(1);

    importProject(fileWith('imported-3'));
    expect(Object.keys($saved.get().projects)).toHaveLength(2);
  });

  it('still copies rather than overwrites when the imported id collides with an existing project', async () => {
    const { $saved, importProject } = await freshModule();
    // Non-empty so the dedup-the-default behaviour above doesn't also kick in
    // here — this test is only about the id-collision path.
    const first = importProject(fileWith('same-id', { name: 'Original', fields: { 'acquire.notes': 'hi' } }));
    expect(Object.keys($saved.get().projects)).toEqual([first.id]);

    const second = importProject(fileWith('same-id', { name: 'Original' }));
    expect(second.id).not.toBe(first.id);
    expect(second.name).toBe('Original (imported)');
    expect(Object.keys($saved.get().projects).sort()).toEqual([first.id, second.id].sort());
  });
});
