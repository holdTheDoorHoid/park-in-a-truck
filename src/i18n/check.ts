// The translation checker: `npm run i18n:check` (scripts/i18n-check.ts) and
// src/i18n/__tests__/check.test.ts. For every language it reports
//
//   ERRORS (fail the check):   keys / overlay fields that don't exist in English, broken or
//     invented {placeholders}, changed inline HTML, wrong plural forms, chapters whose sub-step ids,
//     Field ids, option values or components differ from English, a page with no /<lang>/ twin,
//     browser code importing the build-only i18n modules.
//   WARNINGS: a {placeholder} the translation leaves out, links that differ from English.
//   PROGRESS: how much is translated, and the English words still to translate, per area.
//
// Plain Node: every import has its extension; no Vite features.

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative, dirname, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { LOCALES, OTHER_LOCALES, isLocale } from './locales.ts';
import type { Catalog, Message, Messages } from './define.ts';
import { placeholdersOf, tagsOf, isPlural } from './format.ts';
import { DATASETS, type DatasetSpec } from './datasets.ts';
import { chapterShape, countWords, type ChapterShape } from './mdx.ts';

export interface Issue {
  level: 'error' | 'warning';
  locale: string;
  file: string;
  message: string;
}

export interface AreaProgress {
  keys: number;
  translated: number;
  wordsLeft: number;
}

export interface LocaleReport {
  locale: string;
  catalogs: Record<string, AreaProgress>;
  chapters: { slug: string; translated: boolean; wordsLeft: number }[];
  data: Record<string, { strings: number; translated: number; wordsLeft: number }>;
  missingKeys: Record<string, string[]>;
}

export interface CheckResult {
  issues: Issue[];
  locales: LocaleReport[];
}

const PLURAL_FORMS = new Set(['zero', 'one', 'two', 'few', 'many', 'other', '=0', '=1']);

function wordsOf(m: Message): number {
  if (typeof m === 'string') return countWords(m.replace(/<[^>]+>|\{\w+\}/g, ' '));
  return countWords(String(m.other).replace(/<[^>]+>|\{\w+\}/g, ' '));
}

function walkFiles(dir: string, ext: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walkFiles(p, ext));
    else if (name.endsWith(ext)) out.push(p);
  }
  return out.sort();
}

async function importDefault<T>(file: string): Promise<T> {
  const mod = (await import(pathToFileURL(file).href)) as { default: T };
  return mod.default;
}

// ---------------------------------------------------------------------------
// Catalogs

async function checkCatalogs(root: string, issues: Issue[], reports: Map<string, LocaleReport>) {
  const dir = join(root, 'src/i18n/messages');
  const english: Record<string, Catalog> = {};
  for (const f of walkFiles(join(dir, 'en'), '.ts')) {
    const c = await importDefault<Catalog>(f);
    if (c.area !== basename(f, '.ts')) issues.push({ level: 'error', locale: 'en', file: relative(root, f), message: `area name "${c.area}" must match the file name` });
    english[c.area] = c;
  }
  for (const d of readdirSync(dir)) {
    if (d === 'en') continue;
    if (!isLocale(d)) issues.push({ level: 'error', locale: d, file: `src/i18n/messages/${d}`, message: `"${d}" is not a language in src/i18n/locales.ts` });
  }
  for (const locale of OTHER_LOCALES) {
    const rep = reports.get(locale)!;
    for (const [area, cat] of Object.entries(english)) {
      const file = join(dir, locale, `${area}.ts`);
      const rel = relative(root, file);
      const own: Messages = existsSync(file) ? await importDefault<Messages>(file) : {};
      const enKeys = Object.keys(cat.messages);
      for (const k of Object.keys(own)) {
        if (!(k in cat.messages)) issues.push({ level: 'error', locale, file: rel, message: `"${k}" is not an English key in ${area} (typo, or the English key was renamed)` });
      }
      let translated = 0;
      let wordsLeft = 0;
      const missing: string[] = [];
      for (const k of enKeys) {
        const en = cat.messages[k]!;
        const tr = own[k];
        if (tr === undefined) {
          wordsLeft += wordsOf(en);
          missing.push(k);
          continue;
        }
        translated++;
        if (isPlural(en) !== isPlural(tr)) {
          issues.push({ level: 'error', locale, file: rel, message: `"${k}": English is ${isPlural(en) ? 'a plural { one, other }' : 'a plain string'}, the translation must be too` });
          continue;
        }
        if (typeof tr === 'string' && !tr.trim()) issues.push({ level: 'error', locale, file: rel, message: `"${k}" is empty (delete the key instead: missing keys fall back to English)` });
        if (isPlural(tr)) {
          for (const f of Object.keys(tr)) if (!PLURAL_FORMS.has(f)) issues.push({ level: 'error', locale, file: rel, message: `"${k}": "${f}" is not a plural form (use zero, one, two, few, many, other)` });
        }
        const enPh = placeholdersOf(en);
        const trPh = placeholdersOf(tr);
        const invented = trPh.filter((p) => !enPh.includes(p));
        const dropped = enPh.filter((p) => !trPh.includes(p));
        if (invented.length) issues.push({ level: 'error', locale, file: rel, message: `"${k}" uses {${invented.join('}, {')}} which English doesn't have — it would show up literally` });
        if (dropped.length) issues.push({ level: 'warning', locale, file: rel, message: `"${k}" leaves out {${dropped.join('}, {')}}` });
        if (tagsOf(en).join() !== tagsOf(tr).join()) issues.push({ level: 'error', locale, file: rel, message: `"${k}" must keep the same HTML tags as English (${tagsOf(en).map((t) => `<${t}>`).join(' ') || 'none'})` });
      }
      rep.catalogs[area] = { keys: enKeys.length, translated, wordsLeft };
      if (missing.length) rep.missingKeys[area] = missing;
    }
    const ldir = join(dir, locale);
    if (existsSync(ldir)) {
      for (const f of readdirSync(ldir)) {
        if (!english[basename(f, '.ts')]) issues.push({ level: 'error', locale, file: `src/i18n/messages/${locale}/${f}`, message: `there is no English area "${basename(f, '.ts')}"` });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Chapters

/** Imports a translated chapter may add: `{ urlFor }` and the data helpers. */
export const CHAPTER_HELPERS = new Set(['urlFor', 'localizeRecord', 'localizeKeyed', 'localizedSteps', 'localizedStep']);
function isHelperImport(clause: string): boolean {
  const m = /^\{([^}]*)\}$/.exec(clause.trim());
  return Boolean(m && m[1]!.split(',').map((s) => s.trim()).filter(Boolean).every((n) => CHAPTER_HELPERS.has(n)));
}

export function compareChapters(en: ChapterShape, tr: ChapterShape, locale: string, rel: string, issues: Issue[]) {
  const err = (message: string) => issues.push({ level: 'error', locale, file: rel, message });
  if (!tr.front.title) err('the frontmatter needs a translated `title:`');
  for (const s of tr.substeps) if (!s.marked) err(`line ${s.line}: "## ${s.text}" needs its English id marker, e.g. {/* #${en.substeps[tr.substeps.indexOf(s)]?.id ?? 'english-id'} */}`);
  const a = en.substeps.map((s) => s.id).join(' · ');
  const b = tr.substeps.map((s) => s.id).join(' · ');
  if (a !== b) err(`sub-steps must be the same ids in the same order as English.\n      English:     ${a}\n      Translation: ${b}`);

  const n = Math.max(en.components.length, tr.components.length);
  for (let i = 0; i < n; i++) {
    const x = en.components[i];
    const y = tr.components[i];
    if (x && y && x.name === y.name && x.props === y.props) continue;
    const show = (c?: { name: string; props: string; line: number }) => (c ? `<${c.name} ${c.props}> (line ${c.line})` : '(nothing)');
    err(`component #${i + 1}${x?.substep ? ` in "${x.substep}"` : ''} differs from English — ids, option values, columns and other non-text props must match.\n      English:     ${show(x)}\n      Translation: ${show(y)}`);
    break; // one is enough; later ones are usually shifted by the same cause
  }
  const enImports = new Set(en.imports);
  for (const imp of tr.imports) {
    // the scaffold swaps `{ u }` from lib/url for `{ urlFor }`; translated chapters may also use the
    // language-aware data helpers (src/i18n/data.ts) for theme, element, plant and step names
    if (!enImports.has(imp) && !isHelperImport(imp)) err(`imports ${imp}, which the English chapter doesn't`);
  }
  for (const [sub, links] of en.links) {
    const mine = tr.links.get(sub) ?? [];
    const lost = links.filter((l) => !mine.includes(l));
    if (lost.length) issues.push({ level: 'warning', locale, file: rel, message: `"${sub}" is missing link(s) the English has: ${lost.join(', ')}` });
  }
}

function checkChapters(root: string, issues: Issue[], reports: Map<string, LocaleReport>) {
  const enDir = join(root, 'src/content/steps');
  const english = new Map<string, ChapterShape>();
  for (const f of walkFiles(enDir, '.mdx')) english.set(basename(f, '.mdx'), chapterShape(readFileSync(f, 'utf8')));
  const i18nDir = join(root, 'src/content/i18n');
  if (existsSync(i18nDir)) {
    for (const d of readdirSync(i18nDir)) if (!isLocale(d) || d === 'en') issues.push({ level: 'error', locale: d, file: `src/content/i18n/${d}`, message: `"${d}" is not a translated language` });
  }
  for (const locale of OTHER_LOCALES) {
    const rep = reports.get(locale)!;
    const dir = join(i18nDir, locale, 'steps');
    for (const [slug, en] of english) {
      const file = join(dir, `${slug}.mdx`);
      const enWords = en.blocks.reduce((s, b) => s + b.words, 0);
      if (!existsSync(file)) {
        rep.chapters.push({ slug, translated: false, wordsLeft: enWords });
        continue;
      }
      const rel = relative(root, file);
      let tr: ChapterShape;
      try {
        tr = chapterShape(readFileSync(file, 'utf8'));
      } catch (e) {
        issues.push({ level: 'error', locale, file: rel, message: `does not parse as MDX: ${(e as Error).message}` });
        rep.chapters.push({ slug, translated: false, wordsLeft: enWords });
        continue;
      }
      compareChapters(en, tr, locale, rel, issues);
      // Paragraphs still word-for-word English (a scaffolded file part-way through translation)
      const enText = new Set(en.blocks.filter((b) => b.text.length >= 25).map((b) => b.text));
      const left = tr.blocks.filter((b) => enText.has(b.text)).reduce((s, b) => s + b.words, 0);
      rep.chapters.push({ slug, translated: true, wordsLeft: left });
    }
    for (const f of walkFiles(dir, '.mdx')) {
      if (!english.has(basename(f, '.mdx'))) issues.push({ level: 'error', locale, file: relative(root, f), message: 'there is no English chapter with this name' });
    }
  }
}

// ---------------------------------------------------------------------------
// Data overlays

type Json = unknown;

/** Every string leaf of `v` as [path, text], path written like the DATASETS field patterns. */
function leaves(v: Json, path: string[] = []): [string[], string][] {
  if (typeof v === 'string') return [[path, v]];
  if (Array.isArray(v)) return v.flatMap((x, i) => leaves(x, [...path, `[${i}]`]));
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => leaves(x, [...path, k]));
  return [];
}

function matchesField(path: string[], pattern: string): boolean {
  // "steps[].imageAlts[]" -> ["steps", "[]", "imageAlts", "[]"]; "*.name" -> ["*", "name"]
  const pat = pattern.replace(/\[\]/g, '.[]').split('.').filter(Boolean);
  if (pat.length !== path.length) return false;
  return pat.every((p, i) => p === '*' || (p === '[]' ? /^\[\d+\]$/.test(path[i]!) : p === path[i]));
}

async function englishData(root: string, spec: DatasetSpec, slug?: string): Promise<Json> {
  const src = join(root, spec.source.replace('*', slug ?? ''));
  if (src.endsWith('.json')) return JSON.parse(readFileSync(src, 'utf8'));
  const mod = (await import(pathToFileURL(src).href)) as Record<string, Json>;
  return mod[spec.exportName!];
}

function keyed(list: Json, key: string): Record<string, Json> {
  return Object.fromEntries(((list as Record<string, Json>[]) ?? []).map((x) => [String(x[key]), x]));
}

/** Compare an overlay with its English data; returns translated / total translatable strings. */
export function checkOverlay(en: Json, overlay: Json, spec: DatasetSpec, locale: string, rel: string, issues: Issue[]) {
  const err = (message: string) => issues.push({ level: 'error', locale, file: rel, message });
  const base = spec.keyBy ? keyed(en, spec.keyBy) : en;
  const fields = spec.keyBy ? spec.fields.map((f) => `*.${f}`) : spec.fields;
  // Overlay structure must exist in English
  const walk = (o: Json, e: Json, path: string[]) => {
    if (o === null) return;
    if (typeof o === 'string') {
      if (typeof e !== 'string') err(`${path.join('.') || '(root)'}: English has no text here`);
      else if (!fields.some((f) => matchesField(path, f))) err(`${path.join('.')}: this field is not translated (only ${fields.join(', ')})`);
      else {
        const lost = placeholdersOf(e).filter((p) => !placeholdersOf(o).includes(p));
        if (lost.length) issues.push({ level: 'warning', locale, file: rel, message: `${path.join('.')}: leaves out {${lost.join('}, {')}}` });
      }
      return;
    }
    if (Array.isArray(o)) {
      if (!Array.isArray(e)) return err(`${path.join('.')}: English is not a list here`);
      if (o.length > e.length) err(`${path.join('.')}: ${o.length} items, English has ${e.length}`);
      o.forEach((x, i) => walk(x, e[i], [...path, `[${i}]`]));
      return;
    }
    if (o && typeof o === 'object') {
      if (!e || typeof e !== 'object' || Array.isArray(e)) return err(`${path.join('.') || '(root)'}: English has no object here`);
      for (const [k, x] of Object.entries(o)) {
        if (!(k in (e as object))) err(`${[...path, k].join('.')}: not in the English data`);
        else walk(x, (e as Record<string, Json>)[k], [...path, k]);
      }
      return;
    }
    err(`${path.join('.')}: overlays carry only text (strings), not ${typeof o}`);
  };
  walk(overlay, base, []);
  const all = leaves(base).filter(([p]) => fields.some((f) => matchesField(p, f)));
  const mine = new Set(leaves(overlay).map(([p]) => p.join('.')));
  const done = all.filter(([p]) => mine.has(p.join('.')));
  const wordsLeft = all.filter(([p]) => !mine.has(p.join('.'))).reduce((s, [, t]) => s + countWords(t), 0);
  return { strings: all.length, translated: done.length, wordsLeft };
}

/** For a "<dir>/*" dataset: the slugs of its English files (src/data/guides/<slug>.json, …). */
function slugsOf(root: string, spec: DatasetSpec): string[] {
  const dir = join(root, dirname(spec.source));
  return walkFiles(dir, '.json')
    .filter((f) => dirname(f) === dir)
    .map((f) => basename(f, '.json'));
}

async function checkData(root: string, issues: Issue[], reports: Map<string, LocaleReport>) {
  const dataDir = join(root, 'src/i18n/data');
  const perFile = new Map(DATASETS.filter((d) => d.name.endsWith('/*')).map((d) => [d.name.slice(0, -1), slugsOf(root, d)]));
  for (const locale of OTHER_LOCALES) {
    const rep = reports.get(locale)!;
    const ldir = join(dataDir, locale);
    const files = walkFiles(ldir, '.json').map((f) => relative(ldir, f).replace(/\.json$/, '').split('\\').join('/'));
    for (const name of files) {
      const known = DATASETS.some((d) => d.name === name) || [...perFile].some(([prefix, slugs]) => name.startsWith(prefix) && slugs.includes(name.slice(prefix.length)));
      if (!known) issues.push({ level: 'error', locale, file: `src/i18n/data/${locale}/${name}.json`, message: 'not a known dataset (see src/i18n/datasets.ts) or no English file with this slug' });
    }
    for (const spec of DATASETS) {
      const prefix = spec.name.endsWith('/*') ? spec.name.slice(0, -1) : null;
      const names = prefix ? perFile.get(prefix)!.map((s) => `${prefix}${s}`) : [spec.name];
      let strings = 0;
      let translated = 0;
      let wordsLeft = 0;
      for (const name of names) {
        const en = await englishData(root, spec, prefix ? name.slice(prefix.length) : undefined);
        const file = join(ldir, `${name}.json`);
        const rel = relative(root, file);
        let overlay: Json = {};
        if (existsSync(file)) {
          try {
            overlay = JSON.parse(readFileSync(file, 'utf8'));
          } catch (e) {
            issues.push({ level: 'error', locale, file: rel, message: `is not valid JSON: ${(e as Error).message}` });
          }
        }
        const r = checkOverlay(en, overlay, spec, locale, rel, issues);
        strings += r.strings;
        translated += r.translated;
        wordsLeft += r.wordsLeft;
      }
      rep.data[spec.name.replace('/*', '')] = { strings, translated, wordsLeft };
    }
  }
}

// ---------------------------------------------------------------------------
// Pages and imports

function checkPages(root: string, issues: Issue[]) {
  const pages = join(root, 'src/pages');
  for (const f of walkFiles(pages, '.astro')) {
    const rel = relative(pages, f).split('\\').join('/');
    if (rel.startsWith('[lang]/') || rel.startsWith('dev/')) continue;
    if (!existsSync(join(pages, '[lang]', rel))) {
      issues.push({ level: 'error', locale: '*', file: `src/pages/${rel}`, message: `has no twin at src/pages/[lang]/${rel}, so it exists in English only (copy any twin in src/pages/[lang]/ and fix the import path)` });
    }
  }
}

function checkImports(root: string, issues: Issue[]) {
  const dirs = ['src/components', 'src/scripts', 'src/lib', 'src/data'].map((d) => join(root, d));
  for (const d of dirs) {
    for (const f of [...walkFiles(d, '.ts'), ...walkFiles(d, '.tsx')]) {
      const s = readFileSync(f, 'utf8');
      if (/from\s+['"][^'"]*i18n\/(astro|server)(\.ts)?['"]/.test(s)) {
        issues.push({ level: 'error', locale: '*', file: relative(root, f), message: 'browser code must not import i18n/astro.ts or i18n/server.ts (they carry every language); use i18n/t.ts, i18n/url.ts, i18n/data.ts' });
      }
    }
  }
}

// ---------------------------------------------------------------------------

export async function checkTranslations(root: string, only?: string[]): Promise<CheckResult> {
  const issues: Issue[] = [];
  const reports = new Map<string, LocaleReport>(
    OTHER_LOCALES.map((l) => [l, { locale: l, catalogs: {}, chapters: [], data: {}, missingKeys: {} }]),
  );
  await checkCatalogs(root, issues, reports);
  checkChapters(root, issues, reports);
  await checkData(root, issues, reports);
  checkPages(root, issues);
  checkImports(root, issues);
  const keep = (l: string) => !only?.length || only.includes(l) || l === '*';
  return { issues: issues.filter((i) => keep(i.locale)), locales: [...reports.values()].filter((r) => keep(r.locale)) };
}

const pct = (a: number, b: number) => (b ? `${Math.floor((a / b) * 100)}%` : '—');

/** The human-readable report. */
export function formatReport(res: CheckResult, opts: { verbose?: boolean } = {}): string {
  const out: string[] = [];
  const name = (code: string) => LOCALES.find((l) => l.code === code)?.english ?? code;
  out.push('Translation check — English is the source; anything missing falls back to English.\n');
  for (const r of res.locales) {
    const cats = Object.values(r.catalogs);
    const keys = cats.reduce((s, c) => s + c.keys, 0);
    const done = cats.reduce((s, c) => s + c.translated, 0);
    const catWords = cats.reduce((s, c) => s + c.wordsLeft, 0);
    const chDone = r.chapters.filter((c) => c.translated).length;
    const chWords = r.chapters.reduce((s, c) => s + c.wordsLeft, 0);
    const dataWords = Object.values(r.data).reduce((s, d) => s + d.wordsLeft, 0);
    const total = catWords + chWords + dataWords;
    out.push(`${r.locale.padEnd(3)} ${name(r.locale).padEnd(22)} ${total.toLocaleString('en-US').padStart(7)} words left`);
    out.push(`      UI text   ${pct(done, keys).padStart(4)}  ` + Object.entries(r.catalogs).map(([a, c]) => `${a} ${c.translated}/${c.keys}`).join(' · '));
    out.push(`      chapters  ${chDone}/${r.chapters.length}  ` + r.chapters.map((c) => `${c.slug}${c.translated ? (c.wordsLeft ? ` (${c.wordsLeft} words still English)` : ' ✓') : ''}`).join(' · '));
    out.push(`      data      ` + Object.entries(r.data).map(([n, d]) => `${n} ${pct(d.translated, d.strings)}`).join(' · '));
    if (opts.verbose) for (const [area, ks] of Object.entries(r.missingKeys)) out.push(`      missing in ${area}: ${ks.join(', ')}`);
  }
  const errors = res.issues.filter((i) => i.level === 'error');
  const warnings = res.issues.filter((i) => i.level === 'warning');
  if (warnings.length) {
    out.push(`\n${warnings.length} warning(s):`);
    for (const w of warnings) out.push(`  ⚠ [${w.locale}] ${w.file}: ${w.message}`);
  }
  out.push(errors.length ? `\n${errors.length} error(s):` : '\nNo errors.');
  for (const e of errors) out.push(`  ✗ [${e.locale}] ${e.file}: ${e.message}`);
  return out.join('\n');
}
