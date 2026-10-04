// The estimate and the order list as a CSV file (opens in Excel, Numbers,
// Google Sheets). Money is written as plain numbers with two decimals.

import { CATEGORIES, type Estimate } from './model';

const cell = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'number' ? (Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100)) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const usd = (v: number | null | undefined) => (v === null || v === undefined ? '' : v.toFixed(2));
const line = (cells: unknown[]) => cells.map(cell).join(',');

export function estimateCsv(e: Estimate, projectName = 'My park', date = new Date()): string {
  const out: string[] = [];
  out.push(line(['Park in a Truck cost estimate', projectName, date.toISOString().slice(0, 10)]));
  out.push(line(['Prices from the Park in a Truck estimator — check current prices with suppliers.']));
  out.push('');
  out.push(line(['Category', 'Group', 'Item', 'Quantity', 'Unit', 'Unit price', 'Total', 'Counted in total', 'Where to buy', 'Link', 'Notes']));
  for (const c of CATEGORIES) {
    const lines = e.lines.filter((l) => l.category === c.id);
    if (!lines.length) continue;
    for (const l of lines)
      out.push(
        line([c.label, l.group ?? '', l.item, l.qty, l.unit, usd(l.unitPrice), usd(l.total), l.inTotal ? 'yes' : 'no', l.vendor ?? '', l.link ?? '', l.notes ?? '']),
      );
    out.push(line([c.label, '', 'Subtotal', '', '', '', usd(e.subtotals[c.id])]));
  }
  out.push(line(['', '', 'Total costs', '', '', '', usd(e.summary.totalCosts)]));
  out.push(line(['', '', 'Estimated final cost', '', '', '', usd(e.total)]));
  if (e.warnings.length) {
    out.push('');
    out.push(line(['Spreadsheet quirks in this estimate']));
    for (const w of e.warnings) out.push(line([w]));
  }

  out.push('');
  out.push(line(['Order list (the spreadsheet’s ORDER LIST tab)']));
  out.push(line(['Section', 'Item', 'Quantity', 'Unit', 'Unit price', 'Total', 'Delivery time', 'Phase', 'Where to buy', 'Link', 'Notes']));
  for (const r of e.orderList.rows) {
    if (r.qty === 0 && !r.flags.length) continue;
    out.push(
      line([r.section, r.item, r.qty, r.unit, usd(r.unitPrice), usd(r.total), r.leadTime ?? '', r.phase ?? '', r.vendor ?? '', r.link ?? '', [r.note, ...r.flags].filter(Boolean).join(' ')]),
    );
  }
  for (const x of e.orderList.extras) out.push(line(['', x.label, '', '', '', usd(x.amount)]));
  out.push(line(['', 'Order list total', '', '', '', usd(e.orderList.total)]));
  return '﻿' + out.join('\r\n') + '\r\n';
}
