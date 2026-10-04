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
import { words } from '../../lib/philly/words';
import { urlFor } from '../../i18n/url.ts';
import AddressSearch from './AddressSearch';
import LotCard from './LotCard';
import CandidatesTable from './CandidatesTable';
import SaveToggle from './SaveToggle';
import { useProject } from './hooks';

/** Where the vacant-land map is: on this page if it has one, else the Find a lot page (in the page's language). */
export function mapHref(): string {
  return typeof document !== 'undefined' && document.getElementById('vacant-map') ? '#vacant-map' : urlFor(words().locale)('lot/#vacant-map');
}

/** Does this page have workbook fields that fill themselves from the chosen lot? */
function pageHasLotFields(): boolean {
  return typeof document !== 'undefined' && Boolean(document.querySelector('[data-auto^="lot."]'));
}

interface Props {
  mode?: 'primary' | 'candidates';
}

export default function LotLookup({ mode = 'primary' }: Props) {
  const t = words();
  const u = urlFor(t.locale);
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
        setFlash(t('lookup.updated'));
      } else {
        setResult(r);
        // "Add a possible lot by address" adds it: no second step to miss (veteran S10)
        if (mode === 'candidates' && !project.candidates.some((c) => c.address === r.address)) {
          addCandidate(r);
          setFlash(t('lookup.addedBelow', { address: titleCase(r.address) }));
        }
      }
    } catch (e) {
      if (c.signal.aborted) return;
      setResult(null);
      setError(e instanceof PhillyError ? e : new PhillyError('city-down', t('error.generic')));
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
    setFlash(t(pageHasLotFields() ? 'lookup.nowYourLotFilled' : 'lookup.nowYourLot', { address: titleCase(l.address) }));
    setSearching(false);
  };
  const list = (l: LotRecord) => {
    addCandidate(l);
    setFlash(t('lookup.added', { address: titleCase(l.address) }));
  };

  const actionsFor = (l: LotRecord) => (
    <>
      <SaveToggle primary done={isChosen(l)} doneText={t('action.isYourLot')} onClick={() => use(l)}>
        {t('action.use')}
      </SaveToggle>
      <SaveToggle done={isListed(l)} doneText={t('action.onList')} onClick={() => list(l)}>
        {t('action.add')}
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
            badge={<span class="ph-badge ph-badge-ok">{t('badge.yourLot')}</span>}
            actions={
              <>
                <button class="btn" type="button" onClick={() => setSearching(true)}>
                  {t('lookup.different')}
                </button>
                <button class="btn" type="button" onClick={() => run({ opa: chosen!.opa! }, { refresh: true })} disabled={!chosen!.opa}>
                  {t('lookup.refresh')}
                </button>
                <a class="btn" href={u('lot/')}>
                  {t('lookup.findOnMap')}
                </a>
              </>
            }
          />
        </>
      ) : (
        <AddressSearch
          label={t(mode === 'candidates' ? 'lookup.labelCandidate' : 'lookup.label')}
          placeholder={t(mode === 'candidates' ? 'lookup.placeholderCandidate' : 'search.placeholder')}
          hint={t(mode === 'candidates' ? 'lookup.hintCandidate' : 'search.hint')}
          buttonLabel={t(mode === 'candidates' ? 'lookup.add' : 'search.button')}
          busy={busy}
          onPick={pick}
        />
      )}

      <div aria-live="polite">
        {busy && (
          <p class="ph-status">
            <span class="ph-spinner" aria-hidden="true" />
            {t('lookup.checking')}
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
                {t('lookup.tryAgain')}
              </button>
            )}
            {error.code === 'intersection' && <p class="ph-small" dangerouslySetInnerHTML={{ __html: t.html('lookup.orBrowse', { href: mapHref() }) }} />}
            {error.code === 'not-found' && <p class="ph-small" dangerouslySetInnerHTML={{ __html: t.html('lookup.onlyStreet', { href: mapHref() }) }} />}
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
