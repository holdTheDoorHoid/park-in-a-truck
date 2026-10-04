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
import { useProject } from './hooks';

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
      } else setResult(r);
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
    setFlash(`${titleCase(l.address)} is now your park lot. The owner and address fields on this page are filled in from City records.`);
    setSearching(false);
  };
  const list = (l: LotRecord) => {
    addCandidate(l);
    setFlash(`Added ${titleCase(l.address)} to your list of possible lots.`);
  };

  const actionsFor = (l: LotRecord) => (
    <>
      {isChosen(l) ? (
        <span class="ph-saved">✓ This is your park lot</span>
      ) : (
        <button class="btn btn-primary" type="button" onClick={() => use(l)}>
          Use this as my park lot
        </button>
      )}
      {isListed(l) ? (
        <span class="ph-saved">✓ On your list</span>
      ) : (
        <button class="btn" type="button" onClick={() => list(l)}>
          + Add to my list
        </button>
      )}
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
          buttonLabel="Look up"
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
                Or <a href={u('lot/')}>browse the vacant-land map</a>.
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
