// Polite JSON fetching for the City's public APIs.
//
// - One answer per URL per browser session: memory cache, plus sessionStorage so
//   moving between pages doesn't ask the City again. (Session cache only — the
//   person's project is the one thing kept in localStorage, via project.ts.)
// - Identical requests in flight share one promise.
// - At most 4 requests at a time, 20 s timeout.
// - ArcGIS reports errors as HTTP 200 + {error}; AIS uses 404 + {status:404}
//   for "no match". Both are turned into PhillyError / null here.
// - Tests swap `fetch` with setFetch() and never touch the network.

import { PhillyError } from './types';

type FetchFn = (url: string, init?: { signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

let fetchImpl: FetchFn | null = null;
/** Replace fetch (tests, fixture capture). Pass null to restore the global fetch. */
export function setFetch(fn: FetchFn | null) {
  fetchImpl = fn;
  memory.clear();
  inflight.clear();
}
const doFetch: FetchFn = (url, init) => (fetchImpl ?? (globalThis.fetch as unknown as FetchFn))(url, init);

const memory = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();
const SS_PREFIX = 'piat:city:';
/** Don't put big answers (map tiles of parcels, buildings) into sessionStorage */
const SS_MAX = 150_000;

function ssGet(url: string): unknown {
  try {
    const raw = globalThis.sessionStorage?.getItem(SS_PREFIX + url);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}
function ssSet(url: string, body: string) {
  if (body.length > SS_MAX) return;
  try {
    globalThis.sessionStorage?.setItem(SS_PREFIX + url, body);
  } catch {
    /* quota or blocked storage: memory cache still works */
  }
}

// --- a tiny concurrency gate -------------------------------------------------------
const MAX_ACTIVE = 4;
let active = 0;
const queue: (() => void)[] = [];
async function gate<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_ACTIVE) await new Promise<void>((r) => queue.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    queue.shift()?.();
  }
}

export interface GetOpts {
  signal?: AbortSignal;
  /** Treat HTTP 404 as "no result" and resolve null instead of throwing */
  allow404?: boolean;
  timeoutMs?: number;
}

/** Which City service a URL belongs to, for friendly messages. */
export function serviceName(url: string): string {
  if (url.includes('api.phila.gov/ais')) return 'the City address service (AIS)';
  if (url.includes('phl.carto.com')) return 'the City property database (OPA)';
  if (url.includes('arcgis')) return 'the City map service';
  return 'a City service';
}

/**
 * GET a JSON document. Cached per session. Throws PhillyError('city-down') when the
 * service can't be reached or answers with an error.
 */
export async function getJSON<T = unknown>(url: string, opts: GetOpts = {}): Promise<T> {
  if (memory.has(url)) return memory.get(url) as T;
  const cached = ssGet(url);
  if (cached !== undefined) {
    memory.set(url, cached);
    return cached as T;
  }
  const running = inflight.get(url);
  if (running) return running as Promise<T>;

  const p = gate(async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 20_000);
    const onAbort = () => ctrl.abort();
    opts.signal?.addEventListener('abort', onAbort);
    try {
      let res;
      try {
        res = await doFetch(url, { signal: ctrl.signal });
      } catch (e) {
        if (opts.signal?.aborted) throw new PhillyError('aborted', 'Cancelled.');
        throw new PhillyError(
          'city-down',
          `We couldn't reach ${serviceName(url)}. It may be busy or down — try again in a minute. Anything you typed is still saved.`,
          { cause: e },
        );
      }
      if (res.status === 404 && opts.allow404) {
        const body = await res.json().catch(() => null);
        const v = { __notFound: true, body };
        memory.set(url, v);
        return v as unknown as T;
      }
      if (!res.ok) {
        throw new PhillyError(
          'city-down',
          `${capital(serviceName(url))} answered with an error (${res.status}). Try again in a minute. Anything you typed is still saved.`,
        );
      }
      const text = await res.text();
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch (e) {
        throw new PhillyError('city-down', `${capital(serviceName(url))} sent something we couldn't read. Try again in a minute.`, { cause: e });
      }
      const err = (body as { error?: { message?: string } | string[] })?.error;
      if (err) {
        throw new PhillyError(
          'city-down',
          `${capital(serviceName(url))} reported a problem${typeof err === 'object' && !Array.isArray(err) && err.message ? ` (${err.message})` : ''}. Try again in a minute.`,
        );
      }
      memory.set(url, body);
      ssSet(url, text);
      return body as T;
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener('abort', onAbort);
    }
  });
  inflight.set(url, p);
  try {
    return (await p) as T;
  } finally {
    inflight.delete(url);
  }
}

/** Was this a 404 answer passed through by allow404? */
export function isNotFound(v: unknown): v is { __notFound: true; body: unknown } {
  return Boolean(v && typeof v === 'object' && (v as { __notFound?: boolean }).__notFound);
}

function capital(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Drop everything cached (memory only; sessionStorage expires with the tab). */
export function clearCityCache() {
  memory.clear();
}
