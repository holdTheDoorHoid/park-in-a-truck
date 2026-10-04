// The estimate and the order list as a CSV file (opens in Excel, Numbers,
// Google Sheets). Money is written as plain numbers with two decimals; the words follow the
// reader's language (src/lib/cost/text.ts).

import { categories, type Estimate } from './model';
import { EN, unitWord, type CostT } from './text';

const cell = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'number' ? (Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100)) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const usd = (v: number | null | undefined) => (v === null || v === undefined ? '' : v.toFixed(2));
const line = (cells: unknown[]) => cells.map(cell).join(',');

/**
 * The CSV in the reader's language (`t`, default English). Numbers stay plain numbers. The unit
 * column keeps the spreadsheet's own unit words in English (as it always has) and is translated
 * in other languages.
 */
export function estimateCsv(e: Estimate, projectName = 'My park', date = new Date(), t: CostT = EN): string {
  const out: string[] = [];
  const unit = (u: string, qty: number) => (t.locale === 'en' ? u : u === '' ? '' : unitWord(t, u, qty));
  const priceNeeded = t('csv.priceNeeded');
  out.push(line([t('csv.title'), projectName, date.toISOString().slice(0, 10)]));
  out.push(line([t('ui.priceNote')]));
  if (e.mode === 'corrected') out.push(line([t('csv.corrected')]));
  out.push('');
  out.push(
    line([
      t('csv.col.category'),
      t('csv.col.group'),
      t('csv.col.item'),
      t('csv.col.quantity'),
      t('csv.col.unit'),
      t('csv.col.unitPrice'),
      t('csv.col.total'),
      t('csv.col.counted'),
      t('csv.col.where'),
      t('csv.col.link'),
      t('csv.col.notes'),
    ]),
  );
  for (const c of categories(t)) {
    const lines = e.lines.filter((l) => l.category === c.id);
    if (!lines.length) continue;
    for (const l of lines)
      out.push(
        line([
          c.label,
          l.group ?? '',
          l.item,
          l.qty,
          unit(l.unit, l.qty),
          l.needsPrice ? priceNeeded : usd(l.unitPrice),
          l.needsPrice ? '' : usd(l.total),
          l.inTotal ? t('csv.yes') : t('csv.no'),
          l.vendor ?? '',
          l.link ?? '',
          [l.userPrice ? t('csv.yourPrice') : '', l.notes ?? ''].filter(Boolean).join(' '),
        ]),
      );
    out.push(line([c.label, '', t('csv.subtotal'), '', '', '', usd(e.subtotals[c.id])]));
  }
  out.push(line(['', '', t('csv.totalCosts'), '', '', '', usd(e.summary.totalCosts)]));
  out.push(line(['', '', t('csv.finalCost'), '', '', '', usd(e.total)]));
  const missing = e.priceNeeded.filter((p) => p.price === undefined);
  if (missing.length) out.push(line(['', '', t('csv.missing', { count: missing.length })]));
  if (e.warnings.length) {
    out.push('');
    out.push(line([e.mode === 'sheet' ? t('csv.quirks') : t('csv.notes')]));
    for (const w of e.warnings) out.push(line([w]));
  }

  out.push('');
  out.push(line([t('csv.orderList')]));
  out.push(
    line([
      t('csv.col.section'),
      t('csv.col.item'),
      t('csv.col.quantity'),
      t('csv.col.unit'),
      t('csv.col.unitPrice'),
      t('csv.col.total'),
      t('csv.col.delivery'),
      t('csv.col.phase'),
      t('csv.col.where'),
      t('csv.col.link'),
      t('csv.col.notes'),
    ]),
  );
  for (const r of e.orderList.rows) {
    if (r.qty === 0 && !r.flags.length) continue;
    out.push(
      line([
        r.section,
        r.item,
        r.qty,
        unit(r.unit, r.qty),
        r.needsPrice ? priceNeeded : usd(r.unitPrice),
        usd(r.total),
        r.leadTime ?? '',
        r.phase ?? '',
        r.vendor ?? '',
        r.link ?? '',
        [r.note, ...r.flags].filter(Boolean).join(' '),
      ]),
    );
  }
  for (const x of e.orderList.extras) out.push(line(['', x.label, '', '', '', usd(x.amount)]));
  out.push(line(['', t('csv.olTotal'), '', '', '', usd(e.orderList.total)]));

  const c = e.corrections;
  if (c) {
    out.push('');
    out.push(line([t('csv.diff')]));
    out.push(line([t('csv.col.correction'), t('csv.col.change'), t('csv.col.what')]));
    out.push(line([t('csv.sheetTotal'), usd(c.sheetTotal)]));
    for (const f of c.fixes) out.push(line([f.label, usd(f.effect), f.detail]));
    if (c.pricesAdded) out.push(line([t('csv.pricesAdded'), usd(c.pricesAdded)]));
    out.push(line([t('csv.thisEstimate'), usd(e.total)]));
  }
  return '\uFEFF' + out.join('\r\n') + '\r\n';
}
