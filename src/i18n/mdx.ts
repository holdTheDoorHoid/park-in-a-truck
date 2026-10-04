// Reads a chapter's MDX the way the checker and the scaffold script need it: its
// sub-step ids, its components and their props, links, and the text per block.
// Runs in plain Node (scripts/i18n-check.ts) — imports carry their extensions.

import { fromMarkdown } from 'mdast-util-from-markdown';
import { mdxjs } from 'micromark-extension-mdxjs';
import { mdxFromMarkdown } from 'mdast-util-mdx';
import { slugify } from '../lib/rehype-substeps.mjs';

// Loose node shape: enough to walk mdast + MDX nodes without depending on their type packages.
interface Node {
  type: string;
  name?: string | null;
  value?: unknown;
  depth?: number;
  url?: string;
  children?: Node[];
  attributes?: { type: string; name?: string; value?: unknown }[];
  data?: { estree?: { body?: { expression?: Est }[] } };
  position?: { start: { line: number } };
}
interface Est {
  type: string;
  value?: unknown;
  elements?: (Est | null)[];
  properties?: { type: string; key: Est; value: Est; computed?: boolean }[];
  name?: string;
  operator?: string;
  argument?: Est;
  quasis?: { value: { cooked: string } }[];
  expressions?: Est[];
  start?: number;
  end?: number;
}

/** Props whose VALUES are words for people and may differ between languages. Everything else must match. */
export const TRANSLATABLE_PROPS = new Set(['label', 'hint', 'placeholder', 'alt', 'caption', 'title', 'desc', 'rowName', 'note', 'unit', 'autoNote', 'aria-label']);
/**
 * Inline formatting a translation may move, add or drop. `bdi` (and a bare `<span dir="ltr">`)
 * keep a phone number, address or size in one left-to-right piece inside right-to-left text.
 */
const INLINE = new Set(['strong', 'em', 'b', 'i', 'br', 'small', 'sup', 'sub', 'code', 'abbr', 'mark', 's', 'u', 'wbr', 'bdi']);
/** A `<span>` whose only attributes are `dir`/`lang` is direction markup, not structure. */
const isDirSpan = (name: string, props: Record<string, unknown>) => name === 'span' && Object.keys(props).length > 0 && Object.keys(props).every((k) => k === 'dir' || k === 'lang');
const ID_MARKER = /^\s*\/\*\s*#([a-z0-9][a-z0-9-]*)\s*\*\/\s*$/;

export interface Frontmatter {
  [k: string]: string;
}

export function splitFrontmatter(source: string): { front: Frontmatter; body: string; bodyLine: number } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!m) return { front: {}, body: source, bodyLine: 1 };
  const front: Frontmatter = {};
  for (const line of m[1]!.split(/\r?\n/)) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (kv) front[kv[1]!] = kv[2]!.replace(/^['"]|['"]$/g, '');
  }
  return { front, body: source.slice(m[0].length), bodyLine: m[0].split('\n').length };
}

/** Plain text of a node, without MDX expressions ({/* comments *\/}, {u('…')}) or imports. */
function textOf(node: Node): string {
  if (node.type === 'text' || node.type === 'inlineCode') return String(node.value ?? '');
  if (node.type === 'mdxTextExpression' || node.type === 'mdxFlowExpression' || node.type === 'mdxjsEsm') return '';
  return (node.children ?? []).map(textOf).join(node.type === 'listItem' ? ' ' : '');
}

export function parseMdx(body: string): Node {
  return fromMarkdown(body, { extensions: [mdxjs()], mdastExtensions: [mdxFromMarkdown()] }) as unknown as Node;
}

/** Literal JS (arrays, objects, strings, numbers) → value; anything else → { $expr: source }. */
function evalEst(e: Est | null | undefined, src: string): unknown {
  if (!e) return null;
  switch (e.type) {
    case 'Literal':
      return e.value;
    case 'ArrayExpression':
      return (e.elements ?? []).map((x) => evalEst(x, src));
    case 'ObjectExpression': {
      const o: Record<string, unknown> = {};
      for (const p of e.properties ?? []) {
        if (p.type !== 'Property' || p.computed) return { $expr: src.slice(e.start, e.end) };
        const k = p.key.type === 'Identifier' ? p.key.name! : String(p.key.value);
        o[k] = evalEst(p.value, src);
      }
      return o;
    }
    case 'TemplateLiteral':
      if (!e.expressions?.length) return e.quasis?.map((q) => q.value.cooked).join('') ?? '';
      return { $expr: src.slice(e.start, e.end) };
    case 'UnaryExpression':
      if (e.operator === '-' && e.argument?.type === 'Literal') return -Number(e.argument.value);
      return { $expr: src.slice(e.start, e.end) };
    default:
      return { $expr: src.slice(e.start, e.end) };
  }
}

function attrValue(a: { value?: unknown }): unknown {
  const v = a.value;
  if (v === null || v === undefined) return true; // <Callout duo /> style boolean
  if (typeof v === 'string') return v;
  const ex = v as { value: string; data?: { estree?: { body?: { expression?: Est }[] } } };
  const expr = ex.data?.estree?.body?.[0]?.expression;
  // estree offsets are relative to the expression's own source text
  return expr ? evalEst(expr, ex.value) : { $expr: ex.value };
}

/** Strip the words out of a prop value, keeping everything a saved answer or layout depends on. */
export function structuralValue(value: unknown, key?: string): unknown {
  if (key && TRANSLATABLE_PROPS.has(key)) return '…';
  if (Array.isArray(value)) {
    // ['Purchase', 'Donation'] and [{ value: 'Purchase', label: 'Compra' }] mean the same saved values
    return value.map((v) => (typeof v === 'string' ? { value: v } : structuralValue(v)));
  }
  if (value && typeof value === 'object' && !('$expr' in value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) {
      if (TRANSLATABLE_PROPS.has(k)) continue;
      out[k] = structuralValue(v, k);
    }
    return out;
  }
  if (value && typeof value === 'object' && '$expr' in value) return `{${String((value as { $expr: string }).$expr).replace(/\s+/g, ' ').trim()}}`;
  return value;
}

export interface ComponentUse {
  /** Component or HTML element name */
  name: string;
  /** Its non-translatable props, as a stable string */
  props: string;
  line: number;
  substep: string | null;
}

export interface ChapterShape {
  front: Frontmatter;
  /** "##" headings in order: their id and whether it came from a {/* #id *\/} marker */
  substeps: { id: string; marked: boolean; text: string; line: number }[];
  components: ComponentUse[];
  /** Every link target (markdown links and href attributes), per sub-step */
  links: Map<string, string[]>;
  /** Text blocks (paragraphs, list items, headings, cells) with their word counts */
  blocks: { text: string; words: number }[];
  imports: string[];
}

export function countWords(text: string): number {
  const s = text.trim();
  if (!s) return 0;
  // CJK has no spaces: count each character as a word-ish unit
  const cjk = (s.match(/[぀-ヿ㐀-鿿가-힯]/g) ?? []).length;
  const rest = s.replace(/[぀-ヿ㐀-鿿가-힯]/g, ' ').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  return cjk + rest;
}

/** The analysis the checker compares between English and a translation. */
export function chapterShape(source: string): ChapterShape {
  const { front, body, bodyLine } = splitFrontmatter(source);
  const tree = parseMdx(body);
  const shape: ChapterShape = { front, substeps: [], components: [], links: new Map(), blocks: [], imports: [] };
  const seen = new Set<string>();
  let current: string | null = null;
  const line = (n: Node) => (n.position?.start.line ?? 0) + bodyLine - 1;
  const addLink = (href: string) => {
    const k = current ?? '(intro)';
    const list = shape.links.get(k) ?? [];
    list.push(href);
    shape.links.set(k, list);
  };

  const walk = (node: Node, inHeading = false) => {
    if (node.type === 'mdxjsEsm') {
      for (const m of String(node.value).matchAll(/^\s*import\s+(.+?)\s+from\s+['"]([^'"]+)['"]/gm)) shape.imports.push(m[1]!.trim());
      return;
    }
    if (node.type === 'heading' && node.depth === 2) {
      const kids = node.children ?? [];
      const marker = kids.find((c) => c.type === 'mdxTextExpression' && ID_MARKER.test(String(c.value)));
      const text = textOf({ ...node, children: kids.filter((c) => c !== marker) }).trim();
      let id = marker ? ID_MARKER.exec(String(marker.value))![1]! : slugify(text);
      while (seen.has(id)) id += '-2';
      seen.add(id);
      current = id;
      shape.substeps.push({ id, marked: Boolean(marker), text, line: line(node) });
    }
    if (node.type === 'link' && node.url) addLink(node.url);
    if ((node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') && node.name) {
      const name = node.name;
      const attrs = node.attributes ?? [];
      const props: Record<string, unknown> = {};
      for (const a of attrs) {
        if (a.type !== 'mdxJsxAttribute' || !a.name) continue;
        const v = attrValue(a);
        if (a.name === 'href' && typeof v === 'string') addLink(v);
        if (a.name === 'href' && v && typeof v === 'object') addLink(String(structuralValue(v)));
        props[a.name] = v;
      }
      const isComponent = /^[A-Z]/.test(name);
      if (isComponent || !(INLINE.has(name) || isDirSpan(name, props))) {
        const kept = Object.fromEntries(
          Object.entries(props)
            .filter(([k]) => isComponent || k === 'class' || k === 'className' || k === 'id' || k === 'src')
            .map(([k, v]) => [k, structuralValue(v, k)])
            .filter(([, v]) => v !== '…'),
        );
        if (name !== 'a') shape.components.push({ name, props: JSON.stringify(kept), line: line(node), substep: current });
      }
    }
    if (!inHeading && ['paragraph', 'heading', 'tableCell', 'listItem'].includes(node.type)) {
      const text = textOf(node).replace(/\s+/g, ' ').trim();
      if (text) shape.blocks.push({ text, words: countWords(text) });
      if (node.type !== 'listItem') {
        for (const c of node.children ?? []) walk(c, true);
        return;
      }
    }
    for (const c of node.children ?? []) walk(c, inHeading);
  };
  walk(tree);
  return shape;
}

/** Add `{/* #id *\/}` to every "##" heading that lacks one (the scaffold script uses this). */
export function markHeadings(source: string): string {
  const shape = chapterShape(source);
  const lines = source.split('\n');
  for (const s of shape.substeps) {
    if (s.marked) continue;
    const i = s.line - 1;
    if (/^##\s/.test(lines[i] ?? '')) lines[i] = `${lines[i]!.replace(/\s+$/, '')} {/* #${s.id} */}`;
  }
  return lines.join('\n');
}
