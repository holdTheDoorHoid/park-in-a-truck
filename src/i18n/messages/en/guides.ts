// Area "guides": the build-guide pages (src/pages/build/, src/components/guides/).
// The guides' own text (steps, materials, tools…) is DATA, translated in
// src/i18n/data/<locale>/guides/<slug>.json — not here.
import { defineMessages } from '../../define.ts';

export default defineMessages('guides', {
  'cat.seating': 'Seating',
  'cat.tables': 'Tables & work surfaces',
  'cat.planters': 'Planters',
  'cat.structures': 'Structures',

  'crumb': 'Build guides',
  'heroAlt': '{title}, assembled',
  /** Overall size, e.g. 4' L × 1'-6.5" W × 2'-10" H (L = length, W = width, H = height) */
  'dims': '{length} L × {width} W × {height} H',
  'glance.size': 'Size',
  'glance.time': 'Time',
  'glance.people': 'People',
  'glance.skill': 'Skill',
  'glance.cost': 'Cost',
  'asBuilt': 'Built from these parts it comes out {size}.',
  'pdf': 'Original PDF',
  'print': '🖨 Print',

  'need': 'What you need',
  'materials': 'Materials & hardware',
  'tools': 'Tools',
  'cut': 'Cut list',
  'cut.part': 'Part',
  'cut.qty': 'Qty',
  'cut.stock': 'Stock',
  'cut.length': 'Length',
  'cut.notes': 'Notes',
  'siteNote': 'Note from this site, not Park in a Truck:',
  'steps': 'Steps',
  'step': 'Step {n}',
  'model': '3D model of the {title}',
  'finishing': 'Finishing',
  'safety': 'Before you begin',
  'links': 'Supplier & resource links',
  'source': 'Source: {pages}',
  'download': 'Download the {title} PDF',
  'pager': 'Guides',
  'close': 'Close',
  'notTranslated': 'This guide has not been translated yet, so it is shown in English.',

  'index.description':
    "Step-by-step, Ikea-style assembly instructions for Park in a Truck's benches, tables, planters, gabion seating, a shade structure and a stage.",
  'index.lede':
    "Now it's time to see how the park elements are built. Some elements have custom instructions, or assemblies — step-by-step guides to help you build them. A bench, for example, comes with an Ikea-like set of building instructions. Other elements come with a design or a suggested way to build them from pre-tested instructions. Still others are simply off-the-shelf products.",
  'index.prose':
    'Below are the thirteen elements Park in a Truck publishes custom assembly instructions for. Pick one to see its full materials list, cut list and numbered steps with the original diagrams — or download the original PDF. Check off materials and tools as you gather them; your checkmarks are saved in this browser.',
});
