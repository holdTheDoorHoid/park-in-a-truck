/** @jsxImportSource preact */
// Live preview + printable sheet for the first community meeting (Organize
// step). Reads the saved project through nanostores — never localStorage
// directly — and updates as organize.meeting-* fields and the committee
// list change. "Print flyer" prints only the sheet below, not the page.
//
// Languages: the flyer prints in any site language, or two side by side (e.g. English +
// Spanish), whatever language the page is read in. The choice is saved with the project
// (extra.flyer). Every language's "flyer" catalog is bundled here (they are tiny).
import { useStore } from '@nanostores/preact';
import { $project, setExtra } from '../../lib/project';
import type { FieldValue } from '../../lib/types';
import flyerEn from '../../i18n/messages/en/flyer.ts';
import { getT } from '../../i18n/t.ts';
import { interpolate, formatDate } from '../../i18n/format.ts';
import { LOCALES, localeInfo, isLocale, type Locale } from '../../i18n/locales.ts';
import type { Messages, Vars } from '../../i18n/define.ts';
import './flyer-i18n.css';

type FlyerKey = keyof typeof flyerEn.messages;
const SHEET_KEYS = (Object.keys(flyerEn.messages) as FlyerKey[]).filter((k) => !k.startsWith('ui.'));

const catalogs: Partial<Record<string, Messages>> = Object.fromEntries(
  Object.entries(import.meta.glob<Messages>('../../i18n/messages/*/flyer.ts', { eager: true, import: 'default' })).map(([f, m]) => [
    /messages\/([^/]+)\/flyer\.ts$/.exec(f)![1],
    m,
  ]),
);

/** A language can print the flyer once every sheet word is translated. */
const ready = (l: Locale) => l === 'en' || SHEET_KEYS.every((k) => catalogs[l]?.[k] !== undefined);

/** Sheet text in any language, falling back to English. */
function sheetT(locale: Locale) {
  const own = locale === 'en' ? undefined : catalogs[locale];
  return (key: FlyerKey, vars?: Vars) => interpolate(locale, own?.[key] ?? flyerEn.messages[key], vars);
}

interface FlyerPrefs {
  langs?: string[];
  purpose2?: string;
}

function str(v: FieldValue | undefined): string {
  return typeof v === 'string' ? v : '';
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
  const t = getT(undefined, flyerEn);

  const prefs = (p.extra.flyer as FlyerPrefs | undefined) ?? {};
  const pageLang: Locale = ready(t.locale) ? t.locale : 'en';
  const [want1, want2] = prefs.langs ?? [];
  const first: Locale = isLocale(want1) && ready(want1) ? want1 : pageLang;
  const second: Locale | null = isLocale(want2) && ready(want2) && want2 !== first ? want2 : null;
  const save = (next: FlyerPrefs) => setExtra('flyer', { ...prefs, ...next });

  const rawDate = str(p.fields['organize.meeting-date']);
  const time = str(p.fields['organize.meeting-time']);
  const place = str(p.fields['organize.meeting-place']);
  const purpose = str(p.fields['organize.meeting-purpose']);
  const address = p.lot?.address ?? '';
  const members = (p.fields['organize.committee-members'] as Record<string, string>[] | undefined) ?? [];
  const contact = members.find((m) => m.name || m.phone || m.email);

  const hasAnything = rawDate || time || place || purpose || address || contact;
  const common = { rawDate, time, place, address, contact };
  const sheet = () => second ? (
    <div class="flyer-sheet flyer-two">
      <div class="flyer-cols">
        <FlyerColumn locale={first} purpose={purpose} {...common} />
        <FlyerColumn locale={second} purpose={prefs.purpose2?.trim() || purpose} {...common} />
      </div>
      <p class="flyer-credit">{sheetT(first)('credit')}</p>
    </div>
  ) : (
    <div class="flyer-sheet" lang={localeInfo(first).lang} dir={localeInfo(first).dir}>
      <FlyerColumn locale={first} purpose={purpose} {...common} />
      <p class="flyer-credit">{sheetT(first)('credit')}</p>
    </div>
  );

  const option = (l: (typeof LOCALES)[number]) => (
    <option value={l.code} disabled={!ready(l.code)} lang={l.lang}>
      {ready(l.code) ? l.name : t('ui.notReady', { language: l.name })}
    </option>
  );

  return (
    <div class="flyer-widget">
      <div class="flyer-preview-wrap no-print">
        <div class="flyer-preview" aria-hidden="true">
          {sheet()}
        </div>
        <div class="flyer-actions">
          {!hasAnything && <p class="muted">{t('ui.empty')}</p>}
          <div class="flyer-langs">
            <label class="field">
              <span class="field-label">{t('ui.language')}</span>
              <select value={first} onChange={(e) => save({ langs: [e.currentTarget.value, ...(second ? [second] : [])] })}>
                {LOCALES.map(option)}
              </select>
            </label>
            <label class="field">
              <span class="field-label">{t('ui.second')}</span>
              <select value={second ?? ''} onChange={(e) => save({ langs: e.currentTarget.value ? [first, e.currentTarget.value] : [first] })}>
                <option value="">{t('ui.none')}</option>
                {LOCALES.filter((l) => l.code !== first).map(option)}
              </select>
            </label>
            {second && (
              <label class="field">
                <span class="field-label">{t('ui.purpose2', { language: localeInfo(second).name })}</span>
                <textarea rows={3} lang={localeInfo(second).lang} dir={localeInfo(second).dir} value={prefs.purpose2 ?? ''} onInput={(e) => save({ purpose2: e.currentTarget.value })} />
                <span class="field-hint">{t('ui.purpose2Hint')}</span>
              </label>
            )}
          </div>
          <button type="button" class="btn btn-primary" onClick={printFlyer}>
            {t('ui.print')}
          </button>
        </div>
      </div>

      {/* Print-only: a full copy, shown at full size only while printing (see .printing-flyer in global.css). */}
      <div class="flyer-print-root">{sheet()}</div>
    </div>
  );
}

interface ColumnProps {
  locale: Locale;
  rawDate: string;
  time: string;
  place: string;
  purpose: string;
  address: string;
  contact?: Record<string, string>;
}

function FlyerColumn({ locale, rawDate, time, place, purpose, address, contact }: ColumnProps) {
  const ft = sheetT(locale);
  const info = localeInfo(locale);
  const date = rawDate ? formatDate(locale, rawDate, 'full') : '';
  return (
    <div class="flyer-col" lang={info.lang} dir={info.dir}>
      <p class="flyer-eyebrow">{ft('eyebrow')}</p>
      <h2 class="flyer-headline">{ft('headline')}</h2>
      <div class="flyer-rule" />

      <dl class="flyer-facts">
        <div>
          <dt>{ft('when')}</dt>
          <dd>{date || time ? [date, time].filter(Boolean).join(' · ') : '—'}</dd>
        </div>
        <div>
          <dt>{ft('where')}</dt>
          <dd>{place || '—'}</dd>
        </div>
        {address && (
          <div>
            <dt>{ft('lot')}</dt>
            <dd dir="auto">{address}</dd>
          </div>
        )}
      </dl>

      {purpose && <p class="flyer-purpose" dir="auto">{purpose}</p>}

      <div class="flyer-contact">
        <p class="flyer-contact-label">{ft('contact')}</p>
        {contact ? (
          <p dir="auto">
            {contact.name || ft('committee')}
            {contact.phone ? ` · ${contact.phone}` : ''}
            {contact.email ? ` · ${contact.email}` : ''}
          </p>
        ) : (
          <p class="muted">{getT(undefined, flyerEn)('ui.noContact')}</p>
        )}
      </div>
    </div>
  );
}
