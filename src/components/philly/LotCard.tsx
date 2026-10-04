/** @jsxImportSource preact */
// Everything about one looked-up lot, in plain words, with the Acquire
// workbook's next steps for its owner type.

import type { ComponentChildren } from 'preact';
import type { LotRecord } from '../../lib/types';
import type { LotExtra } from '../../lib/philly/types';
import { acquirePaths, isPublic, landBankHandles, ownerNames, OWNER_TYPE_LABEL } from '../../lib/philly/owner';
import { landBankLine, SIDE_YARD_MEANS } from '../../lib/philly/landbank';
import { sizeOf } from '../../lib/philly/choose';
import { links } from '../../lib/philly/endpoints';
import { feet, sqft, titleCase, zoningPlain } from '../../lib/philly/plain';
import LotOutline from './LotOutline';
import { u } from '../../lib/url';

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
  const size = sizeOf(g);
  if (size.tooSmall)
    return (
      <>
        Smaller than size A — the <a href={u('park-patch/')}>Park Patch workbook</a> fits small spaces better.{' '}
        <small>(Nearest: size {size.id})</small>
      </>
    );
  if (size.tooBig)
    return (
      <>
        Bigger than size E — start from size E and expand. <small>(Dream workbook)</small>
      </>
    );
  return (
    <>
      <strong>Size {size.id}</strong>
      {size.exact ? '' : ' (closest fit — the biggest set whose pieces fit inside the lot)'}{' '}
      <small>— the Park in a Truck piece set for this lot</small>
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
  /** let a script move keyboard focus to the card's heading (after "Details") */
  titleFocusable?: boolean;
}

export default function LotCard({ lot, actions, badge, compact, titleFocusable }: Props) {
  const x = (lot.extra ?? {}) as LotExtra;
  const g = x.geometry;
  const pub = isPublic(lot.ownerType);
  const paths = acquirePaths(lot.ownerType, x.ownerLabel);
  const lb = x.landBank;
  const sold = !pub && lot.lastSale?.date ? new Date(lot.lastSale.date) : null;
  return (
    <article class="ph-card" aria-label={`City records for ${titleCase(lot.address)}`}>
      <header class="ph-card-head">
        <div>
          <h3 class="ph-card-title" tabIndex={titleFocusable ? -1 : undefined}>
            {titleCase(lot.address)}
          </h3>
          <p class="ph-card-sub">
            {[x.planningDistrict && `${x.planningDistrict} planning district`, x.zip && `Philadelphia ${x.zip}`, lot.opa && `OPA #${lot.opa}`]
              .filter(Boolean)
              .join(' · ')}
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
            {lot.owners.length ? ownerNames(lot.owners) : 'Not on record'}
            <br />
            <small>
              {OWNER_TYPE_LABEL[lot.ownerType]}
              {lot.ownerType === 'other-public' && x.ownerLabel ? ` — ${x.ownerLabel}` : ''}
            </small>
          </dd>
          {lb || (pub && lb === null) ? (
            <>
              <dt>Land Bank status</dt>
              <dd>
                {lb ? (
                  <>
                    <span class={`ph-lb ph-lb-${lb.tone}`}>{landBankLine(lb)}</span>
                    {lb.sideYard && (
                      <>
                        <br />
                        <small>{SIDE_YARD_MEANS}</small>
                      </>
                    )}
                  </>
                ) : landBankHandles(lot.ownerType, x.ownerLabel) ? (
                  "Not in the Land Bank's inventory of public land"
                ) : (
                  "Not in the Land Bank's inventory — a separate agency owns it"
                )}
                {(lb || landBankHandles(lot.ownerType, x.ownerLabel)) && (
                  <>
                    <br />
                    <small>
                      From the Land Bank's own property list.{' '}
                      <a href={links.landBankMap} target="_blank" rel="noopener">
                        Land Bank property map ↗
                      </a>
                    </small>
                  </>
                )}
              </dd>
            </>
          ) : null}
          {sold && !Number.isNaN(sold.getTime()) && (
            <>
              <dt>Last sold</dt>
              <dd>
                {sold.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}{' '}
                <small>(City property records)</small>
              </dd>
            </>
          )}
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
                  ? `Not on the City's vacant-land list${lot.category ? ` (the property record lists it as ${lot.category.toLowerCase().replace(/\s+/g, ' ').trim()})` : ''}`
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
