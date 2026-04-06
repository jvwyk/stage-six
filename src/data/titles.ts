import type { TitleDefinition, GameState } from './types';

function avgStage(state: GameState): number {
  if (state.stageHistory.length === 0) return state.currentStage;
  return state.stageHistory.reduce((a, b) => a + b, 0) / state.stageHistory.length;
}

export const TITLES: TitleDefinition[] = [
  {
    id: 'grid_savior',
    title: 'Grid Savior',
    condition: (state) =>
      state.bag < 100 && avgStage(state) < 2 && state.gameOverReason === 'survived',
    shareText: 'Saved the grid. Left empty-handed. Hero complex.',
    priority: 1,
  },
  {
    id: 'civil_servant',
    title: 'Civil Servant',
    condition: (state) =>
      state.bag < 500 && avgStage(state) < 4 && state.gameOverReason === 'survived',
    shareText: 'Kept the lights mostly on. Only minor theft.',
    priority: 2,
  },
  {
    id: 'eskom_ceo',
    title: 'Eskom CEO',
    condition: (state) =>
      state.gameOverReason === 'survived' && state.bag > 3000 && avgStage(state) < 3,
    shareText: "Somehow kept the lights on AND got rich. Suspicious.",
    priority: 3,
  },
  {
    id: 'opportunist',
    title: 'Opportunist',
    condition: (state) =>
      state.bag >= 500 && state.bag <= 2000 && state.gameOverReason === 'survived',
    shareText: 'Balanced greed and governance. A true politician.',
    priority: 4,
  },
  {
    id: 'tenderpreneur',
    title: 'Tenderpreneur',
    condition: (state) => state.bag >= 2000 && state.bag <= 5000,
    shareText: "Billions stolen. The grid? Not your problem.",
    priority: 5,
  },
  {
    id: 'minister_of_darkness',
    title: 'Minister of Darkness',
    condition: (state) => avgStage(state) > 5,
    shareText: 'The nation sat in darkness while you cashed in.',
    priority: 6,
  },
  {
    id: 'whistleblower_target',
    title: "Whistleblower's Target",
    condition: (state) => state.gameOverReason === 'heat',
    shareText: "The Daily Maverick got you. Should've been more careful.",
    priority: 7,
  },
  {
    id: 'load_shedding_legend',
    title: 'Load Shedding Legend',
    condition: (state) => state.gameOverReason === 'collapse',
    shareText: 'Total blackout. Your legacy: darkness.',
    priority: 8,
  },
  {
    id: 'exile',
    title: 'Exile',
    condition: () => false, // Manually assigned when player flees
    shareText: 'Took the money and ran. Living in Dubai now.',
    priority: 9,
  },
];
