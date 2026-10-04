// One more try for momentary failures (usability test 2026-10-04, veteran S7: an
// ArcGIS layer answered "400 Invalid URL" now and then).
import { afterEach, describe, expect, it } from 'vitest';
import { getJSON, setFetch } from '../http';

const answer = (status: number, body: unknown) => {
  const text = JSON.stringify(body);
  return { ok: status >= 200 && status < 300, status, json: async () => JSON.parse(text), text: async () => text };
};

afterEach(() => setFetch(null));

describe('getJSON retries once', () => {
  it('a 400 from ArcGIS, then the answer', async () => {
    let n = 0;
    setFetch(async () => (++n === 1 ? answer(400, { error: 'Invalid URL' }) : answer(200, { features: [] })));
    await expect(getJSON('https://services.arcgis.com/x/retry-400')).resolves.toEqual({ features: [] });
    expect(n).toBe(2);
  });
  it('an ArcGIS error inside a 200, then the answer', async () => {
    let n = 0;
    setFetch(async () => (++n === 1 ? answer(200, { error: { code: 500, message: 'busy' } }) : answer(200, { ok: 1 })));
    await expect(getJSON('https://services.arcgis.com/x/retry-200err')).resolves.toEqual({ ok: 1 });
    expect(n).toBe(2);
  });
  it('gives up after the second failure, with the friendly message', async () => {
    let n = 0;
    setFetch(async () => {
      n++;
      throw new Error('offline');
    });
    const e = (await getJSON('https://services.arcgis.com/x/down').catch((x: unknown) => x)) as { code?: string };
    expect(e.code).toBe('city-down');
    expect(n).toBe(2);
  });
  it('does not retry a 404 the caller expects (AIS "no match")', async () => {
    let n = 0;
    setFetch(async () => {
      n++;
      return answer(404, { status: 404 });
    });
    await getJSON('https://api.phila.gov/ais/v1/search/nothing', { allow404: true });
    expect(n).toBe(1);
  });
});
