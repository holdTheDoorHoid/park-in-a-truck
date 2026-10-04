/** @jsxImportSource preact */
// The estimate (cost by category, grand total) and the spreadsheet's order list.

import { useState } from 'preact/hooks';
import { KEPT_ASSUMPTIONS } from '../../lib/cost/corrections';
import { CATEGORIES, fmtN, money, type CostLine, type Estimate } from '../../lib/cost/model';
import type { OrderListRow } from '../../lib/cost/orderList';

const PRICE_NOTE = 'Prices from the Park in a Truck estimator — check current prices with suppliers.';

function Where({ link, vendor }: { link?: string; vendor?: string }) {
  if (!link) return null;
  return (
    <a class="ce-where" href={link} target="_blank" rel="noopener noreferrer">
      {vendor ?? 'Where to buy'}
      <span aria-hidden="true"> ↗</span>
      <span class="visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}

const PLURAL: Record<string, string> = { roll: 'rolls', package: 'packages', can: 'cans', box: 'boxes', trip: 'trips', ton: 'tons', pack: 'packs' };

/** The sheet's unit, readable: "TONS" -> "tons", "ROLL" -> "rolls", "EA" -> "ea.". */
export function unitText(unit: string, qty: number): string {
  if (unit.includes('(')) return unit;
  let u = unit.toLowerCase();
  if (u === 'ea' || u === 'ea.') return 'ea.';
  if (u === 'tons') u = 'ton';
  if (u === 'pack of 16') return qty === 1 ? 'pack of 16' : 'packs of 16';
  return qty !== 1 && PLURAL[u] ? PLURAL[u]! : u === 'cy' ? 'CY' : u;
}

/** Quantity cell: "3 ea.", or "15% of $4,321.87" for percentage lines, or blank for repeats. */
function qtyText(l: CostLine): string {
  if (l.unit !== '') return `${fmtN(l.qty)} ${unitText(l.unit, l.qty)}`;
  return l.qty === 1 ? '' : `${fmtN(l.qty * 100)}% of ${money(l.unitPrice)}`;
}

function LineRow({ l }: { l: CostLine }) {
  return (
    <tr class={l.inTotal || l.needsPrice ? undefined : 'ce-not-counted'}>
      <td class="ce-item-cell">
        <span class="ce-item">{l.item}</span>
        <Where link={l.link} vendor={l.vendor} />
        {l.notes && <span class="ce-note">{l.notes}</span>}
        {!l.inTotal && !l.needsPrice && <span class="ce-note ce-flag">Not counted in the total.</span>}
        {l.needsPrice && <span class="ce-note ce-flag">Not in the total until you enter a price (above the cost by category).</span>}
      </td>
      <td class="num" data-label="Quantity">
        {qtyText(l)}
      </td>
      <td class="num" data-label="Unit price">
        {l.needsPrice ? <span class="ce-need-badge">price needed</span> : l.unit === '' ? '' : money(l.unitPrice)}
        {l.userPrice && <span class="ce-each">your price</span>}
      </td>
      <td class="num ce-total-cell" data-label="Total">
        {l.needsPrice ? '—' : money(l.total)}
      </td>
    </tr>
  );
}

function CategoryTable({ e, id, open, bare }: { e: Estimate; id: (typeof CATEGORIES)[number]; open: boolean; bare?: boolean }) {
  const lines = e.lines.filter((l) => l.category === id.id);
  if (!lines.length) return null;
  const groups: (string | undefined)[] = [];
  for (const l of lines) if (!groups.includes(l.group)) groups.push(l.group);
  const table = (
    <table class="ce-table">
      <thead>
        <tr>
          <th scope="col">Item</th>
          <th scope="col" class="num">
            Quantity
          </th>
          <th scope="col" class="num">
            Unit price
          </th>
          <th scope="col" class="num">
            Total
          </th>
        </tr>
      </thead>
      {groups.map((g) => (
        <tbody key={g ?? '-'}>
          {g && (
            <tr class="ce-group-row">
              <th colSpan={4} scope="rowgroup">
                {g}
              </th>
            </tr>
          )}
          {lines
            .filter((l) => l.group === g)
            .map((l, k) => (
              <LineRow key={k} l={l} />
            ))}
        </tbody>
      ))}
    </table>
  );
  if (bare) return table;
  return (
    <details class="ce-cat" open={open}>
      <summary>
        <span class="ce-cat-name">
          {id.label}
          <span class="ce-cat-count">
            {lines.length} item{lines.length === 1 ? '' : 's'}
          </span>
        </span>
        <span class="ce-cat-total">{money(e.subtotals[id.id])}</span>
      </summary>
      {table}
    </details>
  );
}

export function TotalCard({ e }: { e: Estimate }) {
  const s = e.summary;
  const missing = e.priceNeeded.filter((p) => p.price === undefined).length;
  return (
    <div class="ce-total-card">
      <p class="eyebrow">Estimated final cost</p>
      <p class="ce-grand">{money(e.total)}</p>
      <dl class="ce-breakdown">
        <div>
          <dt>Total costs</dt>
          <dd>{money(s.totalCosts)}</dd>
        </div>
        <div>
          <dt>Tool rental contingency (15%)</dt>
          <dd>{money(s.toolRental)}</dd>
        </div>
        <div>
          <dt>{e.mode === 'sheet' ? '20% contingency (+ tool rental again)' : '20% contingency'}</dt>
          <dd>{money(s.contingency)}</dd>
        </div>
        {s.otherCosts !== 0 && (
          <div>
            <dt>Other costs</dt>
            <dd>{money(s.otherCosts)}</dd>
          </div>
        )}
      </dl>
      {missing > 0 && (
        <p class="ce-missing">
          ⚠ {missing} item{missing === 1 ? ' needs' : 's need'} a price — not in the total yet.
        </p>
      )}
      <p class="ce-price-note">{PRICE_NOTE}</p>
      <p class="ce-small">This is a cost estimate; your final costs may vary.</p>
    </div>
  );
}

export function EstimateView({ e, open }: { e: Estimate; open: boolean }) {
  const parts = [
    { id: 'base', label: 'Base design', total: e.summary.baseDesign },
    { id: 'furnishings', label: 'Furnishings', total: e.summary.baseFurnishings + e.summary.additional + e.summary.offTheShelf + e.summary.optional },
    { id: 'contingency', label: 'Tool rental, contingency + other costs', total: e.summary.toolRental + e.summary.contingency + e.summary.otherCosts },
  ] as const;
  return (
    <div class="ce-estimate">
      {parts.map((p) => {
        const cats = CATEGORIES.filter((c) => c.part === p.id && e.lines.some((l) => l.category === c.id));
        if (!cats.length) return null;
        return (
          <section class="ce-part" key={p.id} aria-label={p.label}>
            <h4 class="ce-part-head">
              <span>{p.label}</span>
              <span>{money(p.total)}</span>
            </h4>
            {cats.map((c) => (
              <CategoryTable key={c.id} e={e} id={c} open={open} bare={p.id === 'contingency'} />
            ))}
          </section>
        );
      })}
    </div>
  );
}

function OrderRow({ r }: { r: OrderListRow }) {
  return (
    <tr>
      <td class="ce-item-cell">
        <span class="ce-item">{r.item}</span>
        <Where link={r.link} vendor={r.vendor} />
        {r.usedFor && r.usedFor.length > 0 && <span class="ce-note">For: {r.usedFor.join(', ')}</span>}
        {r.note && <span class="ce-note">{r.note}</span>}
        {r.flags.map((f, k) => (
          <span key={k} class="ce-note ce-flag">
            ⚠ {f}
          </span>
        ))}
      </td>
      <td class="num" data-label="Quantity">
        {fmtN(r.qty)} {unitText(r.unit, r.qty)}
      </td>
      <td data-label="Delivery">{r.leadTime ?? ''}</td>
      <td class="num" data-label="Cost">
        {r.needsPrice ? <span class="ce-need-badge">price needed</span> : r.total !== null ? money(r.total) : '—'}
        {r.unitPrice !== null && r.qty !== 1 && <span class="ce-each">{money(r.unitPrice)} each</span>}
      </td>
    </tr>
  );
}

export function OrderListView({ e }: { e: Estimate }) {
  const ol = e.orderList;
  const rows = ol.rows.filter((r) => r.qty !== 0 || r.flags.length);
  const sections = ol.sections.filter((s) => rows.some((r) => r.section === s));
  const tools: string[] = [];
  for (const t of ol.tools) if (!tools.includes(t.section)) tools.push(t.section);
  return (
    <div class="ce-order">
      {ol.notes.map((n, k) => (
        <p key={k} class="ce-small">
          {n}
        </p>
      ))}
      {!rows.length && <p>Nothing to order yet — fill in your counts above.</p>}
      {sections.map((s) => (
        <section key={s} class="ce-order-section" aria-label={s}>
          <h5 class="ce-order-head">{s}</h5>
          {ol.tips[s] && <p class="ce-small ce-tip">Tip: {ol.tips[s]}</p>}
          <table class="ce-table ce-order-table">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col" class="num">
                  Quantity
                </th>
                <th scope="col">Delivery time</th>
                <th scope="col" class="num">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody>
              {rows
                .filter((r) => r.section === s)
                .map((r) => (
                  <OrderRow key={r.key} r={r} />
                ))}
            </tbody>
          </table>
        </section>
      ))}
      {ol.extras.length > 0 && e.mode === 'corrected' && (
        <ul class="ce-small ce-extras">
          {ol.extras.map((x, k) => (
            <li key={k}>
              Also in the total: {x.label} — {money(x.amount)}
            </li>
          ))}
        </ul>
      )}
      {e.mode === 'corrected' ? (
        <p class="ce-small ce-ol-total">
          Order list total: <strong>{money(ol.total)}</strong> — the estimate’s total costs, before tool rental and contingency.
        </p>
      ) : (
        <p class="ce-small ce-ol-total">
          The spreadsheet’s order list adds up to <strong>{money(ol.total)}</strong> (including the plants subtotal and an unlabelled $175). It leaves some
          items out, so use the estimate above for your budget.
        </p>
      )}
      {tools.map((s) => (
        <section key={s} class="ce-order-section" aria-label={s}>
          <h5 class="ce-order-head">{s}</h5>
          <ul class="ce-tools">
            {ol.tools
              .filter((t) => t.section === s)
              .map((t, k) => (
                <li key={k}>
                  {t.link ? (
                    <a href={t.link} target="_blank" rel="noopener noreferrer">
                      {t.item}
                      <span class="visually-hidden"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    t.item
                  )}
                  {t.note && <span class="muted"> — {t.note}</span>}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** "Price needed" items: the spreadsheet has no price; the person types one. */
export function PriceNeeded({ e, onPrice, idBase }: { e: Estimate; onPrice: (id: string, price: number | undefined) => void; idBase: string }) {
  if (!e.priceNeeded.length) return null;
  const missing = e.priceNeeded.filter((p) => p.price === undefined).length;
  return (
    <section class="ce-needs" aria-labelledby={`${idBase}-needs`}>
      <h5 id={`${idBase}-needs`} class="ce-needs-head">
        {missing ? `⚠ ${missing} item${missing === 1 ? ' needs' : 's need'} a price` : '✓ Prices you added'}
      </h5>
      <p class="ce-small">
        The Park in a Truck spreadsheet has no price for {e.priceNeeded.length === 1 ? 'this item' : 'these items'}. Enter a unit price and it is added to the total
        (with tool rental and contingency); until then {e.priceNeeded.length === 1 ? 'it is' : 'they are'} left out.
      </p>
      <ul class="ce-needs-list">
        {e.priceNeeded.map((p) => (
          <li key={p.id}>
            <PriceInput item={p} id={`${idBase}-price-${p.id.replace(/[^a-z0-9]+/gi, '-')}`} onPrice={(v) => onPrice(p.id, v)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function PriceInput({ item, id, onPrice }: { item: Estimate['priceNeeded'][number]; id: string; onPrice: (v: number | undefined) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [bad, setBad] = useState(false);
  const shown = draft ?? (item.price === undefined ? '' : String(item.price));
  return (
    <div class="ce-need">
      <label for={id} class="ce-need-label">
        <span class="ce-item">{item.item}</span>
        <span class="ce-note">
          {fmtN(item.qty)} {unitText(item.unit, item.qty)}
          {item.usedIn.length > 0 && ` — for ${item.usedIn.join(', ')}`}
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
          placeholder="price"
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
        <span class="ce-unit">each</span>
      </span>
      <span class="ce-need-total">{item.price === undefined ? 'not in the total' : money(item.price * item.qty)}</span>
    </div>
  );
}

/** "How this differs from Park in a Truck's spreadsheet": each correction with its dollar effect for these answers. */
export function Differences({ e }: { e: Estimate }) {
  const c = e.corrections;
  if (!c) return null;
  const effect = (v: number) => (Math.abs(v) < 0.005 ? 'no change for your park' : `${v > 0 ? '+' : '−'}${money(Math.abs(v))}`);
  const matters = (f: (typeof c.fixes)[number]) => (f.id === 'orderList' ? Math.abs(c.sheetOrderListTotal - c.orderListTotal) >= 0.005 : Math.abs(f.effect) >= 0.005);
  const changed = c.fixes.filter(matters);
  const unchanged = c.fixes.filter((f) => !matters(f));
  return (
    <details class="ce-diff">
      <summary>How this differs from Park in a Truck’s spreadsheet</summary>
      <p class="ce-small">
        This estimate uses the spreadsheet’s prices and assumptions, with its calculation mistakes fixed. For these answers the spreadsheet comes to{' '}
        <strong>{money(c.sheetTotal)}</strong>; this estimate is <strong>{money(e.total)}</strong>.
      </p>
      <ol class="ce-diff-list">
        {changed.map((f) => (
          <li key={f.id}>
            <span class="ce-diff-row">
              <span class="ce-item">{f.label}</span>
              <span class="ce-diff-effect">
                {f.id === 'orderList' ? `order list ${money(c.sheetOrderListTotal)} → ${money(c.orderListTotal)}` : effect(f.effect)}
              </span>
            </span>
            <span class="ce-note">{f.detail}</span>
          </li>
        ))}
        {Math.abs(c.pricesAdded) >= 0.005 && (
          <li>
            <span class="ce-diff-row">
              <span class="ce-item">Prices you added</span>
              <span class="ce-diff-effect">{effect(c.pricesAdded)}</span>
            </span>
          </li>
        )}
      </ol>
      {unchanged.length > 0 && (
        <>
          <p class="ce-small">
            <strong>Also corrected</strong> (no change for these answers):
          </p>
          <ul class="ce-small ce-kept">
            {unchanged.map((f) => (
              <li key={f.id}>
                {f.label}. <span class="muted">{f.detail}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p class="ce-small">
        <strong>Kept as in the spreadsheet</strong> (assumptions rather than mistakes):
      </p>
      <ul class="ce-small ce-kept">
        {KEPT_ASSUMPTIONS.map((k, i) => (
          <li key={i}>{k}</li>
        ))}
      </ul>
    </details>
  );
}
