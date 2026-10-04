/** @jsxImportSource preact */
// Everything about one looked-up lot, in plain words, with the Acquire
// workbook's next steps for its owner type.

import type { ComponentChildren } from 'preact';
import type { LotRecord } from '../../lib/types';
import type { LotExtra } from '../../lib/philly/types';
import { acquirePaths, agencyName, isPublic, landBankHandles, ownerNames, ownerTypeLabel } from '../../lib/philly/owner';
import { landBankLine, sideYardMeans } from '../../lib/philly/landbank';
import { sizeOf } from '../../lib/philly/choose';
import { links } from '../../lib/philly/endpoints';
import { feet, floodText, sqft, titleCase, zoningPlain } from '../../lib/philly/plain';
import { lotTypeReasonText, sourceLabel, warningText } from '../../lib/philly/saved';
import { words, type PhillyKey } from '../../lib/philly/words';
import { urlFor } from '../../i18n/url.ts';
import LotOutline from './LotOutline';

export const LOT_TYPE_KEY: Record<string, PhillyKey> = {
  'mid-block': 'lotType.midBlock',
  corner: 'lotType.corner',
  alley: 'lotType.alley',
  unknown: 'lotType.unknown',
};

export function sizeLine(lot: LotRecord): ComponentChildren {
  const t = words();
  const g = (lot.extra as LotExtra | undefined)?.geometry;
  if (!g) {
    if (!(lot.frontageFt && lot.depthFt)) return '—';
    const v = { frontage: String(lot.frontageFt), depth: String(lot.depthFt) };
    return lot.areaSqFt ? t('size.recordArea', { ...v, area: sqft(lot.areaSqFt) }) : t('size.record', v);
  }
  return (
    <>
      {t('size.measured', { width: feet(g.widthFt), length: feet(g.lengthFt), area: sqft(g.areaSqFt) })}
      {g.irregular && <small> · {t('size.irregular')}</small>}
    </>
  );
}

export function parkSizeLine(lot: LotRecord): ComponentChildren {
  const t = words();
  const g = (lot.extra as LotExtra | undefined)?.geometry;
  if (!g) return '—';
  const size = sizeOf(g);
  if (size.tooSmall)
    return (
      <>
        <span dangerouslySetInnerHTML={{ __html: t.html('park.tooSmall', { href: urlFor(t.locale)('park-patch/') }) }} />{' '}
        <small>{t('park.nearest', { size: size.id })}</small>
      </>
    );
  if (size.tooBig)
    return (
      <>
        {t('park.tooBig')} <small>{t('park.dreamWorkbook')}</small>
      </>
    );
  return (
    <>
      <strong>{t('park.size', { size: size.id })}</strong>
      {size.exact ? '' : ` ${t('park.closest')}`} <small>{t('park.pieceSet')}</small>
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
  const t = words();
  const x = (lot.extra ?? {}) as LotExtra;
  const g = x.geometry;
  const pub = isPublic(lot.ownerType);
  const paths = acquirePaths(lot.ownerType, x.ownerLabel);
  const lb = x.landBank;
  const sold = !pub && lot.lastSale?.date ? new Date(lot.lastSale.date) : null;
  // the sale's calendar day as the City records it (UTC), so the month never shifts with the time zone
  const soldDay = sold && !Number.isNaN(sold.getTime()) ? sold.toISOString().slice(0, 10) : null;
  const vacant = lot.vacantLand
    ? t('card.vacantYes')
    : lot.category === 'VACANT LAND'
      ? t('card.vacantRecorded')
      : lot.vacantLand === false
        ? lot.category
          ? t('card.vacantNoCategory', { category: lot.category.toLowerCase().replace(/\s+/g, ' ').trim() })
          : t('card.vacantNo')
        : '—';
  return (
    <article class="ph-card" aria-label={t('card.label', { address: titleCase(lot.address) })}>
      <header class="ph-card-head">
        <div>
          <h3 class="ph-card-title" tabIndex={titleFocusable ? -1 : undefined}>
            {titleCase(lot.address)}
          </h3>
          <p class="ph-card-sub">
            {[
              x.planningDistrict && t('card.district', { district: x.planningDistrict }),
              x.zip && t('card.zip', { zip: x.zip }),
              lot.opa && t('card.opa', { opa: lot.opa }),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        <div>
          {badge}{' '}
          <span class={`ph-badge ${pub ? 'ph-badge-public' : 'ph-badge-private'}`}>
            {t(pub ? 'badge.public' : lot.ownerType === 'unknown' ? 'badge.unknown' : 'badge.private')}
          </span>
        </div>
      </header>

      <div class="ph-card-body">
        <dl class="ph-facts">
          <dt>{t('card.owner')}</dt>
          <dd>
            {lot.owners.length ? ownerNames(lot.owners) : t('card.notOnRecord')}
            <br />
            <small>
              {ownerTypeLabel(lot.ownerType)}
              {lot.ownerType === 'other-public' && x.ownerLabel ? ` — ${agencyName(x.ownerLabel)}` : ''}
            </small>
          </dd>
          {lb || (pub && lb === null) ? (
            <>
              <dt>{t('card.landBank')}</dt>
              <dd>
                {lb ? (
                  <>
                    <span class={`ph-lb ph-lb-${lb.tone}`}>{landBankLine(lb)}</span>
                    {lb.sideYard && (
                      <>
                        <br />
                        <small>{sideYardMeans()}</small>
                      </>
                    )}
                  </>
                ) : landBankHandles(lot.ownerType, x.ownerLabel) ? (
                  t('card.lbNotInInventory')
                ) : (
                  t('card.lbSeparate')
                )}
                {(lb || landBankHandles(lot.ownerType, x.ownerLabel)) && (
                  <>
                    <br />
                    <small>
                      {t('card.lbFrom')}{' '}
                      <a href={links.landBankMap} target="_blank" rel="noopener">
                        {t('card.lbMap')} ↗
                      </a>
                    </small>
                  </>
                )}
              </dd>
            </>
          ) : null}
          {soldDay && (
            <>
              <dt>{t('card.lastSold')}</dt>
              <dd>
                {t.date(soldDay, 'month-year')} <small>{t('card.cityRecords')}</small>
              </dd>
            </>
          )}
          {!pub && x.ownerMailing && (
            <>
              <dt>{t('card.mailing')}</dt>
              <dd>
                {titleCase(x.ownerMailing)} <small>{t('card.asOnFile')}</small>
              </dd>
            </>
          )}
          <dt>{t('card.lotSize')}</dt>
          <dd>{sizeLine(lot)}</dd>
          <dt>{t('card.parkSize')}</dt>
          <dd>{parkSizeLine(lot)}</dd>
          <dt>{t('card.lotType')}</dt>
          <dd>
            {t(LOT_TYPE_KEY[lot.lotType ?? 'unknown'] ?? 'lotType.unknown')}
            {g?.lotTypeReason && (
              <>
                <br />
                <small>{lotTypeReasonText(g)}</small>
              </>
            )}
          </dd>
          <dt>{t('card.zoning')}</dt>
          <dd>{zoningPlain(lot.zoning) ?? '—'}</dd>
          <dt>{t('card.vacant')}</dt>
          <dd>{vacant}</dd>
          {!compact && (
            <>
              <dt>{t('card.council')}</dt>
              <dd>
                {lot.councilDistrict
                  ? x.councilMember
                    ? t('card.councilMember', { district: String(lot.councilDistrict), member: x.councilMember })
                    : t('card.councilDistrict', { district: String(lot.councilDistrict) })
                  : '—'}
              </dd>
              {lot.rcos && lot.rcos.length > 0 && (
                <>
                  <dt>{t('card.rcos')}</dt>
                  <dd>{lot.rcos.map((r) => r.name).join(' · ')}</dd>
                </>
              )}
              <dt>{t('card.flood')}</dt>
              <dd>{x.floodZoneLabel ? floodText(x.floodZoneLabel) : '—'}</dd>
            </>
          )}
        </dl>
        {lot.polygon.length >= 3 && <LotOutline lot={lot} />}
      </div>

      {!compact && (
        <section class="ph-paths" aria-label={t('paths.label')}>
          <h4>{t(pub ? 'paths.public' : 'paths.private')}</h4>
          <ul>
            {paths.map((p) => (
              <li>
                <strong>{t('paths.titleDot', { title: p.title })}</strong> {p.text}
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

      {x.warnings && x.warnings.length > 0 && (
        <p class="ph-small">{t('card.missing', { warnings: x.warnings.map((w) => warningText(w)).join(' ') })}</p>
      )}

      {actions && <div class="ph-actions">{actions}</div>}

      {!compact && (
        <p class="ph-sources">
          <strong>{t('card.checkIt')} </strong>
          {lot.sources.map((s) => (
            <a href={s.url} target="_blank" rel="noopener">
              {sourceLabel(s.label)} ↗
            </a>
          ))}
        </p>
      )}
    </article>
  );
}
