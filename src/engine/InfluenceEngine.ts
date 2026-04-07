import { BALANCING } from '../data/balancing';
import type { GameState } from '../data/types';

/**
 * Calculate daily influence gain based on game state.
 */
export function calculateDailyInfluence(state: GameState): number {
  let gain = 0;

  // Stable grid (no shedding)
  if (state.currentStage === 0) {
    gain += BALANCING.INFLUENCE_NO_SHEDDING;
  }

  // Consecutive good days streak bonus
  if (state.consecutiveGoodDays > 0) {
    gain += Math.min(state.consecutiveGoodDays, 5) * BALANCING.INFLUENCE_STREAK_BONUS;
  }

  // Clean tenders today
  const cleanTenders = state.playerActions.tenders.filter((t) => t.action === 'clean').length;
  gain += cleanTenders * BALANCING.INFLUENCE_CLEAN_TENDER;

  // Maintenance scheduled today
  gain += state.playerActions.maintenanceScheduled.length * BALANCING.INFLUENCE_MAINTAIN_PLANT;

  return gain;
}

/**
 * Check if player can afford an influence action.
 */
export function canSpendInfluence(influence: number, cost: number): boolean {
  return influence >= cost;
}
