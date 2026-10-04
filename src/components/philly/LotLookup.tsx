/** @jsxImportSource preact */
// LotLookup — "Who owns that lot?" done for you.
//   mode="primary":    look up an address, see owner/size/zoning…, "Use this as my park lot"
//   mode="candidates": the same, plus the saved list of possible lots as a comparison table

import { useRef, useState } from 'preact/hooks';
import type { LotRecord } from '../../lib/types';
import { addCandidate, removeCandidate } from '../../lib/project';
import { lookupLot, type LotQuery } from '../../lib/philly/lookup';
import { chooseLot } from '../../lib/philly/choose';
import { PhillyError, type AddressSuggestion } from '../../lib/philly/types';
import { titleCase } from '../../lib/philly/plain';
import { u } from '../../lib/url';
import AddressSearch from './AddressSearch';
import LotCard from './LotCard';
import CandidatesTable from './CandidatesTable';
import SaveToggle from './SaveToggle';
import { useProject } from './hooks';

/** Where the vacant-land map is: on this page if it has one, else the Find a lot page. */
export function mapHref(): string {
  return typeof document !== 'undefined' && document.getElementById('vacant-map') ? '#vacant-map' : u('lot/#vacant-map');
}

/** Does this page have workbook fields that fill themselves from the chosen lot? */
function pageHasLotFields(): boolean {
  return typeof document !== 'undefined' && Boolean(document.querySelector('[data-auto^="lot."]'));
}

interface Props {
  mode?: 'primary' | 'candidates';
}

export default function LotLookup({ mode = 'primary' }: Props) {
  const project = useProject();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<PhillyError | null>(null);
  const [result, setResult] = useState<LotRecord | null>(null);
  const [lastQuery, setLastQuery] = useState<LotQuery | null>(null);
  const [searching, setSearching] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  const run = async (q: LotQuery, opts: { refresh?: boolean } = {}) => {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setBusy(true);
    setError(null);
    setFlash(null);
    setLastQuery(q);
    try {
      const r = await lookupLot(q, { signal: c.signal });
      if (c.signal.aborted) return;
      if (opts.refresh && project.lot && project.lot.address === r.address) {
        // "Refresh from City records": update the saved lot in place
        chooseLot(r);
        setFlash('Updated from City records.');
      } else {
        setResult(r);
        // "Add a possible lot by address" adds it: no second step to miss (veteran S10)
        if (mode === 'candidates' && !project.candidates.some((c) => c.address === r.address)) {
          addCandidate(r);
          setFlash(`Added ${titleCase(r.address)} to your list of possible lots — it's in the table below.`);
        }
      }
    } catch (e) {
      if (c.signal.aborted) return;
      setResult(null);
      setError(e instanceof PhillyError ? e : new PhillyError('city-down', 'Something went wrong looking that up. Try again in a minute.'));
    } finally {
      if (!c.signal.aborted) setBusy(false);
    }
  };

  const pick = (q: AddressSuggestion | string) => run(q);

  const chosen = project.lot;
  const isChosen = (l: LotRecord | null) => Boolean(l && chosen && chosen.address === l.address);
  const isListed = (l: LotRecord | null) => Boolean(l && project.candidates.some((c) => c.address === l.address));

  const use = (l: LotRecord) => {
    chooseLot(l);
    setFlash(
      `${titleCase(l.address)} is now your park lot.${pageHasLotFields() ? ' The owner and address fields on this page are filled in from City records.' : ''}`,
    );
    setSearching(false);
  };
  const list = (l: LotRecord) => {
    addCandidate(l);
    setFlash(`Added ${titleCase(l.address)} to your list of possible lots.`);
  };

  const actionsFor = (l: LotRecord) => (
    <>
      <SaveToggle primary done={isChosen(l)} doneText="✓ This is your park lot" onClick={() => use(l)}>
        Use this as my park lot
      </SaveToggle>
      <SaveToggle done={isListed(l)} doneText="✓ On your list" onClick={() => list(l)}>
        + Add to my list
      </SaveToggle>
    </>
  );

  // Primary mode with a lot already chosen: show it, offer to look up another.
  const showChosen = mode === 'primary' && chosen && !result && !searching && !busy && !error;

  return (
    <div class="ph ph-lookup" data-mode={mode}>
      {showChosen ? (
        <>
          <LotCard
            lot={chosen!}
            badge={<span class="ph-badge ph-badge-ok">Your park lot</span>}
            actions={
              <>
                <button class="btn" type="button" onClick={() => setSearching(true)}>
                  Look up a different lot
                </button>
                <button class="btn" type="button" onClick={() => run({ opa: chosen!.opa! }, { refresh: true })} disabled={!chosen!.opa}>
                  Refresh from City records
                </button>
                <a class="btn" href={u('lot/')}>
                  Find lots on the map
                </a>
              </>
            }
          />
        </>
      ) : (
        <AddressSearch
          label={mode === 'candidates' ? 'Add a possible lot by address' : 'Address of the lot'}
          placeholder={mode === 'candidates' ? 'Address to add, e.g. 2424 N Mole St' : 'e.g. 1322 N Dover St'}
          hint={
            mode === 'candidates'
              ? 'Looks the lot up and adds it to your list of possible lots below.'
              : 'A Philadelphia street address, a corner like "60th & Greenway", or a 9-digit OPA number.'
          }
          buttonLabel={mode === 'candidates' ? 'Add' : 'Look up'}
          busy={busy}
          onPick={pick}
        />
      )}

      <div aria-live="polite">
        {busy && (
          <p class="ph-status">
            <span class="ph-spinner" aria-hidden="true" />
            Checking City records (owner, size, zoning, vacancy)…
          </p>
        )}
        {flash && <p class="ph-status ph-saved">✓ {flash}</p>}
        {error && (
          <div class="ph-error" role="alert">
            <p>{error.message}</p>
            {error.suggestions.length > 0 && (
              <div class="ph-chips">
                {error.suggestions.map((s) => (
                  <button class="ph-chip" type="button" onClick={() => run(s)}>
                    {titleCase(s.label)}
                    {s.owner ? <small> · {titleCase(s.owner)}</small> : null}
                  </button>
                ))}
              </div>
            )}
            {error.code === 'city-down' && lastQuery && (
              <button class="btn btn-small" type="button" onClick={() => run(lastQuery)}>
                Try again
              </button>
            )}
            {error.code === 'intersection' && (
              <p class="ph-small">
                Or <a href={mapHref()}>browse the vacant-land map</a>.
              </p>
            )}
            {error.code === 'not-found' && (
              <p class="ph-small">
                Only know the street, not the house number? Type the street name into the{' '}
                <a href={mapHref()}>vacant-land map's "Go to an address or corner" box</a> and pick your block — the map shows the vacant
                lots on it.
              </p>
            )}
          </div>
        )}
      </div>

      {result && !busy && <LotCard lot={result} actions={actionsFor(result)} />}

      {mode === 'candidates' && (
        <CandidatesTable
          candidates={project.candidates}
          chosenAddress={chosen?.address ?? null}
          onChoose={(l) => use(l)}
          onRemove={(a) => removeCandidate(a)}
        />
      )}
    </div>
  );
}
