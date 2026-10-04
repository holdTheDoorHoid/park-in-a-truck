// Turns every `##` heading in a step chapter (src/content/steps/*.mdx) into a
// trackable sub-step:
//
//   <section class="substep" id="<slug>" data-substep="<step>/<slug>">
//     <h2>…</h2> …content…
//     <div class="substep-done" data-done="<step>/<slug>"></div>
//   </section>
//
// The empty .substep-done div is filled in by src/scripts/bind.ts with a
// "Mark this step done" toggle. Authors only write plain markdown headings.
//
// Other content (guides, resources) is left untouched.

const STEP_FILE = /[\\/]content[\\/]steps[\\/]([a-z0-9-]+)\.mdx?$/;

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function textOf(node) {
  if (!node) return '';
  if (node.type === 'text') return node.value;
  return (node.children || []).map(textOf).join('');
}

export function rehypeSubsteps() {
  return (tree, file) => {
    const path = file?.path || file?.history?.[0] || "";
    const m = STEP_FILE.exec(path);
    if (!m) return;
    const step = m[1];

    const out = [];
    let current = null;
    const seen = new Set();
    for (const node of tree.children) {
      const isH2 = node.type === 'element' && node.tagName === 'h2';
      if (isH2) {
        if (current) out.push(current);
        let id = node.properties?.id || slugify(textOf(node));
        while (seen.has(id)) id += '-2';
        seen.add(id);
        // The section carries the id; the heading gets a derived one so the
        // anchor still lands on the heading text.
        node.properties = { ...(node.properties || {}), id: `${id}-title` };
        current = {
          type: 'element',
          tagName: 'section',
          properties: { className: ['substep'], id, dataSubstep: `${step}/${id}` },
          children: [node],
        };
      } else if (current) {
        current.children.push(node);
      } else {
        out.push(node);
      }
    }
    if (current) out.push(current);
    for (const sec of out) {
      if (sec.type === 'element' && sec.tagName === 'section' && sec.properties?.dataSubstep) {
        sec.children.push({
          type: 'element',
          tagName: 'div',
          properties: { className: ['substep-done'], dataDone: sec.properties.dataSubstep },
          children: [],
        });
      }
    }
    tree.children = out;
  };
}
