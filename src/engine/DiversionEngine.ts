import { BALANCING } from '../data/balancing';
import type { PlantState } from '../data/types';
import type { SeededRandom } from './RandomEngine';

/**
 * Calculate max MW that can be diverted (20% of available supply).
 */
export function getMaxDiversion(plants: PlantState[]): number {
  const available = plants.reduce((sum, p) =>
    (p.status === 'online' || p.status === 'derated') ? sum + p.currentOutput : sum, 0);
  return Math.round(available * BALANCING.DIVERSION_MAX_RATIO);
}

/**
 * Calculate bag income from diversion.
 */
export function calculateDiversionIncome(mw: number): number {
  return Math.round((mw / 100) * BALANCING.DIVERSION_INCOME_PER_100MW);
}

/**
 * Check if diversion is detected today.
 * Probability scales with amount diverted: 5% per 100MW.
 */
export function checkDiversionDetection(mw: number, random: SeededRandom): boolean {
  if (mw <= 0) return false;
  const detectionChance = (mw / 100) * BALANCING.DIVERSION_DETECTION_CHANCE_PER_100MW;
  return random.chance(Math.min(detectionChance, 0.95));
}
