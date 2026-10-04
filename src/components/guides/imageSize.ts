// Build-time pixel size of an image in public/ (WebP, PNG or JPEG), so step
// diagrams can carry width/height and the page doesn't shift as they load —
// which keeps #step-N links and the 3D viewer's "current step" accurate.
// Returns null when the size can't be read; callers then leave the attributes off.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const cache = new Map<string, { width: number; height: number } | null>();

export function imageSize(publicPath: string): { width: number; height: number } | null {
  if (cache.has(publicPath)) return cache.get(publicPath)!;
  let out: { width: number; height: number } | null = null;
  try {
    const b = readFileSync(join(process.cwd(), 'public', publicPath));
    out = parse(b);
  } catch {
    out = null;
  }
  cache.set(publicPath, out);
  return out;
}

export function parse(b: Buffer): { width: number; height: number } | null {
  if (b.length < 30) return null;
  // WebP: RIFF....WEBP + VP8 / VP8L / VP8X chunk
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const kind = b.toString('ascii', 12, 16);
    if (kind === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    if (kind === 'VP8L') {
      const bits = b.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (kind === 'VP8X') return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 };
    return null;
  }
  // PNG: IHDR right after the signature
  if (b.readUInt32BE(0) === 0x89504e47) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  // JPEG: walk the markers to a start-of-frame
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const m = b[i + 1]!;
      const len = b.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
      i += 2 + len;
    }
  }
  return null;
}
