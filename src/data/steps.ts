// The Park in a Truck process, in order. The toolkit introduction comes first,
// then the six workbooks. Chapter text lives in src/content/steps/<slug>.mdx.

export interface StepMeta {
  n: number;
  slug: string;
  title: string;
  /** One line shown on the path and in navigation */
  tagline: string;
  /** Original workbook PDF (served from /downloads/) */
  pdf?: string;
  /** Who this chapter is for, from the workbook's welcome page */
  assumes?: string;
}

export const STEPS: StepMeta[] = [
  {
    n: 0,
    slug: 'start',
    title: 'Start here',
    tagline: 'Why parks matter and how Park in a Truck works.',
    pdf: 'downloads/park-in-a-truck-toolkit.pdf',
  },
  {
    n: 1,
    slug: 'acquire',
    title: 'Acquire',
    tagline: 'Find a lot and get permission to use it.',
    pdf: 'downloads/workbooks/01-acquire.pdf',
    assumes: 'You have read the toolkit and do not yet have a usable lot.',
  },
  {
    n: 2,
    slug: 'organize',
    title: 'Organize',
    tagline: 'Build a park committee and rally your neighbors.',
    pdf: 'downloads/workbooks/02-organize.pdf',
  },
  {
    n: 3,
    slug: 'assess',
    title: 'Assess',
    tagline: 'Get to know your lot: sun, soil, and surroundings.',
    pdf: 'downloads/workbooks/03-assess.pdf',
  },
  {
    n: 4,
    slug: 'dream',
    title: 'Dream',
    tagline: 'Design your park with the park pieces.',
    pdf: 'downloads/workbooks/04-dream.pdf',
  },
  {
    n: 5,
    slug: 'create',
    title: 'Create',
    tagline: 'Build it, one weekend phase at a time.',
    pdf: 'downloads/workbooks/05-create.pdf',
  },
  {
    n: 6,
    slug: 'sustain',
    title: 'Sustain',
    tagline: 'Care for your park, season after season.',
    pdf: 'downloads/workbooks/06-sustain.pdf',
  },
];

export const stepBySlug = (slug: string) => STEPS.find((s) => s.slug === slug);
