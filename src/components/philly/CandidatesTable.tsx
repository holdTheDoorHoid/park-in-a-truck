/** @jsxImportSource preact */
// The Acquire workbook's "List the addresses of potential park properties",
// as a side-by-side comparison of what the City says about each.

import type { LotRecord } from '../../lib/types';
import type { LotExtra } from '../../lib/philly/types';
import { isPublic, ownerNames } from '../../lib/philly/owner';
import { landBankLine } from '../../lib/philly/landbank';
import { sizeOf } from '../../lib/philly/choose';
import { feet, sqft, titleCase } from '../../lib/philly/plain';
import { words, type PhillyKey } from '../../lib/philly/words';

const LOT_TYPE: Record<string, PhillyKey | null> = { 'mid-block': 'compare.midBlock', corner: 'compare.corner', alley: 'lotType.alley', unknown: null };

interface Props {
  candidates: LotRecord[];
  chosenAddress: string | null;
  onChoose: (l: LotRecord) => void;
  onRemove: (address: string) => void;
}

export default function CandidatesTable({ candidates, chosenAddress, onChoose, onRemove }: Props) {
  const t = words();
  if (!candidates.length) return <p class="ph-small">{t('compare.empty')}</p>;
  const col = {
    address: t('compare.address'),
    owner: t('card.owner'),
    lotSize: t('card.lotSize'),
    parkSize: t('card.parkSize'),
    lotType: t('card.lotType'),
    zoning: t('card.zoning'),
    vacant: t('compare.vacantList'),
  };
  return (
    <div>
      <h4 style="margin:1.2em 0 0.3em">{t('compare.title', { count: candidates.length })}</h4>
      <table class="ph-compare">
        <caption class="visually-hidden">{t('compare.caption')}</caption>
        <thead>
          <tr>
            <th scope="col">{col.address}</th>
            <th scope="col">{col.owner}</th>
            <th scope="col">{col.lotSize}</th>
            <th scope="col">{col.parkSize}</th>
            <th scope="col">{col.lotType}</th>
            <th scope="col">{col.zoning}</th>
            <th scope="col">{col.vacant}</th>
            <th scope="col">
              <span class="visually-hidden">{t('compare.actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => {
            const x = (c.extra ?? {}) as LotExtra;
            const g = x.geometry;
            const size = g ? sizeOf(g) : null;
            const chosen = c.address === chosenAddress;
            const type = LOT_TYPE[c.lotType ?? 'unknown'];
            return (
              <tr data-chosen={chosen ? '' : undefined}>
                <td data-label={col.address}>
                  {titleCase(c.address)}
                  {chosen && <span class="ph-saved"> {t('compare.yourLot')}</span>}
                </td>
                <td data-label={col.owner}>
                  {ownerNames(c.owners) || '—'}
                  <br />
                  <small class="ph-small">{t(isPublic(c.ownerType) ? 'compare.public' : c.ownerType === 'private' ? 'compare.private' : 'compare.unknown')}</small>
                  {x.landBank ? (
                    <>
                      <br />
                      <small class="ph-small">
                        {t('landBank.prefix')} <span class={`ph-lb ph-lb-${x.landBank.tone}`}>{landBankLine(x.landBank)}</span>
                      </small>
                    </>
                  ) : x.landBank === null && isPublic(c.ownerType) ? (
                    <>
                      <br />
                      <small class="ph-small">{t('compare.notInInventory')}</small>
                    </>
                  ) : null}
                </td>
                <td data-label={col.lotSize}>
                  {g
                    ? t('compare.size', { width: feet(g.widthFt, 0), length: feet(g.lengthFt, 0) })
                    : c.frontageFt && c.depthFt
                      ? t('size.recordShort', { frontage: String(c.frontageFt), depth: String(c.depthFt) })
                      : '—'}
                  <br />
                  <small class="ph-small">{sqft(g?.areaSqFt ?? c.areaSqFt)}</small>
                </td>
                <td data-label={col.parkSize}>{size ? (size.tooSmall ? t('compare.underA') : size.tooBig ? t('compare.overE') : size.id) : '—'}</td>
                <td data-label={col.lotType}>{type ? t(type) : '—'}</td>
                <td data-label={col.zoning}>{c.zoning ?? '—'}</td>
                <td data-label={col.vacant}>{c.vacantLand ? t('compare.yes') : c.vacantLand === false ? t('compare.no') : '—'}</td>
                <td>
                  <div class="ph-row-actions">
                    {!chosen && (
                      <button class="btn btn-small btn-primary" type="button" onClick={() => onChoose(c)}>
                        {t('compare.make')}
                      </button>
                    )}
                    <button
                      class="btn btn-small"
                      type="button"
                      aria-label={t('compare.removeLabel', { address: titleCase(c.address) })}
                      onClick={() => onRemove(c.address)}
                    >
                      {t('compare.remove')}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
