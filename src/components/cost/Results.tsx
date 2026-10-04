/** @jsxImportSource preact */
// The estimate (cost by category, grand total) and the spreadsheet's order list.
// Words come from the cost catalog (src/i18n/messages/en/cost.ts) through `t`.

import { useState } from 'preact/hooks';
import { keptAssumptions } from '../../lib/cost/corrections';
import { GUIDES } from '../../lib/cost/guides';
import { categories, type CategoryMeta, type CostLine, type Estimate } from '../../lib/cost/model';
import type { OrderListRow } from '../../lib/cost/orderList';
import { CONTINGENCY } from '../../lib/cost/prices';
import { join, money, percent, qtyUnit, type CostT } from '../../lib/cost/text';
import { urlFor } from '../../i18n/url.ts';

function Where({ t, link, vendor }: { t: CostT; link?: string; vendor?: string }) {
  if (!link) return null;
  return (
    <a class="ce-where" href={link} target="_blank" rel="noopener noreferrer">
      {vendor ?? t('ui.whereToBuy')}
      <span aria-hidden="true"> ↗</span>
      <span class="visually-hidden"> {t('ui.newTab')}</span>
    </a>
  );
}

/** Quantity cell: "3 ea.", or "15% of $4,321.87" for percentage lines, or blank for repeats. */
function qtyText(t: CostT, l: CostLine): string {
  if (l.unit !== '') return qtyUnit(t, l.qty, l.unit);
  return l.qty === 1 ? '' : t('ui.percentOf', { percent: percent(t, l.qty), amount: money(t, l.unitPrice) });
}

function LineRow({ t, l }: { t: CostT; l: CostLine }) {
  return (
    <tr class={l.inTotal || l.needsPrice ? undefined : 'ce-not-counted'}>
      <td class="ce-item-cell">
        <span class="ce-item">{l.item}</span>
        <Where t={t} link={l.link} vendor={l.vendor} />
        {l.notes && <span class="ce-note">{l.notes}</span>}
        {!l.inTotal && !l.needsPrice && <span class="ce-note ce-flag">{t('ui.notCounted')}</span>}
        {l.needsPrice && <span class="ce-note ce-flag">{t('ui.notUntilPrice')}</span>}
      </td>
      <td class="num" data-label={t('ui.col.quantity')}>
        {qtyText(t, l)}
      </td>
      <td class="num" data-label={t('ui.col.unitPrice')}>
        {l.needsPrice ? <span class="ce-need-badge">{t('ui.priceNeeded')}</span> : l.unit === '' ? '' : money(t, l.unitPrice)}
        {l.userPrice && <span class="ce-each">{t('ui.yourPrice')}</span>}
      </td>
      <td class="num ce-total-cell" data-label={t('ui.col.total')}>
        {l.needsPrice ? '—' : money(t, l.total)}
      </td>
    </tr>
  );
}

function CategoryTable({
  e,
  t,
  id,
  open,
  bare,
  guideTitles,
}: {
  e: Estimate;
  t: CostT;
  id: CategoryMeta;
  open: boolean;
  bare?: boolean;
  guideTitles?: Record<string, string>;
}) {
  const lines = e.lines.filter((l) => l.category === id.id);
  if (!lines.length) return null;
  const groups: (string | undefined)[] = [];
  for (const l of lines) if (!groups.includes(l.group)) groups.push(l.group);
  const u = urlFor(t.locale);
  const table = (
    <table class="ce-table">
      <thead>
        <tr>
          <th scope="col">{t('ui.col.item')}</th>
          <th scope="col" class="num">
            {t('ui.col.quantity')}
          </th>
          <th scope="col" class="num">
            {t('ui.col.unitPrice')}
          </th>
          <th scope="col" class="num">
            {t('ui.col.total')}
          </th>
        </tr>
      </thead>
      {groups.map((g) => {
        const guide = lines.find((l) => l.group === g)?.guide;
        return (
          <tbody key={g ?? '-'}>
            {g && (
              <tr class="ce-group-row">
                <th colSpan={4} scope="rowgroup">
                  {g}
                  {guide && (
                    <a class="ce-guide-link" href={u(`build/${guide}/`)}>
                      {t('ui.fromGuide', { guide: guideTitles?.[guide] ?? GUIDES[guide].title })}
                    </a>
                  )}
                </th>
              </tr>
            )}
            {lines
              .filter((l) => l.group === g)
              .map((l, k) => (
                <LineRow key={k} t={t} l={l} />
              ))}
          </tbody>
        );
      })}
    </table>
  );
  if (bare) return table;
  return (
    <details class="ce-cat" open={open}>
      <summary>
        <span class="ce-cat-name">
          {id.label}
          <span class="ce-cat-count">{t('ui.items', { count: lines.length })}</span>
        </span>
        <span class="ce-cat-total">{money(t, e.subtotals[id.id])}</span>
      </summary>
      {table}
    </details>
  );
}

export function TotalCard({ e, t }: { e: Estimate; t: CostT }) {
  const s = e.summary;
  const missing = e.priceNeeded.filter((p) => p.price === undefined).length;
  return (
    <div class="ce-total-card">
      <p class="eyebrow">{t('ui.finalCost')}</p>
      <p class="ce-grand">{money(t, e.total)}</p>
      <dl class="ce-breakdown">
        <div>
          <dt>{t('ui.total.costs')}</dt>
          <dd>{money(t, s.totalCosts)}</dd>
        </div>
        <div>
          <dt>{t('ui.total.toolRental', { percent: percent(t, CONTINGENCY.toolRental) })}</dt>
          <dd>{money(t, s.toolRental)}</dd>
        </div>
        <div>
          <dt>{t(e.mode === 'sheet' ? 'ui.total.contingencySheet' : 'ui.total.contingency', { percent: percent(t, CONTINGENCY.contingency) })}</dt>
          <dd>{money(t, s.contingency)}</dd>
        </div>
        {s.otherCosts !== 0 && (
          <div>
            <dt>{t('ui.total.other')}</dt>
            <dd>{money(t, s.otherCosts)}</dd>
          </div>
        )}
      </dl>
      {missing > 0 && <p class="ce-missing">{t('ui.total.missing', { count: missing })}</p>}
      <p class="ce-price-note">{t('ui.priceNote')}</p>
      <p class="ce-small">{t('ui.total.mayVary')}</p>
    </div>
  );
}

export function EstimateView({ e, t, open, guideTitles }: { e: Estimate; t: CostT; open: boolean; guideTitles?: Record<string, string> }) {
  const parts = [
    { id: 'base', label: t('ui.part.base'), total: e.summary.baseDesign },
    { id: 'furnishings', label: t('ui.part.furnishings'), total: e.summary.baseFurnishings + e.summary.additional + e.summary.offTheShelf + e.summary.optional },
    { id: 'contingency', label: t('ui.part.contingency'), total: e.summary.toolRental + e.summary.contingency + e.summary.otherCosts },
  ] as const;
  const cats = categories(t);
  return (
    <div class="ce-estimate">
      {parts.map((p) => {
        const here = cats.filter((c) => c.part === p.id && e.lines.some((l) => l.category === c.id));
        if (!here.length) return null;
        return (
          <section class="ce-part" key={p.id} aria-label={p.label}>
            <h4 class="ce-part-head">
              <span>{p.label}</span>
              <span>{money(t, p.total)}</span>
            </h4>
            {here.map((c) => (
              <CategoryTable key={c.id} e={e} t={t} id={c} open={open} bare={p.id === 'contingency'} guideTitles={guideTitles} />
            ))}
          </section>
        );
      })}
    </div>
  );
}

function OrderRow({ t, r }: { t: CostT; r: OrderListRow }) {
  return (
    <tr>
      <td class="ce-item-cell">
        <span class="ce-item">{r.item}</span>
        <Where t={t} link={r.link} vendor={r.vendor} />
        {r.usedFor && r.usedFor.length > 0 && <span class="ce-note">{t('ui.for', { list: join(t, r.usedFor) })}</span>}
        {r.note && <span class="ce-note">{r.note}</span>}
        {r.flags.map((f, k) => (
          <span key={k} class="ce-note ce-flag">
            ⚠ {f}
          </span>
        ))}
      </td>
      <td class="num" data-label={t('ui.col.quantity')}>
        {qtyUnit(t, r.qty, r.unit)}
      </td>
      <td data-label={t('ui.col.delivery')}>{r.leadTime ?? ''}</td>
      <td class="num" data-label={t('ui.col.cost')}>
        {r.needsPrice ? <span class="ce-need-badge">{t('ui.priceNeeded')}</span> : r.total !== null ? money(t, r.total) : '—'}
        {r.unitPrice !== null && r.qty !== 1 && <span class="ce-each">{t('ui.each', { price: money(t, r.unitPrice) })}</span>}
      </td>
    </tr>
  );
}

export function OrderListView({ e, t }: { e: Estimate; t: CostT }) {
  const ol = e.orderList;
  const rows = ol.rows.filter((r) => r.qty !== 0 || r.flags.length);
  const sections = ol.sections.filter((s) => rows.some((r) => r.section === s));
  const tools: string[] = [];
  for (const x of ol.tools) if (!tools.includes(x.section)) tools.push(x.section);
  const newTab = () => <span class="visually-hidden"> {t('ui.newTab')}</span>;
  return (
    <div class="ce-order">
      {ol.notes.map((n, k) => (
        <p key={k} class="ce-small">
          {n}
        </p>
      ))}
      {!rows.length && <p>{t('ui.nothingToOrder')}</p>}
      {sections.map((s) => (
        <section key={s} class="ce-order-section" aria-label={s}>
          <h5 class="ce-order-head">{s}</h5>
          {ol.tips[s] && <p class="ce-small ce-tip">{t('ui.tip', { tip: ol.tips[s] })}</p>}
          <table class="ce-table ce-order-table">
            <thead>
              <tr>
                <th scope="col">{t('ui.col.item')}</th>
                <th scope="col" class="num">
                  {t('ui.col.quantity')}
                </th>
                <th scope="col">{t('ui.col.deliveryTime')}</th>
                <th scope="col" class="num">
                  {t('ui.col.cost')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((r) => r.section === s)
                .map((r) => (
                  <OrderRow key={r.key} t={t} r={r} />
                ))}
            </tbody>
          </table>
        </section>
      ))}
      {ol.extras.length > 0 && e.mode === 'corrected' && (
        <ul class="ce-small ce-extras">
          {ol.extras.map((x, k) => (
            <li key={k}>{t('ui.alsoInTotal', { label: x.label, amount: money(t, x.amount) })}</li>
          ))}
        </ul>
      )}
      {e.mode === 'corrected' ? (
        <p class="ce-small ce-ol-total" dangerouslySetInnerHTML={{ __html: t.html('ui.olTotal', { total: money(t, ol.total) }) }} />
      ) : (
        <p
          class="ce-small ce-ol-total"
          dangerouslySetInnerHTML={{ __html: t.html('ui.olTotalSheet', { total: money(t, ol.total), extra: t.money(175) }) }}
        />
      )}
      {tools.map((s) => (
        <section key={s} class="ce-order-section" aria-label={s}>
          <h5 class="ce-order-head">{s}</h5>
          <ul class="ce-tools">
            {ol.tools
              .filter((x) => x.section === s)
              .map((x, k) => (
                <li key={k}>
                  {x.link ? (
                    <a href={x.link} target="_blank" rel="noopener noreferrer">
                      {x.item}
                      {newTab()}
                    </a>
                  ) : (
                    x.item
                  )}
                  {x.note && <span class="muted">{t('ui.toolNote', { note: x.note })}</span>}
                  {x.linkFlag && <span class="ce-note ce-flag">⚠ {x.linkFlag}</span>}
                  {x.siteNote && (
                    <span class="ce-note ce-site-note">
                      {x.siteNote.text}{t.space}
                      <a href={x.siteNote.link} target="_blank" rel="noopener noreferrer" hreflang="en">
                        <span dir="ltr">{x.siteNote.link.replace(/^https:\/\//, '')}</span>
                        {newTab()}
                      </a>
                      {t.locale !== 'en' && ` ${t('ui.inEnglish')}`}
                    </span>
                  )}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** "Price needed" items: the spreadsheet has no price; the person types one. */
export function PriceNeeded({ e, t, onPrice, idBase }: { e: Estimate; t: CostT; onPrice: (id: string, price: number | undefined) => void; idBase: string }) {
  if (!e.priceNeeded.length) return null;
  const missing = e.priceNeeded.filter((p) => p.price === undefined).length;
  return (
    <section class="ce-needs" aria-labelledby={`${idBase}-needs`}>
      <h5 id={`${idBase}-needs`} class="ce-needs-head">
        {missing ? t('ui.needs.head', { count: missing }) : t('ui.needs.added')}
      </h5>
      <p class="ce-small">{t('ui.needs.text', { count: e.priceNeeded.length })}</p>
      <ul class="ce-needs-list">
        {e.priceNeeded.map((p) => (
          <li key={p.id}>
            <PriceInput t={t} item={p} id={`${idBase}-price-${p.id.replace(/[^a-z0-9]+/gi, '-')}`} onPrice={(v) => onPrice(p.id, v)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function PriceInput({ t, item, id, onPrice }: { t: CostT; item: Estimate['priceNeeded'][number]; id: string; onPrice: (v: number | undefined) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [bad, setBad] = useState(false);
  const shown = draft ?? (item.price === undefined ? '' : String(item.price));
  return (
    <div class="ce-need">
      <label for={id} class="ce-need-label">
        <span class="ce-item">{item.item}</span>
        <span class="ce-note">
          {qtyUnit(t, item.qty, item.unit)}
          {item.usedIn.length > 0 && t('ui.needs.for', { list: join(t, item.usedIn) })}
        </span>
      </label>
      <span class="ce-input-wrap ce-need-input">
        <span class="ce-unit ce-unit-pre">$</span>
        <input
          id={id}
          type="number"
          min={0}
          step="any"
          inputMode="decimal"
          placeholder={t('ui.needs.placeholder')}
          value={shown}
          aria-invalid={bad || undefined}
          onInput={(ev) => {
            const raw = (ev.currentTarget as HTMLInputElement).value;
            setDraft(raw);
            if (raw.trim() === '') {
              setBad(false);
              onPrice(undefined);
              return;
            }
            const v = Number(raw);
            const ok = Number.isFinite(v) && v >= 0;
            setBad(!ok);
            if (ok) onPrice(v);
          }}
          onBlur={() => {
            setDraft(null);
            setBad(false);
          }}
        />
        <span class="ce-unit">{t('ui.needs.each')}</span>
      </span>
      <span class="ce-need-total">{item.price === undefined ? t('ui.needs.notInTotal') : money(t, item.price * item.qty)}</span>
    </div>
  );
}

/** "How this differs from Park in a Truck's spreadsheet": each correction with its dollar effect for these answers. */
export function Differences({ e, t }: { e: Estimate; t: CostT }) {
  const c = e.corrections;
  if (!c) return null;
  const effect = (v: number) =>
    Math.abs(v) < 0.005 ? t('ui.diff.noChange') : v > 0 ? t('ui.diff.plus', { amount: money(t, Math.abs(v)) }) : t('ui.diff.minus', { amount: money(t, Math.abs(v)) });
  const matters = (f: (typeof c.fixes)[number]) => (f.id === 'orderList' ? Math.abs(c.sheetOrderListTotal - c.orderListTotal) >= 0.005 : Math.abs(f.effect) >= 0.005);
  const changed = c.fixes.filter(matters);
  const unchanged = c.fixes.filter((f) => !matters(f));
  return (
    <details class="ce-diff">
      <summary>{t('ui.diff.summary')}</summary>
      <p class="ce-small" dangerouslySetInnerHTML={{ __html: t.html('ui.diff.intro', { sheet: money(t, c.sheetTotal), total: money(t, e.total) }) }} />
      <ol class="ce-diff-list">
        {changed.map((f) => (
          <li key={f.id}>
            <span class="ce-diff-row">
              <span class="ce-item">{f.label}</span>
              <span class="ce-diff-effect">
                {f.id === 'orderList' ? t('ui.diff.orderList', { from: money(t, c.sheetOrderListTotal), to: money(t, c.orderListTotal) }) : effect(f.effect)}
              </span>
            </span>
            <span class="ce-note">{f.detail}</span>
          </li>
        ))}
        {Math.abs(c.pricesAdded) >= 0.005 && (
          <li>
            <span class="ce-diff-row">
              <span class="ce-item">{t('ui.diff.pricesAdded')}</span>
              <span class="ce-diff-effect">{effect(c.pricesAdded)}</span>
            </span>
          </li>
        )}
      </ol>
      {unchanged.length > 0 && (
        <>
          <p class="ce-small" dangerouslySetInnerHTML={{ __html: t.html('ui.diff.also') }} />
          <ul class="ce-small ce-kept">
            {unchanged.map((f) => (
              <li key={f.id}>
                {t('ui.diff.alsoLabel', { label: f.label })} <span class="muted">{f.detail}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p class="ce-small" dangerouslySetInnerHTML={{ __html: t.html('ui.diff.kept') }} />
      <ul class="ce-small ce-kept">
        {keptAssumptions(t).map((k, i) => (
          <li key={i}>{k}</li>
        ))}
      </ul>
    </details>
  );
}
