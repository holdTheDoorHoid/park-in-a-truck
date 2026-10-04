/** @jsxImportSource preact */
// Everything about one looked-up lot, in plain words, with the Acquire
// workbook's next steps for its owner type.

import type { ComponentChildren } from 'preact';
import type { LotRecord } from '../../lib/types';
import type { LotExtra } from '../../lib/philly/types';
import { acquirePaths, isPublic, OWNER_TYPE_LABEL } from '../../lib/philly/owner';
import { feet, sqft, titleCase, zoningPlain } from '../../lib/philly/plain';
import LotOutline from './LotOutline';

const LOT_TYPE: Record<string, string> = {
  'mid-block': 'Mid-block lot',
  corner: 'Corner lot',
  alley: 'Breezeway / alley',
  unknown: 'Not sure',
};

export function sizeLine(lot: LotRecord): ComponentChildren {
  const g = (lot.extra as LotExtra | undefined)?.geometry;
  if (!g) {
    return lot.frontageFt && lot.depthFt ? (
      <>
        {lot.frontageFt} × {lot.depthFt} ft (City records){lot.areaSqFt ? ` · ${sqft(lot.areaSqFt)}` : ''}
      </>
    ) : (
      '—'
    );
  }
  return (
    <>
      {feet(g.widthFt)} × {feet(g.lengthFt)} · {sqft(g.areaSqFt)}
      {g.irregular && <small> · irregular shape (size of the rectangle around it)</small>}
    </>
  );
}

export function parkSizeLine(lot: LotRecord): ComponentChildren {
  const g = (lot.extra as LotExtra | undefined)?.geometry;
  if (!g) return '—';
  if (g.size.tooSmall)
    return (
      <>
        Smaller than size A — the Park Patch workbook fits small spaces better.{' '}
        <small>(Nearest: size {g.size.id})</small>
      </>
    );
  if (g.size.tooBig)
    return (
      <>
        Bigger than size E — start from size E and expand. <small>(Dream workbook)</small>
      </>
    );
  return (
    <>
      <strong>Size {g.size.id}</strong>
      {g.size.exact ? '' : ' (closest fit)'} <small>— the Park in a Truck piece set for this lot</small>
    </>
  );
}

interface Props {
  lot: LotRecord;
  /** buttons under the card */
  actions?: ComponentChildren;
  /** "your lot" badge etc. */
  badge?: ComponentChildren;
  /** hide the next-steps box (e.g. in the map popup) */
  compact?: boolean;
}

export default function LotCard({ lot, actions, badge, compact }: Props) {
  const x = (lot.extra ?? {}) as LotExtra;
  const g = x.geometry;
  const pub = isPublic(lot.ownerType);
  const paths = acquirePaths(lot.ownerType);
  return (
    <article class="ph-card" aria-label={`City records for ${titleCase(lot.address)}`}>
      <header class="ph-card-head">
        <div>
          <h3 class="ph-card-title">{titleCase(lot.address)}</h3>
          <p class="ph-card-sub">
            {[x.neighborhood, x.zip && `Philadelphia ${x.zip}`, lot.opa && `OPA #${lot.opa}`].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div>
          {badge}{' '}
          <span class={`ph-badge ${pub ? 'ph-badge-public' : 'ph-badge-private'}`}>{pub ? 'Public owner' : lot.ownerType === 'unknown' ? 'Owner unknown' : 'Private owner'}</span>
        </div>
      </header>

      <div class="ph-card-body">
        <dl class="ph-facts">
          <dt>Owner</dt>
          <dd>
            {lot.owners.length ? lot.owners.join(' & ') : 'Not on record'}
            <br />
            <small>
              {OWNER_TYPE_LABEL[lot.ownerType]}
              {lot.ownerType === 'other-public' && x.ownerLabel ? ` — ${x.ownerLabel}` : ''}
            </small>
          </dd>
          {!pub && x.ownerMailing && (
            <>
              <dt>Owner's mailing address</dt>
              <dd>
                {titleCase(x.ownerMailing)} <small>(as the City has it on file)</small>
              </dd>
            </>
          )}
          <dt>Lot size</dt>
          <dd>{sizeLine(lot)}</dd>
          <dt>Park size</dt>
          <dd>{parkSizeLine(lot)}</dd>
          <dt>Lot type</dt>
          <dd>
            {LOT_TYPE[lot.lotType ?? 'unknown']}
            {g?.lotTypeReason && (
              <>
                <br />
                <small>{g.lotTypeReason}</small>
              </>
            )}
          </dd>
          <dt>Zoning</dt>
          <dd>{zoningPlain(lot.zoning) ?? '—'}</dd>
          <dt>Vacant?</dt>
          <dd>
            {lot.vacantLand
              ? "Yes — on the City's list of vacant land"
              : lot.category === 'VACANT LAND'
                ? "Recorded as vacant land, but not on the City's current vacant-land list (it may be in use)"
                : lot.vacantLand === false
                  ? `Not on the City's vacant-land list${lot.buildingDescription ? ` · ${titleCase(lot.buildingDescription)}` : ''}`
                  : '—'}
          </dd>
          {!compact && (
            <>
              <dt>Council district</dt>
              <dd>
                {lot.councilDistrict ? `District ${lot.councilDistrict}` : '—'}
                {x.councilMember ? ` — Councilmember ${x.councilMember}` : ''}
              </dd>
              {lot.rcos && lot.rcos.length > 0 && (
                <>
                  <dt>Community groups (RCOs)</dt>
                  <dd>{lot.rcos.map((r) => r.name).join(' · ')}</dd>
                </>
              )}
              <dt>Flood zone</dt>
              <dd>{x.floodZoneLabel ?? '—'}</dd>
            </>
          )}
        </dl>
        {lot.polygon.length >= 3 && <LotOutline lot={lot} />}
      </div>

      {!compact && (
        <section class="ph-paths" aria-label="What this means for getting the lot">
          <h4>{pub ? 'Public owner — your path' : 'Private owner — four ways forward'}</h4>
          <ul>
            {paths.map((p) => (
              <li>
                <strong>{p.title}.</strong> {p.text}
                {p.link && (
                  <>
                    {' '}
                    <a href={p.link.url} target="_blank" rel="noopener">
                      {p.link.label} ↗
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {x.warnings && x.warnings.length > 0 && <p class="ph-small">Some details are missing: {x.warnings.join(' ')}</p>}

      {actions && <div class="ph-actions">{actions}</div>}

      {!compact && (
        <p class="ph-sources">
          <strong>Check it yourself: </strong>
          {lot.sources.map((s) => (
            <a href={s.url} target="_blank" rel="noopener">
              {s.label} ↗
            </a>
          ))}
        </p>
      )}
    </article>
  );
}
