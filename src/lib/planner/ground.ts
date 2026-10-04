// Ground heights — the contract between the planner's terrain, furniture and sun
// work (2026-10-04). Until terrain data loads (or if it can't), the ground is flat.
//
// Heights are FEET above the lot's datum: 0 = the average ground elevation inside
// the lot, so a flat lot behaves exactly as before. Positions are local feet
// (x = east, y = north), the same frame as LocalSite.
//
// Who does what:
//   terrain   fills LocalSite.ground / datumElevFt and Prism.baseFt
//   furniture puts park items and surfaces on groundOf(site)
//   sun       uses groundOf(site) for grid cells (GridSpec.groundFt), crowns and prisms

export type GroundFn = (x: number, y: number) => number;

export const FLAT_GROUND: GroundFn = () => 0;

export function groundOf(site: { ground?: GroundFn } | null | undefined): GroundFn {
  return site?.ground ?? FLAT_GROUND;
}
