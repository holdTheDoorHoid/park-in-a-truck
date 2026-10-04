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

/** Plain-reading inches for notes: 19.5 -> `19½″`, 99 -> `8′-3″`, 97.5 -> `8′-1½″`. Added for the 3D model notes. */
export function friendlyIn(n: number): string {
  const part = (v: number) => {
    const whole = Math.floor(v + 0.13);
    const f = v - whole;
    const fr = Math.abs(f - 0.5) < 0.13 ? '½' : Math.abs(f - 0.25) < 0.13 ? '¼' : Math.abs(f - 0.75) < 0.13 ? '¾' : '';
    if (fr) return `${whole || ''}${fr}`;
    return String(Math.round(v));
  };
  if (n < 36) return `${part(n)}″`;
  const ft = Math.floor((n + 0.13) / 12);
  const inch = n - ft * 12;
  return Math.abs(inch) < 0.13 ? `${ft}′` : `${ft}′-${part(inch)}″`;
}

/** "about 19½″ tall" — the dimensions a model's asBuilt size differs in, or '' when it matches. */
export function asBuiltText(stated: { length: number; width: number; height: number }, built: { length: number; width: number; height: number }): string {
  const out: string[] = [];
  if (Math.abs(built.length - stated.length) >= 0.25) out.push(`${friendlyIn(built.length)} long`);
  if (Math.abs(built.width - stated.width) >= 0.25) out.push(`${friendlyIn(built.width)} wide`);
  if (Math.abs(built.height - stated.height) >= 0.25) out.push(`${friendlyIn(built.height)} tall`);
  if (!out.length) return '';
  const list = out.length > 1 ? `${out.slice(0, -1).join(', ')} and ${out[out.length - 1]}` : out[0]!;
  return `about ${list}`;
}
