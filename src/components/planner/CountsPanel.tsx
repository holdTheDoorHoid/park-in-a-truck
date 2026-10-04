/** @jsxImportSource preact */
import { useStore } from '@nanostores/preact';
import type { PlannerStore } from '../../lib/planner/store';
import { catalogEntry } from '../../lib/planner/catalog';
import { urlFor } from '../../i18n/url';
import { pt } from '../../lib/planner/words';
import { USING_PLACEHOLDER_PIECES } from '../../lib/planner/park';
import { ELEMENTS } from '../../data/elements';

export function CountsPanel({ store }: { store: PlannerStore }) {
  const tally = useStore(store.$tally);
  const grid = useStore(store.$sunGrid);
  if (!tally) return null;
  const t = pt();
  const u = urlFor(t.locale);
  // the gabion wall is counted in feet (the band along the street edges plus any 4-ft wall
  // pieces added), the way the cost estimate buys its baskets (build-lead A4)
  const wallPieces = tally.items['gabion-wall'] ?? 0;
  const wallFt = Math.round((tally.gabionWallFt ?? 0) + wallPieces * (ELEMENTS['gabion-wall']?.footprintFt?.[0] ?? 4));
  const items = Object.entries(tally.items)
    .filter(([id]) => id !== 'gabion-wall')
    .sort((a, b) => b[1] - a[1]);
  return (
    <section class="pl-section pl-counts">
      <h3 class="pl-h">{t('counts.title')}</h3>
      <table class="pl-table">
        <tbody>
          <tr>
            <th scope="row">
              {t('counts.length')} <span class="muted">{t('counts.lengthHint')}</span>
            </th>
            <td>{t('common.ft', { ft: tally.lengthFt, count: tally.lengthFt })}</td>
          </tr>
          <tr>
            <th scope="row">
              {t('counts.width')} <span class="muted">{t('counts.widthHint')}</span>
            </th>
            <td>{t('common.ft', { ft: tally.widthFt, count: tally.widthFt })}</td>
          </tr>
          <tr>
            <th scope="row">
              {t('counts.planting')} <span class="muted">{t('counts.plantingHint')}</span>
            </th>
            <td>{t.num(tally.plantingSquares.sun + tally.plantingSquares.shade)}</td>
          </tr>
          {wallFt > 0 && (
            <tr>
              <th scope="row">
                {t('counts.wall')}{' '}
                <span class="muted">{wallPieces ? t('counts.wallHintPieces', { count: wallPieces }) : t('counts.wallHint')}</span>
              </th>
              <td>{t('common.ft', { ft: wallFt, count: wallFt })}</td>
            </tr>
          )}
          {tally.naturePlaySquares > 0 && (
            <tr>
              <th scope="row">{t('counts.naturePlay')}</th>
              <td>{t.num(tally.naturePlaySquares)}</td>
            </tr>
          )}
        </tbody>
      </table>
      <h4 class="pl-h4">{t('counts.furnishings')}</h4>
      {items.length ? (
        <table class="pl-table">
          <tbody>
            {items.map(([id, n]) => (
              <tr>
                <th scope="row">{catalogEntry(id).name}</th>
                <td>{t.num(n)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p class="pl-small muted">{t('counts.none')}</p>
      )}

      <h3 class="pl-h">{t('counts.plantsTitle')}</h3>
      <table class="pl-table pl-table-3">
        <thead>
          <tr>
            <th />
            <th scope="col">{t('counts.sun')}</th>
            <th scope="col">{t('counts.shade')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">
              <span class="pl-sym pl-sym-perennial" aria-hidden="true" /> {t('counts.perennials')} <span class="muted">{t('counts.perennialsHint')}</span>
            </th>
            <td>{t.num(tally.plantingSquares.sun)}</td>
            <td>{t.num(tally.plantingSquares.shade)}</td>
          </tr>
          <tr>
            <th scope="row">
              <span class="pl-sym pl-sym-shrub" aria-hidden="true" /> {t('counts.shrubs')}
            </th>
            <td>{t.num(tally.shrubs.sun)}</td>
            <td>{t.num(tally.shrubs.shade)}</td>
          </tr>
          <tr>
            <th scope="row">
              <span class="pl-sym pl-sym-small" aria-hidden="true" /> {t('counts.smallTrees')}
            </th>
            <td colSpan={2}>{t.num(tally.smallTrees)}</td>
          </tr>
          <tr>
            <th scope="row">
              <span class="pl-sym pl-sym-large" aria-hidden="true" /> {t('counts.largeTrees')}
            </th>
            <td colSpan={2}>{t.num(tally.largeTrees)}</td>
          </tr>
        </tbody>
      </table>
      {!grid && <p class="pl-small pl-warn">{t('counts.allSun')}</p>}
      {USING_PLACEHOLDER_PIECES && <p class="pl-small muted">{t('counts.placeholder')}</p>}
      <div class="pl-row" style={{ marginTop: '12px' }}>
        <a class="btn btn-small btn-primary" href={u('steps/dream/')}>
          {t('counts.cost')}
        </a>
        <a class="btn btn-small" href={u('plants/')}>
          {t('counts.plants')}
        </a>
      </div>
      <p class="pl-small muted">{t('counts.saved')}</p>
    </section>
  );
}
