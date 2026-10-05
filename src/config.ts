// Site-wide switches, read at BUILD time (Base.astro, the 404 page). Server-side only: don't import
// this from islands or browser scripts.

/**
 * Should search engines list the site?
 *
 * - `false` (unlisted): the site is live and anyone with the link can use it, but every page, in
 *   every language, and the 404 page carry `<meta name="robots" content="noindex, nofollow">`,
 *   asking search engines not to list it or follow its links. No sitemap is made.
 * - `true` (listed): no robots tag at all.
 *
 * Owner's decision 2026-10-04: published on GitHub Pages, unlisted for now. To flip it, change the
 * line below and push to main (README "Hosting"). A `SEARCH_INDEXING=true|false` environment
 * variable at build time wins over this line — the Pages workflow passes the repository variable
 * of the same name, so it can also be flipped from the GitHub settings without a commit.
 */
const SEARCH_INDEXING_DEFAULT = false;

export function parseFlag(value: string | undefined): boolean | undefined {
  const v = value?.trim().toLowerCase();
  if (!v) return undefined;
  if (['1', 'true', 'yes', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'off'].includes(v)) return false;
  throw new Error(`SEARCH_INDEXING must be true or false, not "${value}"`);
}

const envValue = typeof process !== 'undefined' ? process.env?.SEARCH_INDEXING : undefined;

export const SEARCH_INDEXING: boolean = parseFlag(envValue) ?? SEARCH_INDEXING_DEFAULT;
