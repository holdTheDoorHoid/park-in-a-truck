// Polite JSON fetching for the City's public APIs.
//
// - One answer per URL per browser session: memory cache, plus sessionStorage so
//   moving between pages doesn't ask the City again. (Session cache only — the
//   person's project is the one thing kept in localStorage, via project.ts.)
// - Identical requests in flight share one promise.
// - At most 4 requests at a time, 20 s timeout.
// - A request that fails in a way that is usually momentary (no answer, a 5xx, or the
//   ArcGIS "Invalid URL" 400 its hosted layers give now and then — seen on
//   Universities_Colleges in the 2026-10-04 usability test) is tried once more.
// - ArcGIS reports errors as HTTP 200 + {error}; AIS uses 404 + {status:404}
//   for "no match". Both are turned into PhillyError / null here.
// - Tests swap `fetch` with setFetch() and never touch the network.

import { PhillyError } from './types';
import { words, type PhillyKey } from './words';

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

/** Which City service a URL belongs to, for friendly messages (in the page's language). */
export function serviceName(url: string): string {
  return words()(serviceKey(url));
}
function serviceKey(url: string): PhillyKey {
  if (url.includes('api.phila.gov/ais')) return 'service.ais';
  if (url.includes('phl.carto.com')) return 'service.opa';
  if (url.includes('arcgis')) return 'service.arcgis';
  return 'service.other';
}

/** A friendly message about a City service, in the page's language. */
function says(key: PhillyKey, url: string, vars: Record<string, string | number> = {}): string {
  const service = serviceName(url);
  return words()(key, { service, Service: capital(service), ...vars });
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

  const once = async (): Promise<T> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 20_000);
    const onAbort = () => ctrl.abort();
    opts.signal?.addEventListener('abort', onAbort);
    try {
      let res;
      try {
        res = await doFetch(url, { signal: ctrl.signal });
      } catch (e) {
        if (opts.signal?.aborted) throw new PhillyError('aborted', words()('error.cancelled'));
        const down = new PhillyError('city-down', says('http.unreachable', url), { cause: e });
        // a request that already waited out the timeout isn't tried again
        throw ctrl.signal.aborted ? down : retryable(down);
      }
      if (res.status === 404 && opts.allow404) {
        const body = await res.json().catch(() => null);
        const v = { __notFound: true, body };
        memory.set(url, v);
        return v as unknown as T;
      }
      if (!res.ok) {
        const err = new PhillyError('city-down', says('http.status', url, { status: String(res.status) }));
        throw res.status >= 500 || res.status === 400 || res.status === 408 || res.status === 429 ? retryable(err) : err;
      }
      let text: string;
      try {
        text = await res.text();
      } catch (e) {
        // cancelled while the answer was still arriving
        if (opts.signal?.aborted) throw new PhillyError('aborted', words()('error.cancelled'));
        throw retryable(new PhillyError('city-down', says('http.stopped', url), { cause: e }));
      }
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch (e) {
        throw retryable(new PhillyError('city-down', says('http.unreadable', url), { cause: e }));
      }
      const err = (body as { error?: { message?: string } | string[] })?.error;
      if (err) {
        const detail = typeof err === 'object' && !Array.isArray(err) && err.message ? err.message : '';
        throw retryable(new PhillyError('city-down', detail ? says('http.problemDetail', url, { detail }) : says('http.problem', url)));
      }
      memory.set(url, body);
      ssSet(url, text);
      return body as T;
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener('abort', onAbort);
    }
  };

  const p = gate(async () => {
    try {
      return await once();
    } catch (e) {
      if (!RETRY.has(e as object) || opts.signal?.aborted) throw e;
      await new Promise((r) => setTimeout(r, RETRY_AFTER_MS));
      if (opts.signal?.aborted) throw new PhillyError('aborted', words()('error.cancelled'));
      return once();
    }
  });
  inflight.set(url, p);
  try {
    return (await p) as T;
  } finally {
    inflight.delete(url);
  }
}

/** Errors worth one more try. */
const RETRY = new WeakSet<object>();
const RETRY_AFTER_MS = 600;
function retryable<E extends object>(e: E): E {
  RETRY.add(e);
  return e;
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
