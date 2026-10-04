// npm run i18n:scaffold -- <locale> <chapter-slug>     e.g.  npm run i18n:scaffold -- vi acquire
//
// Starts a translated chapter: copies src/content/steps/<slug>.mdx to
// src/content/i18n/<locale>/steps/<slug>.mdx with
//   - every "##" heading pinned to its English sub-step id:  ## Find a lot {/* #find-a-lot */}
//   - import paths fixed for the deeper folder
//   - `u()` links kept in the language:  export const u = urlFor('<locale>');
//   - theme / element names read from the language's data overlays when the chapter shows them:
//     export const THEME_TEXT = localizeRecord(THEMES, 'themes', '<locale>');  (and ELEMENT_TEXT)
// Then translate the text in place (headings, paragraphs, labels, hints, alt text…) and run
// `npm run i18n:check`. Refuses to overwrite an existing file unless --force.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { isLocale } from '../src/i18n/locales.ts';
import { markHeadings } from '../src/i18n/mdx.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [locale, slug] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const force = process.argv.includes('--force');
if (!isLocale(locale) || locale === 'en' || !slug) {
  console.error('usage: npm run i18n:scaffold -- <locale> <chapter-slug>   (locale: es, zh, vi, ru, ar, ht, fr, pt, sw, ko, tl)');
  process.exit(2);
}
const src = join(root, 'src/content/steps', `${slug}.mdx`);
const out = join(root, 'src/content/i18n', locale, 'steps', `${slug}.mdx`);
if (!existsSync(src)) {
  console.error(`no English chapter ${src}`);
  process.exit(2);
}
if (existsSync(out) && !force) {
  console.error(`${out} exists (use --force to start over)`);
  process.exit(1);
}
let text = markHeadings(readFileSync(src, 'utf8'));
text = text.replace(/(from\s+['"])\.\.\/\.\.\//g, '$1../../../../');
text = text.replace(
  /^import\s*\{\s*u\s*\}\s*from\s*['"]\.\.\/\.\.\/\.\.\/\.\.\/lib\/url['"];?[ \t]*$/m,
  `import { urlFor } from '../../../../i18n/url.ts';\nexport const u = urlFor('${locale}');`,
);
// Names that come from data (themes, elements) are translated once, in src/i18n/data/<locale>/: read
// them through the helpers instead of repeating them in the chapter.
const helpers: string[] = [];
if (/\bTHEMES\b/.test(text) && /from\s+['"][./]+data\/themes['"]/.test(text)) {
  helpers.push(`export const THEME_TEXT = localizeRecord(THEMES, 'themes', '${locale}');`);
  text = text.replace(/\bTHEMES(\[[^\]]+\]|\.\w+)\.(name|blurb)\b/g, 'THEME_TEXT$1.$2');
}
if (/\bELEMENTS\b/.test(text) && /from\s+['"][./]+data\/elements['"]/.test(text)) {
  helpers.push(`export const ELEMENT_TEXT = localizeRecord(ELEMENTS, 'elements', '${locale}');`);
  text = text.replace(/Object\.values\(ELEMENTS\)/g, 'Object.values(ELEMENT_TEXT)');
}
if (helpers.length) {
  const block = [`import { localizeRecord } from '../../../../i18n/data.ts';`, ...helpers].join('\n');
  const anchor = `export const u = urlFor('${locale}');`;
  text = text.includes(anchor) ? text.replace(anchor, `${anchor}\n${block}`) : text.replace(/^(---[\s\S]*?---\n(?:import[^\n]*\n)*)/, `$1${block}\n`);
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, text);
console.log(`wrote ${out}\nNow translate it, then: npm run i18n:check -- --locale ${locale}`);
