/** @jsxImportSource preact */
// Live preview + printable sheet for the first community meeting (Organize
// step). Reads the saved project through nanostores — never localStorage
// directly — and updates as organize.meeting-* fields and the committee
// list change. "Print flyer" prints only the sheet below, not the page.
import { useStore } from '@nanostores/preact';
import { $project } from '../../lib/project';
import type { FieldValue } from '../../lib/types';

function str(v: FieldValue | undefined): string {
  return typeof v === 'string' ? v : '';
}

function formatDate(v: string): string {
  if (!v) return '';
  const d = new Date(`${v}T00:00:00`);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function printFlyer() {
  const root = document.querySelector<HTMLElement>('.flyer-print-root');
  if (!root) {
    window.print();
    return;
  }
  // Chromium's print/PDF pagination measures descendants' natural (unclipped)
  // extents even through `visibility:hidden`/`overflow:hidden` ancestors, so
  // hiding the rest of the page with CSS alone still printed the flyer's one
  // real page plus several blank ones sized for the hidden content. Detach
  // everything else from the document for the moment of printing instead
  // (not just hide it), leaving the flyer as the page's only content, then
  // put it all back exactly where it was once printing is done.
  const body = document.body;
  const rootAnchor = document.createComment('flyer-print-root-anchor');
  root.replaceWith(rootAnchor);
  const siblings = [...body.children];
  siblings.forEach((el) => el.remove());
  body.appendChild(root);

  const done = () => {
    document.documentElement.classList.remove('printing-flyer');
    window.removeEventListener('afterprint', done);
    root.remove();
    rootAnchor.replaceWith(root);
    siblings.forEach((el) => body.appendChild(el));
  };
  window.addEventListener('afterprint', done);
  document.documentElement.classList.add('printing-flyer');
  // Give the browser a tick to apply the print-only layout before printing.
  requestAnimationFrame(() => window.print());
}

export default function MeetingFlyerIsland() {
  const p = useStore($project);

  const date = formatDate(str(p.fields['organize.meeting-date']));
  const time = str(p.fields['organize.meeting-time']);
  const place = str(p.fields['organize.meeting-place']);
  const purpose = str(p.fields['organize.meeting-purpose']);
  const address = p.lot?.address ?? '';
  const members = (p.fields['organize.committee-members'] as Record<string, string>[] | undefined) ?? [];
  const contact = members.find((m) => m.name || m.phone || m.email);

  const hasAnything = date || time || place || purpose || address || contact;

  return (
    <div class="flyer-widget">
      <div class="flyer-preview-wrap no-print">
        <div class="flyer-preview" aria-hidden="true">
          <FlyerSheet {...{ date, time, place, purpose, address, contact }} />
        </div>
        <div class="flyer-actions">
          {!hasAnything && (
            <p class="muted">
              Fill in the meeting date, time, place and purpose above (and add a committee member) to see your flyer
              take shape.
            </p>
          )}
          <button type="button" class="btn btn-primary" onClick={printFlyer}>
            🖨 Print flyer
          </button>
        </div>
      </div>

      {/* Print-only: a full copy, shown at full size only while printing (see .printing-flyer in global.css). */}
      <div class="flyer-print-root">
        <FlyerSheet {...{ date, time, place, purpose, address, contact }} />
      </div>
    </div>
  );
}

interface SheetProps {
  date: string;
  time: string;
  place: string;
  purpose: string;
  address: string;
  contact?: Record<string, string>;
}

function FlyerSheet({ date, time, place, purpose, address, contact }: SheetProps) {
  return (
    <div class="flyer-sheet">
      <p class="flyer-eyebrow">You're invited</p>
      <h2 class="flyer-headline">Community meeting: a new park for our neighborhood</h2>
      <div class="flyer-rule" />

      <dl class="flyer-facts">
        <div>
          <dt>When</dt>
          <dd>{date || time ? [date, time].filter(Boolean).join(' · ') : '—'}</dd>
        </div>
        <div>
          <dt>Where</dt>
          <dd>{place || '—'}</dd>
        </div>
        {address && (
          <div>
            <dt>The lot</dt>
            <dd>{address}</dd>
          </div>
        )}
      </dl>

      {purpose && (
        <p class="flyer-purpose">{purpose}</p>
      )}

      <div class="flyer-contact">
        <p class="flyer-contact-label">Questions? Contact</p>
        {contact ? (
          <p>
            {contact.name || 'Our park committee'}
            {contact.phone ? ` · ${contact.phone}` : ''}
            {contact.email ? ` · ${contact.email}` : ''}
          </p>
        ) : (
          <p class="muted">Add a committee member above to put a contact here.</p>
        )}
      </div>

      <p class="flyer-credit">Made with the Park in a Truck toolkit · Thomas Jefferson University</p>
    </div>
  );
}
