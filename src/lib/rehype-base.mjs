// Prefixes root-relative links in markdown/MDX ("/steps/dream/", "/img/x.webp")
// with the site base, so content keeps working when the site is served from a
// sub-folder (GitHub Pages: /park-in-a-truck/). Handles plain elements and
// literal string attributes on MDX JSX elements.

export function rehypeBase(options = {}) {
  const base = String(options.base ?? '/').replace(/\/?$/, '/');
  const fix = (v) => (typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') ? base + v.slice(1) : v);
  const walk = (node) => {
    if (base === '/') return;
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
  return (tree) => walk(tree);
}
