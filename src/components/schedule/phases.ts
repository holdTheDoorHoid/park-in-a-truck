// The eight Create-step phases, in order — each roughly a weekend's work.
// Ids are permanent (used as keys in project.extra.buildSchedule.overrides).

export interface PhaseDef {
  id: string;
  title: string;
  blurb: string;
}

export const PHASES: PhaseDef[] = [
  { id: 'organize', title: 'Phase 1: Organize', blurb: 'Assemble your team and set the schedule' },
  { id: 'prepare-lot', title: 'Phase 2: Prepare the lot', blurb: 'Clear, protect and level the site' },
  { id: 'layout-gravel', title: 'Phase 3: Layout & gravel base', blurb: 'Stake out beds and elements, install the sub-base' },
  { id: 'install-edge', title: 'Phase 4: Install the edge', blurb: 'Gabion baskets and wood edging' },
  { id: 'spread-topsoil', title: 'Phase 5: Spread topsoil', blurb: 'Grade and fill the planting beds' },
  { id: 'plant', title: 'Phase 6: Plant', blurb: 'Trees, shrubs and perennials go in the ground' },
  { id: 'install-gravel', title: 'Phase 7: Install the gravel surface', blurb: 'Finish gravel, tamped and level' },
  { id: 'install-elements', title: 'Phase 8: Install park elements', blurb: 'Benches, tables and structures' },
];
