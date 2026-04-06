import type { GameState, CompletedRun, EndReason } from '../data/types';
import { BALANCING } from '../data/balancing';
import { TITLES } from '../data/titles';

export interface ScoreBreakdown {
  wealth: number;
  stability: number;
  trust: number;
  total: number;
}

/**
 * Calculate the final score for a completed run.
 */
export function calculateFinalScore(state: GameState): ScoreBreakdown {
  if (state.gameOverReason === 'heat') {
    // Arrested — bag seized, total failure
    return { wealth: 0, stability: 0, trust: 0, total: 0 };
  }

  const avgStage = state.stageHistory.length > 0
    ? state.stageHistory.reduce((a, b) => a + b, 0) / state.stageHistory.length
    : state.currentStage;

  // Wealth score (40% weight)
  const wealthRatio = Math.min(state.bag / BALANCING.MAX_POSSIBLE_BAG, 1);
  const wealth = Math.round(wealthRatio * 100);

  // Stability score (40% weight) — lower avg stage = better
  const stabilityRatio = Math.max(0, 1 - avgStage / 8);
  const stability = Math.round(stabilityRatio * 100);

  // Trust score (20% weight) — lower rage = better
  const trustRatio = Math.max(0, (100 - state.rage) / 100);
  const trust = Math.round(trustRatio * 100);

  const total = Math.round(
    wealth * BALANCING.WEALTH_WEIGHT +
    stability * BALANCING.STABILITY_WEIGHT +
    trust * BALANCING.TRUST_WEIGHT,
  );

  return { wealth, stability, trust, total };
}

/**
 * Assign a title based on the player's performance.
 */
export function assignTitle(state: GameState): string {
  // Exile is special — assigned manually when fleeing
  if (state.gameOverReason === 'survived' || state.gameOverReason === 'heat' ||
      state.gameOverReason === 'rage' || state.gameOverReason === 'collapse' ||
      state.gameOverReason === 'bankrupt') {
    // Sort by priority and find first matching
    const sorted = [...TITLES].sort((a, b) => a.priority - b.priority);
    for (const title of sorted) {
      if (title.id !== 'exile' && title.condition(state)) {
        return title.title;
      }
    }
  }

  return 'Opportunist'; // Fallback
}

/**
 * Generate share text for social sharing.
 */
export function generateShareText(
  state: GameState,
  title: string,
  score: number,
): string {
  const endReasonText: Record<EndReason, string> = {
    heat: 'Busted by Daily Maverick',
    rage: 'Overthrown by the people',
    collapse: 'Total grid collapse',
    bankrupt: 'Grid went bankrupt',
    survived: 'Survived all 30 days',
  };

  const dealCount = state.corruptionLog.length;
  const bagDisplay = state.bag >= 1000
    ? `R${(state.bag / 1000).toFixed(1)}B`
    : `R${state.bag}M`;

  return [
    `\u26A1 STAGE 6 \u2014 Day ${state.day}/${BALANCING.TOTAL_DAYS}`,
    `\u{1F4B0} Stole: ${bagDisplay} across ${dealCount} deals`,
    `\u{1F525} Title: ${title}`,
    `\u{1F4F0} ${endReasonText[state.gameOverReason!] || 'Game Over'}`,
    `\u{1F4CA} Score: ${score}/100`,
    '',
    'Think you\'d last longer?',
  ].join('\n');
}

/**
 * Build a completed run record for history.
 */
export function buildCompletedRun(state: GameState): CompletedRun {
  const title = assignTitle(state);
  const score = calculateFinalScore(state);

  return {
    runId: state.runId,
    completedAt: Date.now(),
    day: state.day,
    bag: state.bag,
    score: score.total,
    title,
    endReason: state.gameOverReason!,
    corruptionLog: [...state.corruptionLog],
    isDaily: state.mode === 'daily',
    dailyDate: state.mode === 'daily' ? new Date().toISOString().split('T')[0] : undefined,
    scoreBreakdown: {
      wealth: score.wealth,
      stability: score.stability,
      trust: score.trust,
    },
  };
}
