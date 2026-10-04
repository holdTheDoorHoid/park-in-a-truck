// Area "mypark": what the My park page's script writes (src/pages/my-park/index.astro, the
// <script>): the list of projects, rename / new / delete, opening a project file, the lot summary
// and the answers summary. The page's own headings and paragraphs are in the "pages" area (myPark.*).
import { defineMessages } from '../../define.ts';

export default defineMessages('mypark', {
  /** Name given to a new project when the person leaves the name box empty (they can rename it) */
  'project.newDefault': 'New park',
  /** After the active project's name in the list of projects */
  'list.openNow': '(open)',
  'list.open': 'Open',
  'list.delete': 'Delete',
  /** Screen-reader name of a project's Delete button */
  'list.deleteLabel': 'Delete {name}',
  'delete.confirm': 'Delete “{name}” from this browser? This cannot be undone unless you saved a project file.',
  /** Read out by screen readers after a project is deleted */
  'delete.done': '{name} deleted.',
  'import.opened': 'Opened “{name}”. It is now your active project.',
  'import.notProject': 'This is not a Park in a Truck project file.',

  'lot.address': 'Address',
  'lot.owner': 'Owner',
  'lot.size': 'Lot size',
  'lot.zoning': 'Zoning',
  /** "CITY OF PHILA — City of Philadelphia (public)": the owner's name as the City lists it, then what kind of owner */
  'lot.ownerLine': '{owner} — {kind}',
  /** {width} and {length} are like "14.1 ft", {area} like "701 sq ft" */
  'lot.measured': "{width} × {length} · {area} (measured from the City's parcel outline)",
  /** {frontage} and {depth} are numbers of feet from the City's property record */
  'lot.record': '{frontage} × {depth} ft · {area} (City property record)',
  'lot.recordNoArea': '{frontage} × {depth} ft (City property record)',
  'lot.none': 'No lot chosen yet. Look one up in <a href="{href}">Step 1: Acquire</a>.',
  'answers.none': 'Nothing filled in yet.',
});
