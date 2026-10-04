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
//   [data-project-name]          the active project's name
//
// Content authors never write this markup by hand; the components in
// src/components/workbook/ emit it.

import { $project, setField, setDone } from '../lib/project';
import { resolveAuto } from '../lib/autofill';
import type { Project } from '../lib/types';

type Col = { key: string; label: string; type?: string; placeholder?: string };

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

  root.querySelectorAll<HTMLElement>('.substep-done[data-done]').forEach((el) => {
    if (el.dataset.bound) return;
    el.dataset.bound = '1';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'done-toggle';
    btn.innerHTML = '<span class="box" aria-hidden="true"></span><span class="label">Mark this step done</span>';
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
    thx.innerHTML = '<span class="visually-hidden">Remove</span>';
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
        inp.setAttribute('aria-label', `${c.label}, row ${i + 1}`);
        inp.addEventListener('input', save);
        td.append(inp);
        tr.append(td);
      });
      const td = document.createElement('td');
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'row-remove';
      rm.textContent = '×';
      rm.setAttribute('aria-label', `Remove row ${i + 1}`);
      rm.addEventListener('click', () => {
        tr.remove();
        host.dataset.rows = '';
        save();
      });
      td.append(rm);
      tr.append(td);
      tbody.append(tr);
    });
    table.append(tbody);
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'btn btn-small';
    add.textContent = `+ Add ${host.dataset.rowName || 'row'}`;
    add.addEventListener('click', () => {
      blankRows.set(host, (blankRows.get(host) ?? 0) + 1);
      renderLists($project.get());
      host.querySelector<HTMLInputElement>('tbody tr:last-child input')?.focus();
    });
    host.replaceChildren(table, add);
  });
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
    const auto = el.dataset.auto ? resolveAuto(p, el.dataset.auto) : null;
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
    if (label) label.textContent = on ? 'Done — nice work!' : 'Mark this step done';
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
      const t = el.querySelector('[data-progress-text]');
      if (t) t.textContent = `${n} of ${subs.length}`;
    });
  }
  document.querySelectorAll<HTMLElement>('[data-progress-total]').forEach((el) => {
    el.style.setProperty('--pct', all ? String(allDone / all) : '0');
    const t = el.querySelector('[data-progress-text]');
    if (t) t.textContent = `${allDone} of ${all} steps done`;
  });

  document.querySelectorAll<HTMLElement>('[data-project-name]').forEach((el) => {
    el.textContent = p.name;
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
