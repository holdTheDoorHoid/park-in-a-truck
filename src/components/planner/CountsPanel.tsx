/** @jsxImportSource preact */
import { useStore } from '@nanostores/preact';
import type { PlannerStore } from '../../lib/planner/store';
import { catalogEntry } from '../../lib/planner/catalog';
import { u } from '../../lib/url';
import { USING_PLACEHOLDER_PIECES } from '../../lib/planner/park';

export function CountsPanel({ store }: { store: PlannerStore }) {
  const t = useStore(store.$tally);
  const grid = useStore(store.$sunGrid);
  if (!t) return null;
  const items = Object.entries(t.items).sort((a, b) => b[1] - a[1]);
  return (
    <section class="pl-section pl-counts">
      <h3 class="pl-h">Count your pieces</h3>
      <table class="pl-table">
        <tbody>
          <tr>
            <th scope="row">
              Length <span class="muted">— the long side</span>
            </th>
            <td>{t.lengthFt} ft</td>
          </tr>
          <tr>
            <th scope="row">
              Width <span class="muted">— the short side</span>
            </th>
            <td>{t.widthFt} ft</td>
          </tr>
          <tr>
            <th scope="row">
              Planting <span class="muted">— green squares</span>
            </th>
            <td>{t.plantingSquares.sun + t.plantingSquares.shade}</td>
          </tr>
          {t.naturePlaySquares > 0 && (
            <tr>
              <th scope="row">Nature play squares</th>
              <td>{t.naturePlaySquares}</td>
            </tr>
          )}
        </tbody>
      </table>
      <h4 class="pl-h4">Furnishings</h4>
      {items.length ? (
        <table class="pl-table">
          <tbody>
            {items.map(([id, n]) => (
              <tr>
                <th scope="row">{catalogEntry(id).name}</th>
                <td>{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p class="pl-small muted">None yet.</p>
      )}

      <h3 class="pl-h">Count your plants</h3>
      <table class="pl-table pl-table-3">
        <thead>
          <tr>
            <th />
            <th scope="col">Sun</th>
            <th scope="col">Shade</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">
              <span class="pl-sym pl-sym-perennial" aria-hidden="true" /> Perennials <span class="muted">(green squares)</span>
            </th>
            <td>{t.plantingSquares.sun}</td>
            <td>{t.plantingSquares.shade}</td>
          </tr>
          <tr>
            <th scope="row">
              <span class="pl-sym pl-sym-shrub" aria-hidden="true" /> Shrubs
            </th>
            <td>{t.shrubs.sun}</td>
            <td>{t.shrubs.shade}</td>
          </tr>
          <tr>
            <th scope="row">
              <span class="pl-sym pl-sym-small" aria-hidden="true" /> Small trees
            </th>
            <td colSpan={2}>{t.smallTrees}</td>
          </tr>
          <tr>
            <th scope="row">
              <span class="pl-sym pl-sym-large" aria-hidden="true" /> Large trees
            </th>
            <td colSpan={2}>{t.largeTrees}</td>
          </tr>
        </tbody>
      </table>
      {!grid && <p class="pl-small pl-warn">Everything counts as sun until you work out the sun hours (Sun &amp; shade step).</p>}
      {USING_PLACEHOLDER_PIECES && (
        <p class="pl-small muted">These counts come from a stand-in park layout while the real Park in a Truck pieces are being added.</p>
      )}
      <div class="pl-row" style={{ marginTop: '12px' }}>
        <a class="btn btn-small btn-primary" href={u('steps/dream/')}>
          Estimate the cost →
        </a>
        <a class="btn btn-small" href={u('plants/')}>
          Pick your plants →
        </a>
      </div>
      <p class="pl-small muted">Your counts are saved with your project, so the cost estimate and plant picker use them.</p>
    </section>
  );
}
