/** @jsxImportSource preact */
// The Acquire workbook's "List the addresses of potential park properties",
// as a side-by-side comparison of what the City says about each.

import type { LotRecord } from '../../lib/types';
import type { LotExtra } from '../../lib/philly/types';
import { isPublic, ownerNames } from '../../lib/philly/owner';
import { landBankLine } from '../../lib/philly/landbank';
import { sizeOf } from '../../lib/philly/choose';
import { feet, sqft, titleCase } from '../../lib/philly/plain';

const LOT_TYPE: Record<string, string> = { 'mid-block': 'Mid-block', corner: 'Corner', alley: 'Breezeway / alley', unknown: '—' };

interface Props {
  candidates: LotRecord[];
  chosenAddress: string | null;
  onChoose: (l: LotRecord) => void;
  onRemove: (address: string) => void;
}

export default function CandidatesTable({ candidates, chosenAddress, onChoose, onRemove }: Props) {
  if (!candidates.length)
    return <p class="ph-small">Your list of possible lots is empty. Look up an address above, or add lots from the map.</p>;
  return (
    <div>
      <h4 style="margin:1.2em 0 0.3em">Your possible lots ({candidates.length})</h4>
      <table class="ph-compare">
        <caption class="visually-hidden">Possible park lots compared</caption>
        <thead>
          <tr>
            <th scope="col">Address</th>
            <th scope="col">Owner</th>
            <th scope="col">Lot size</th>
            <th scope="col">Park size</th>
            <th scope="col">Lot type</th>
            <th scope="col">Zoning</th>
            <th scope="col">Vacant list</th>
            <th scope="col">
              <span class="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => {
            const x = (c.extra ?? {}) as LotExtra;
            const g = x.geometry;
            const size = g ? sizeOf(g) : null;
            const chosen = c.address === chosenAddress;
            return (
              <tr data-chosen={chosen ? '' : undefined}>
                <td data-label="Address">
                  {titleCase(c.address)}
                  {chosen && <span class="ph-saved"> ✓ your lot</span>}
                </td>
                <td data-label="Owner">
                  {ownerNames(c.owners) || '—'}
                  <br />
                  <small class="ph-small">{isPublic(c.ownerType) ? 'Public' : c.ownerType === 'private' ? 'Private' : 'Unknown'}</small>
                  {x.landBank ? (
                    <>
                      <br />
                      <small class="ph-small">
                        Land Bank: <span class={`ph-lb ph-lb-${x.landBank.tone}`}>{landBankLine(x.landBank)}</span>
                      </small>
                    </>
                  ) : x.landBank === null && isPublic(c.ownerType) ? (
                    <>
                      <br />
                      <small class="ph-small">Not in the Land Bank's inventory</small>
                    </>
                  ) : null}
                </td>
                <td data-label="Lot size">
                  {g ? `${feet(g.widthFt, 0)} × ${feet(g.lengthFt, 0)}` : c.frontageFt && c.depthFt ? `${c.frontageFt} × ${c.depthFt} ft` : '—'}
                  <br />
                  <small class="ph-small">{sqft(g?.areaSqFt ?? c.areaSqFt)}</small>
                </td>
                <td data-label="Park size">{size ? (size.tooSmall ? 'Under A (Park Patch)' : size.tooBig ? 'Over E' : size.id) : '—'}</td>
                <td data-label="Lot type">{LOT_TYPE[c.lotType ?? 'unknown']}</td>
                <td data-label="Zoning">{c.zoning ?? '—'}</td>
                <td data-label="Vacant list">{c.vacantLand ? 'Yes' : c.vacantLand === false ? 'No' : '—'}</td>
                <td>
                  <div class="ph-row-actions">
                    {!chosen && (
                      <button class="btn btn-small btn-primary" type="button" onClick={() => onChoose(c)}>
                        Make this my lot
                      </button>
                    )}
                    <button class="btn btn-small" type="button" aria-label={`Remove ${titleCase(c.address)} from the list`} onClick={() => onRemove(c.address)}>
                      Remove
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
