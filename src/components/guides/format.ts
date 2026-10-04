// Small formatting helpers for the build guides. Owner: guides workstream.

function trimNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(3)));
}

/** 18.5 -> `1'-6.5"`, 96 -> `8'`, 16.25 -> `1'-4.25"`, 8 -> `8"` */
export function feetIn(totalInches: number): string {
  const ft = Math.floor(totalInches / 12);
  const inches = totalInches - ft * 12;
  if (ft === 0) return `${trimNum(inches)}"`;
  if (inches === 0) return `${ft}'`;
  return `${ft}'-${trimNum(inches)}"`;
}

export function dimsText(d: { length: number; width: number; height: number }): string {
  return `${feetIn(d.length)} L × ${feetIn(d.width)} W × ${feetIn(d.height)} H`;
}
