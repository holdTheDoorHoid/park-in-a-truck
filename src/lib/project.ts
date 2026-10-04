// The person's park projects, saved in this browser only (no accounts, no
// server — an interview decision). Several projects can live side by side;
// one is active. Everything else on the site reads and writes through here.

import { atom, computed } from 'nanostores';
import type { DesignState, FieldValue, LotRecord, Project } from './types';

const KEY = 'piat:v1';
const FILE_KIND = 'park-in-a-truck-project';

interface Saved {
  activeId: string;
  projects: Record<string, Project>;
}

const now = () => new Date().toISOString();
const uid = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`).slice(0, 13);

export function blankProject(name = 'My park'): Project {
  const t = now();
  return {
    v: 1,
    id: uid(),
    name,
    createdAt: t,
    updatedAt: t,
    fields: {},
    done: {},
    lot: null,
    candidates: [],
    design: null,
    extra: {},
  };
}

function fresh(): Saved {
  const p = blankProject();
  return { activeId: p.id, projects: { [p.id]: p } };
}

/** Storage can be missing or throw (private windows, blocked site data). */
function load(): Saved {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw) as Saved;
    if (!s?.projects || !Object.keys(s.projects).length) return fresh();
    for (const p of Object.values(s.projects)) normalise(p);
    if (!s.projects[s.activeId]) s.activeId = Object.keys(s.projects)[0]!;
    return s;
  } catch {
    return fresh();
  }
}

/** Fill in fields added after a project was first saved. */
function normalise(p: Project): Project {
  p.fields ??= {};
  p.done ??= {};
  p.lot ??= null;
  p.candidates ??= [];
  p.design ??= null;
  p.extra ??= {};
  return p;
}

export const $saved = atom<Saved>(typeof window === 'undefined' ? fresh() : load());
export const $project = computed($saved, (s) => s.projects[s.activeId]!);
export const $projects = computed($saved, (s) =>
  Object.values(s.projects).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
);
/** False when the browser refuses storage; the UI warns that nothing will be kept. */
export const $storageOk = atom(true);

let timer: ReturnType<typeof setTimeout> | undefined;
function persist(s: Saved) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
      $storageOk.set(true);
    } catch {
      $storageOk.set(false);
    }
  }, 150);
}

if (typeof window !== 'undefined') {
  $saved.listen(persist);
  // Keep two open tabs in step.
  window.addEventListener('storage', (e) => {
    if (e.key === KEY && e.newValue) {
      try {
        $saved.set(JSON.parse(e.newValue));
      } catch {
        /* ignore */
      }
    }
  });
}

function update(fn: (p: Project) => void) {
  const s = $saved.get();
  const p = structuredClone(s.projects[s.activeId]!);
  fn(p);
  p.updatedAt = now();
  $saved.set({ ...s, projects: { ...s.projects, [p.id]: p } });
}

// ---- fields ---------------------------------------------------------------

export function getField(id: string): FieldValue | undefined {
  return $project.get().fields[id];
}
export function setField(id: string, value: FieldValue) {
  update((p) => {
    if (value === '' || value === null || (Array.isArray(value) && value.length === 0)) delete p.fields[id];
    else p.fields[id] = value;
  });
}

// ---- sub-step progress ----------------------------------------------------

export function isDone(substep: string) {
  return Boolean($project.get().done[substep]);
}
export function setDone(substep: string, done: boolean) {
  update((p) => {
    if (done) p.done[substep] = now();
    else delete p.done[substep];
  });
}

// ---- lot, candidates, design, extras ---------------------------------------

export function setLot(lot: LotRecord | null) {
  update((p) => {
    p.lot = lot;
  });
}
export function addCandidate(lot: LotRecord) {
  update((p) => {
    p.candidates = [...p.candidates.filter((c) => c.address !== lot.address), lot];
  });
}
export function removeCandidate(address: string) {
  update((p) => {
    p.candidates = p.candidates.filter((c) => c.address !== address);
  });
}
export function setDesign(design: DesignState | null) {
  update((p) => {
    p.design = design;
  });
}
export function getExtra<T>(key: string): T | undefined {
  return $project.get().extra[key] as T | undefined;
}
export function setExtra(key: string, value: unknown) {
  update((p) => {
    if (value === undefined) delete p.extra[key];
    else p.extra[key] = value;
  });
}

// ---- projects ---------------------------------------------------------------

export function newProject(name: string) {
  const p = blankProject(name.trim() || 'My park');
  const s = $saved.get();
  $saved.set({ activeId: p.id, projects: { ...s.projects, [p.id]: p } });
  return p;
}
export function switchProject(id: string) {
  const s = $saved.get();
  if (s.projects[id]) $saved.set({ ...s, activeId: id });
}
export function renameProject(name: string) {
  update((p) => {
    p.name = name.trim() || p.name;
  });
}
export function deleteProject(id: string) {
  const s = $saved.get();
  const projects = { ...s.projects };
  delete projects[id];
  if (!Object.keys(projects).length) {
    $saved.set(fresh());
    return;
  }
  const activeId = s.activeId === id ? Object.keys(projects)[0]! : s.activeId;
  $saved.set({ activeId, projects });
}

// ---- share file ---------------------------------------------------------------

export function exportProject(id = $saved.get().activeId): { filename: string; blob: Blob } {
  const p = $saved.get().projects[id]!;
  const body = JSON.stringify({ kind: FILE_KIND, exportedAt: now(), project: p }, null, 2);
  const safe = p.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'park';
  return { filename: `${safe}.park.json`, blob: new Blob([body], { type: 'application/json' }) };
}

/** True for a project with no answers, lot, design or anything else recorded yet
 *  — i.e. still exactly what `blankProject()` produced, name aside. */
function isUntouched(p: Project): boolean {
  return (
    Object.keys(p.fields).length === 0 &&
    Object.keys(p.done).length === 0 &&
    p.lot === null &&
    p.candidates.length === 0 &&
    p.design === null &&
    Object.keys(p.extra).length === 0
  );
}

/**
 * Import a share file. A project with the same id is NOT overwritten silently:
 * the import becomes a copy so a committee member's file never clobbers your own work.
 */
export function importProject(text: string): Project {
  const data = JSON.parse(text);
  if (data?.kind !== FILE_KIND || !data.project) throw new Error('This is not a Park in a Truck project file.');
  const p = normalise(data.project as Project);
  const s = $saved.get();
  if (s.projects[p.id]) {
    p.id = uid();
    p.name = `${p.name} (imported)`;
  }
  const projects = { ...s.projects, [p.id]: p };
  // A fresh browser auto-creates one empty "My park" project. Importing into
  // that untouched browser otherwise leaves two identically-named rows in
  // "All projects" — replace the untouched default instead.
  const existingIds = Object.keys(s.projects);
  if (existingIds.length === 1 && existingIds[0] !== p.id && isUntouched(s.projects[existingIds[0]!]!)) {
    delete projects[existingIds[0]!];
  }
  $saved.set({ activeId: p.id, projects });
  return p;
}
