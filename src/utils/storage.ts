import type { GameState, CompletedRun, AggregateStats, Settings } from '../data/types';

const STORAGE_VERSION = 1;

const KEYS = {
  VERSION: 'stage6_version',
  CURRENT_RUN: 'stage6_current_run',
  HISTORY: 'stage6_history',
  SETTINGS: 'stage6_settings',
  STATS: 'stage6_stats',
  TUTORIAL_SEEN: 'stage6_tutorial_seen',
} as const;

export const DEFAULT_SETTINGS: Settings = {
  soundEnabled: false,
  animationsEnabled: true,
};

export const DEFAULT_STATS: AggregateStats = {
  totalRuns: 0,
  totalDaysPlayed: 0,
  totalStolen: 0,
  bestScore: 0,
  bestBag: 0,
  longestSurvival: 0,
  arrestCount: 0,
  survivalCount: 0,
  favoriteTitle: '',
};

function safeLoad<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeSave(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable — silent fail
  }
}

export function loadCurrentRun(): GameState | null {
  const state = safeLoad<GameState>(KEYS.CURRENT_RUN);
  if (!state) return null;

  // Migrate old saves: fill defaults for fields added after initial release
  return {
    ...state,
    demandMetDays: state.demandMetDays ?? 0,
    consecutiveGoodDays: state.consecutiveGoodDays ?? 0,
    totalDefection: state.totalDefection ?? 0,
    tariffIncreases: state.tariffIncreases ?? 0,
    tariffMultiplier: state.tariffMultiplier ?? 1.0,
    bailoutUsed: state.bailoutUsed ?? false,
    emergencyLevyUsed: state.emergencyLevyUsed ?? false,
    dieselFuelDays: state.dieselFuelDays ?? 0,
    emergencyImportMW: state.emergencyImportMW ?? 0,
    diversionMW: state.diversionMW ?? 0,
    influence: state.influence ?? 20,
    delayedTenders: state.delayedTenders ?? [],
    deflectedInvestigation: state.deflectedInvestigation ?? false,
    diversionCovered: state.diversionCovered ?? false,
    transactionLog: state.transactionLog ?? [],
    // Ensure plants have operatingMode
    plants: (state.plants || []).map((p: any) => ({ ...p, operatingMode: p.operatingMode ?? 'normal' })),
    // Ensure playerActions has tenders
    playerActions: { ...state.playerActions, tenders: state.playerActions?.tenders ?? [] },
    auditRisk: state.auditRisk ?? 0,
    corruptionScore: state.corruptionScore ?? 0,
  };
}

export function saveCurrentRun(state: GameState): void {
  safeSave(KEYS.CURRENT_RUN, state);
  safeSave(KEYS.VERSION, STORAGE_VERSION);
}

export function clearCurrentRun(): void {
  try {
    localStorage.removeItem(KEYS.CURRENT_RUN);
  } catch {
    // Ignore
  }
}

export function loadHistory(): CompletedRun[] {
  return safeLoad<CompletedRun[]>(KEYS.HISTORY) || [];
}

export function saveHistory(runs: CompletedRun[]): void {
  safeSave(KEYS.HISTORY, runs);
}

export function loadSettings(): Settings {
  return safeLoad<Settings>(KEYS.SETTINGS) || DEFAULT_SETTINGS;
}

export function saveSettings(settings: Settings): void {
  safeSave(KEYS.SETTINGS, settings);
}

export function loadStats(): AggregateStats {
  return safeLoad<AggregateStats>(KEYS.STATS) || DEFAULT_STATS;
}

export function saveStats(stats: AggregateStats): void {
  safeSave(KEYS.STATS, stats);
}

export function hasTutorialBeenSeen(): boolean {
  return safeLoad<boolean>(KEYS.TUTORIAL_SEEN) === true;
}

export function markTutorialSeen(): void {
  safeSave(KEYS.TUTORIAL_SEEN, true);
}

export function clearAllData(): void {
  try {
    Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore
  }
}
