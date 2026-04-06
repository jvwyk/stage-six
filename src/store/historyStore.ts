import { create } from 'zustand';
import type { CompletedRun, AggregateStats } from '../data/types';
import { loadHistory, saveHistory, loadStats, saveStats, DEFAULT_STATS } from '../utils/storage';

interface HistoryStore {
  runs: CompletedRun[];
  stats: AggregateStats;

  addRun: (run: CompletedRun) => void;
  clearHistory: () => void;
  getBestRun: () => CompletedRun | null;
  loadFromStorage: () => void;
}

function recalculateStats(runs: CompletedRun[]): AggregateStats {
  if (runs.length === 0) return DEFAULT_STATS;

  const titleCounts = new Map<string, number>();
  let totalDaysPlayed = 0;
  let totalStolen = 0;
  let bestScore = 0;
  let bestBag = 0;
  let longestSurvival = 0;
  let arrestCount = 0;
  let survivalCount = 0;

  for (const run of runs) {
    totalDaysPlayed += run.day;
    totalStolen += run.bag;
    bestScore = Math.max(bestScore, run.score);
    bestBag = Math.max(bestBag, run.bag);
    longestSurvival = Math.max(longestSurvival, run.day);
    if (run.endReason === 'heat') arrestCount++;
    if (run.endReason === 'survived') survivalCount++;
    titleCounts.set(run.title, (titleCounts.get(run.title) || 0) + 1);
  }

  let favoriteTitle = '';
  let maxCount = 0;
  for (const [title, count] of titleCounts) {
    if (count > maxCount) {
      maxCount = count;
      favoriteTitle = title;
    }
  }

  return {
    totalRuns: runs.length,
    totalDaysPlayed,
    totalStolen,
    bestScore,
    bestBag,
    longestSurvival,
    arrestCount,
    survivalCount,
    favoriteTitle,
  };
}

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  runs: [],
  stats: DEFAULT_STATS,

  addRun: (run) => {
    const runs = [...get().runs, run];
    const stats = recalculateStats(runs);
    saveHistory(runs);
    saveStats(stats);
    set({ runs, stats });
  },

  clearHistory: () => {
    saveHistory([]);
    saveStats(DEFAULT_STATS);
    set({ runs: [], stats: DEFAULT_STATS });
  },

  getBestRun: () => {
    const { runs } = get();
    if (runs.length === 0) return null;
    return runs.reduce((best, run) =>
      run.score > best.score ? run : best, runs[0]);
  },

  loadFromStorage: () => {
    const runs = loadHistory();
    const stats = loadStats();
    set({ runs, stats });
  },
}));
