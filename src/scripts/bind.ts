// Connects plain HTML on every page to the saved project:
//
//   [data-field="<id>"]          input/select/textarea  -> project.fields[id]
//   [data-field][data-auto="…"]  shows a value from City records (project.lot…)
//                                until the person types their own
//   input[type=checkbox][data-field-check="<id>"][value]  -> string[] of checked values
//   input[type=radio][name][data-field-radio="<id>"]       -> chosen value
//   <piat-list data-field="<id>" data-columns='[{key,label,type?}]' data-min="3">
//   .substep-done[data-done]     "Mark this step done" toggle
//   [data-progress-step="<slug>"] progress text/bars, [data-progress-total] overall
//                                ([data-progress-text][data-progress-msg="<workbook key>"] picks the wording)
//
// Text comes from the "workbook" catalog in the page's language (<html data-locale>).
// Values saved by fields never depend on the language.
//   [data-project-name]          the active project's name
//   [data-lot-agreement-notice]  site-added "no lot agreement recorded yet" banner
//                                (Assess/Dream/Create); [data-dismiss="lot-agreement"]
//                                dismisses it for this project
//
// Content authors never write this markup by hand; the components in
// src/components/workbook/ emit it.

import { $project, setDone, setExtra, setField } from '../lib/project';
import { resolveAuto } from '../lib/autofill';
import type { Project } from '../lib/types';
import workbook from '../i18n/messages/en/workbook.ts';
import { getT } from '../i18n/t.ts';

const t = getT(undefined, workbook);

type Col = { key: string; label: string; type?: string; placeholder?: string };

/** Briefly announce a status message through the page's shared polite live region. */
function announce(text: string) {
  const el = document.getElementById('piat-announce');
  if (!el) return;
  // Clear first: if the same text was just announced, re-setting it
  // identically wouldn't fire a new announcement in most screen readers.
  el.textContent = '';
  window.setTimeout(() => {
    el.textContent = text;
  }, 30);
}

function bindFields(root: ParentNode) {
  root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-field]:not(piat-list)').forEach((el) => {
    if (el.dataset.bound) return;
    el.dataset.bound = '1';
    const id = el.dataset.field!;
    const write = () => {
      const v = el.value;
      const num = el instanceof HTMLInputElement && el.type === 'number';
      setField(id, v === '' ? null : num ? Number(v) : v);
    };
    el.addEventListener('input', write);
    el.addEventListener('change', write);
    // A field cleared while focused shows its looked-up value (data-auto) again once you leave it.
    if (el.dataset.auto) el.addEventListener('blur', () => render($project.get()));
  });

  root.querySelectorAll<HTMLInputElement>('input[data-field-check]').forEach((el) => {
    if (el.dataset.bound) return;
    el.dataset.bound = '1';
    el.addEventListener('change', () => {
      const id = el.dataset.fieldCheck!;
      const all = document.querySelectorAll<HTMLInputElement>(`input[data-field-check="${CSS.escape(id)}"]`);
      setField(
        id,
        [...all].filter((c) => c.checked).map((c) => c.value),
      );
    });
  });

  root.querySelectorAll<HTMLInputElement>('input[data-field-radio]').forEach((el) => {
    if (el.dataset.bound) return;
    el.dataset.bound = '1';
    el.addEventListener('change', () => {
      if (el.checked) setField(el.dataset.fieldRadio!, el.value);
    });
  });

  root.querySelectorAll<HTMLButtonElement>('[data-dismiss="lot-agreement"]').forEach((el) => {
    if (el.dataset.bound) return;
    el.dataset.bound = '1';
    el.addEventListener('click', () => setExtra('lotNoticeDismissed', true));
  });

  root.querySelectorAll<HTMLElement>('.substep-done[data-done]').forEach((el) => {
    if (el.dataset.bound) return;
    el.dataset.bound = '1';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'done-toggle';
    btn.innerHTML = '<span class="box" aria-hidden="true"></span><span class="label"></span>';
    btn.querySelector('.label')!.textContent = t('done.mark');
    btn.addEventListener('click', () => {
      const id = el.dataset.done!;
      setDone(id, btn.getAttribute('aria-pressed') !== 'true');
    });
    el.append(btn);
  });
}

/** Blank rows shown below the saved ones (after "+ Add row"), per list. */
const blankRows = new WeakMap<HTMLElement, number>();

function renderLists(p: Project) {
  document.querySelectorAll<HTMLElement>('piat-list[data-field]').forEach((host) => {
    const id = host.dataset.field!;
    const cols: Col[] = JSON.parse(host.dataset.columns || '[]');
    const min = Number(host.dataset.min || 1);
    const stored = ((p.fields[id] as Record<string, string>[] | undefined) ?? []).slice();
    const want = Math.max(min, stored.length + (blankRows.get(host) ?? 0));
    const rows = stored.slice();
    while (rows.length < want) rows.push({});

    // Do not rebuild while someone is typing in this list.
    if (host.contains(document.activeElement) && host.dataset.rows === String(rows.length)) return;
    host.dataset.rows = String(rows.length);

    const save = () => {
      const out: Record<string, string>[] = [];
      host.querySelectorAll('tbody tr').forEach((tr) => {
        const row: Record<string, string> = {};
        tr.querySelectorAll<HTMLInputElement>('input[data-col]').forEach((i) => {
          if (i.value.trim()) row[i.dataset.col!] = i.value;
        });
        out.push(row);
      });
      const total = out.length;
      // trailing blank rows stay on screen but are not stored
      while (out.length && !Object.keys(out[out.length - 1]!).length) out.pop();
      blankRows.set(host, total - out.length);
      setField(id, out);
    };

    const table = document.createElement('table');
    const caption = document.createElement('caption');
    caption.className = 'visually-hidden';
    caption.textContent = host.dataset.label || '';
    table.append(caption);
    const thead = document.createElement('thead');
    const htr = document.createElement('tr');
    for (const c of cols) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = c.label;
      htr.append(th);
    }
    const thx = document.createElement('th');
    thx.innerHTML = '<span class="visually-hidden"></span>';
    thx.firstElementChild!.textContent = t('list.remove');
    htr.append(thx);
    thead.append(htr);
    table.append(thead);

    const tbody = document.createElement('tbody');
    rows.forEach((r, i) => {
      const tr = document.createElement('tr');
      cols.forEach((c) => {
        const td = document.createElement('td');
        td.dataset.label = c.label;
        const inp = document.createElement('input');
        inp.type = c.type || 'text';
        inp.dataset.col = c.key;
        inp.value = r[c.key] ?? '';
        inp.placeholder = c.placeholder || '';
        inp.setAttribute('aria-label', t('list.cell', { label: c.label, n: i + 1 }));
        inp.addEventListener('input', save);
        td.append(inp);
        tr.append(td);
      });
      const td = document.createElement('td');
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'row-remove';
      rm.textContent = '×';
      rm.setAttribute('aria-label', t('list.removeRow', { n: i + 1 }));
      rm.addEventListener('click', () => {
        const removedIndex = i;
        const rowName = host.dataset.rowName || t('list.row');
        tr.remove();
        host.dataset.rows = '';
        save(); // rebuilds this list's DOM synchronously (via the project store)
        // Land focus on the row that shifted up into the removed row's spot,
        // or the previous row, or the Add button if the list is now empty —
        // never let it fall through to <body> with no visible focus ring.
        const freshRows = host.querySelectorAll('tbody tr');
        const target =
          freshRows[removedIndex]?.querySelector<HTMLElement>('input') ??
          freshRows[removedIndex - 1]?.querySelector<HTMLElement>('input') ??
          host.querySelector<HTMLElement>(':scope > button.btn-small');
        target?.focus();
        announce(t('list.removed', { row: rowName }));
      });
      td.append(rm);
      tr.append(td);
      tbody.append(tr);
    });
    table.append(tbody);
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'btn btn-small';
    add.textContent = t('list.add', { row: host.dataset.rowName || t('list.row') });
    const msg = document.createElement('span');
    msg.className = 'field-hint list-add-msg';
    msg.setAttribute('role', 'status');
    add.addEventListener('click', () => {
      const lastRow = host.querySelector('tbody tr:last-child');
      const lastInputs = lastRow ? [...lastRow.querySelectorAll<HTMLInputElement>('input[data-col]')] : [];
      const lastIsBlank = lastInputs.length > 0 && lastInputs.every((inp) => !inp.value.trim());
      if (lastIsBlank) {
        // Adding another blank row on top of an already-blank one would just be a
        // second identical empty row — point at the one that needs filling in
        // instead of silently doing nothing.
        msg.textContent = t('list.fillFirst', { row: host.dataset.rowName || t('list.row') });
        lastInputs[0]?.focus();
        return;
      }
      blankRows.set(host, (blankRows.get(host) ?? 0) + 1);
      renderLists($project.get());
      host.querySelector<HTMLInputElement>('tbody tr:last-child input')?.focus();
    });
    host.replaceChildren(table, add, msg);
  });
}

type ProgressKey = 'progress.of' | 'progress.done' | 'progress.total';
function progressKey(el: HTMLElement, fallback: ProgressKey): ProgressKey {
  const k = el.dataset.progressMsg;
  return k === 'progress.of' || k === 'progress.done' || k === 'progress.total' ? k : fallback;
}

function render(p: Project) {
  // simple fields
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-field]:not(piat-list)').forEach((el) => {
    if (el === document.activeElement) return;
    const id = el.dataset.field!;
    const own = p.fields[id];
    const wrap = el.closest<HTMLElement>('.field');
    const badge = wrap?.querySelector<HTMLElement>('.field-auto');
    if (own !== undefined && own !== null) {
      el.value = String(own);
      wrap?.removeAttribute('data-autofilled');
      if (badge) badge.hidden = true;
      return;
    }
    // A select's options are saved by their English value, so its auto value stays English
    // (the option shows the translated label); text boxes show it in the page's language.
    const auto = el.dataset.auto ? resolveAuto(p, el.dataset.auto, el instanceof HTMLSelectElement ? 'en' : t.locale) : null;
    el.value = auto ?? '';
    if (auto) wrap?.setAttribute('data-autofilled', '');
    else wrap?.removeAttribute('data-autofilled');
    if (badge) badge.hidden = !auto;
  });

  document.querySelectorAll<HTMLInputElement>('input[data-field-check]').forEach((el) => {
    const v = p.fields[el.dataset.fieldCheck!];
    el.checked = Array.isArray(v) && (v as string[]).includes(el.value);
  });
  document.querySelectorAll<HTMLInputElement>('input[data-field-radio]').forEach((el) => {
    el.checked = p.fields[el.dataset.fieldRadio!] === el.value;
  });

  renderLists(p);

  // done toggles + section state
  document.querySelectorAll<HTMLElement>('.substep-done[data-done]').forEach((el) => {
    const on = Boolean(p.done[el.dataset.done!]);
    const btn = el.querySelector('button');
    btn?.setAttribute('aria-pressed', String(on));
    const label = btn?.querySelector('.label');
    if (label) label.textContent = on ? t('done.done') : t('done.mark');
    const box = btn?.querySelector('.box');
    if (box) box.textContent = on ? '✓' : '';
    el.closest<HTMLElement>('.substep')?.setAttribute('data-state', on ? 'done' : 'open');
  });
  document.querySelectorAll<HTMLElement>('[data-toc-done]').forEach((el) => {
    el.toggleAttribute('data-checked', Boolean(p.done[el.dataset.tocDone!]));
  });

  // progress readouts
  const outline: Record<string, string[]> = (window as any).__PIAT_OUTLINE__ ?? {};
  let all = 0;
  let allDone = 0;
  for (const [step, subs] of Object.entries(outline)) {
    const n = subs.filter((s) => p.done[`${step}/${s}`]).length;
    all += subs.length;
    allDone += n;
    document.querySelectorAll<HTMLElement>(`[data-progress-step="${step}"]`).forEach((el) => {
      el.style.setProperty('--pct', subs.length ? String(n / subs.length) : '0');
      el.dataset.state = n === 0 ? 'todo' : n === subs.length ? 'done' : 'doing';
      const txt = el.querySelector<HTMLElement>('[data-progress-text]');
      if (txt) txt.textContent = t(progressKey(txt, 'progress.of'), { done: n, total: subs.length });
    });
  }
  document.querySelectorAll<HTMLElement>('[data-progress-total]').forEach((el) => {
    el.style.setProperty('--pct', all ? String(allDone / all) : '0');
    const txt = el.querySelector<HTMLElement>('[data-progress-text]');
    if (txt) txt.textContent = t(progressKey(txt, 'progress.total'), { done: allDone, total: all });
  });

  document.querySelectorAll<HTMLElement>('[data-project-name]').forEach((el) => {
    el.textContent = p.name;
  });

  // site-added: "you haven't recorded permission for your lot yet" (veteran-organizer D2)
  document.querySelectorAll<HTMLElement>('[data-lot-agreement-notice]').forEach((el) => {
    const dismissed = Boolean(p.extra['lotNoticeDismissed']);
    const secured = Boolean(p.done['acquire/secure-your-lot']) || Boolean(p.fields['acquire.agreement']);
    el.hidden = dismissed || secured;
  });
}

function start() {
  bindFields(document);
  $project.subscribe((p) => render(p));
  // Widgets that render fields later can ask for a re-bind.
  document.addEventListener('piat:bind', (e) => {
    bindFields((e.target as ParentNode) ?? document);
    render($project.get());
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
