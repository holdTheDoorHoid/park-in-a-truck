// Area "workbook": the workbook components (src/components/workbook/), the
// chapter page around them (src/pages/steps/[slug].astro), the "mark done"
// toggles and progress text (src/scripts/bind.ts), and the words used when a
// field is filled in from City records (src/lib/autofill.ts).
import { defineMessages } from '../../define.ts';

export default defineMessages('workbook', {
  /** The name a new project starts with, shown in the header until the person renames it */
  'project.default': 'My park',

  'callout.tip': 'Tip',
  'callout.note': 'Note',
  'callout.warning': 'Heads up',
  'callout.contact': 'Ask for help',
  'callout.auto': 'Done for you',
  'callout.site': 'Note from this site, not Park in a Truck',

  'field.choose': 'Choose…',
  'field.auto': '✓ Filled in from City records — type to change it',
  'list.noscript': 'Turn on JavaScript to fill in this table, or print the original workbook page.',
  /** Default name of one row in a table of answers ("+ Add row") */
  'list.row': 'row',
  'list.add': '+ Add {row}',
  'list.fillFirst': 'Fill in the {row} above first, or add something to it.',
  'list.remove': 'Remove',
  'list.removeRow': 'Remove row {n}',
  /** Read out by screen readers after a row is removed: "lot removed." */
  'list.removed': '{row} removed.',
  /** Screen-reader name of one cell: "Address, row 2" */
  'list.cell': '{label}, row {n}',

  'done.mark': 'Mark this step done',
  'done.done': 'Done — nice work!',
  /** Small badge next to a finished sub-step's heading */
  'done.badge': '✓ done',
  'progress.of': '{done} of {total}',
  'progress.done': '{done} of {total} done',
  'progress.total': '{done} of {total} steps done',

  'pdf.label': 'Original workbook page',
  'pdf.page': '(PDF page {page})',
  /** After links to Park in a Truck's own PDFs and files, which exist only in English */
  'file.english': 'in English',
  'figure.credit': 'Image: {credit}',

  'chapter.pdf': '📄 Original workbook (PDF)',
  'chapter.print': '🖨 Print my answers',
  'chapter.toc': 'In this step',
  'chapter.pager': 'Steps',
  'chapter.prev': '← {title}',
  'chapter.prevStep': '← Step {n}: {title}',
  'chapter.next': 'Next: Step {n} — {title} →',
  'chapter.notTranslated': 'This chapter has not been translated yet, so it is shown in English. Your answers are saved the same way in every language.',

  // site-added banner on Assess, Dream and Create (src/components/workbook/LotAgreementNotice.astro)
  'notice.title': 'Site note',
  /** The arrow means "go to"; turn it around for right-to-left languages */
  'notice.lot':
    'You haven\'t recorded permission for your lot yet — you will need it before anyone breaks ground. <a href="{href}">Go to Acquire → Secure your lot</a>.',
  'notice.dismiss': 'Dismiss',

  // Filled in from City records (src/lib/autofill.ts)
  'auto.owner.city': 'City of Philadelphia (public)',
  'auto.owner.landbank': 'Philadelphia Land Bank (public)',
  'auto.owner.pha': 'Philadelphia Housing Authority (public)',
  'auto.owner.redevelopment': 'Philadelphia Redevelopment Authority (public)',
  'auto.owner.other-public': 'Another public agency',
  'auto.owner.private': 'Private owner (person, organization or business)',
  'auto.owner.unknown': 'Unknown',
  'auto.lot.mid-block': 'Mid-block lot',
  'auto.lot.corner': 'Corner lot',
  'auto.lot.alley': 'Breezeway / alley / easement',
  'auto.lot.unknown': 'Not sure',
  'auto.sun.full-sun': 'Full sun all day',
  'auto.sun.mostly-sun': 'Mostly sun',
  'auto.sun.mostly-shade': 'Mostly shade',
  'auto.sun.deep-shade': 'Deep shade all day',
  'auto.kind.interior': 'Mid-block lot',
  'auto.kind.corner-right': 'Corner lot (street right)',
  'auto.kind.corner-left': 'Corner lot (street left)',
  'auto.trees.none': 'No trees',
  'auto.trees.few': 'One or two trees',
  'auto.trees.several': 'Several trees',
  'auto.yes': 'Yes',
  'auto.no': 'No',
  /** Plural forms: the form follows the number of square feet in {n} ("1 ft", "2 ft"); give the forms your language needs */
  'auto.sqft': { one: '{n} sq ft', other: '{n} sq ft' },
  /** Plural forms: the form follows the number of feet in {n} ("1 ft", "2 ft"); give the forms your language needs */
  'auto.ft': { one: '{n} ft', other: '{n} ft' },
  'auto.size': 'Size {size}',
});
