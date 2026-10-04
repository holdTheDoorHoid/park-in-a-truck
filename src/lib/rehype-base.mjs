// Prefixes root-relative links in markdown/MDX ("/steps/dream/", "/img/x.webp")
// with the site base, so content keeps working when the site is served from a
// sub-folder (GitHub Pages: /park-in-a-truck/). Handles plain elements and
// literal string attributes on MDX JSX elements.
//
// Translated content (src/content/i18n/<lang>/…) also keeps its page links in
// its own language: "/steps/dream/" -> "/<lang>/steps/dream/". Files (anything
// with an extension: images, PDFs) stay shared.

const I18N_FILE = /[\\/]content[\\/]i18n[\\/]([a-z]{2,3}(?:-[a-z0-9]+)?)[\\/]/i;
const ASSET = /\.[a-z0-9]{1,5}$/i;

export function rehypeBase(options = {}) {
  const base = String(options.base ?? '/').replace(/\/?$/, '/');
  return (tree, file) => {
    const path = file?.path || file?.history?.[0] || '';
    const lang = I18N_FILE.exec(path)?.[1];
    if (base === '/' && !lang) return;
    const fix = (v) => {
      if (typeof v !== 'string' || !v.startsWith('/') || v.startsWith('//')) return v;
      const rest = v.slice(1);
      const isAsset = ASSET.test(rest.split(/[?#]/)[0]);
      return base + (lang && !isAsset && !rest.startsWith(`${lang}/`) ? `${lang}/` : '') + rest;
    };
    const walk = (node) => {
      if (node.type === 'element' && node.properties) {
        if ('href' in node.properties) node.properties.href = fix(node.properties.href);
        if ('src' in node.properties) node.properties.src = fix(node.properties.src);
      }
      if ((node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') && Array.isArray(node.attributes)) {
        for (const a of node.attributes) {
          if ((a.name === 'href' || a.name === 'src') && typeof a.value === 'string') a.value = fix(a.value);
        }
      }
      for (const c of node.children || []) walk(c);
    };
    walk(tree);
  };
}
