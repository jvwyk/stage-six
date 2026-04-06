import type { GameState, CompletedRun, AggregateStats, Settings } from '../data/types';

const STORAGE_VERSION = 1;

const KEYS = {
  VERSION: 'stage6_version',
  CURRENT_RUN: 'stage6_current_run',
  HISTORY: 'stage6_history',
  SETTINGS: 'stage6_settings',
  STATS: 'stage6_stats',
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
  return safeLoad<GameState>(KEYS.CURRENT_RUN);
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

export function clearAllData(): void {
  try {
    Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
  } catch {
    // Ignore
  }
}
