/** Base-aware URL for files in public/ and site routes ("downloads/x.pdf", "steps/acquire/"). */
export function u(path = ''): string {
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  return base + path.replace(/^\//, '');
}
