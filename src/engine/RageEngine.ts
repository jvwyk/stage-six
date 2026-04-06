import type { GameState, RegionState } from '../data/types';
import { BALANCING } from '../data/balancing';

export interface RageResult {
  newRage: number;
  rageDelta: number;
  perRegionRage: Map<string, number>;
  rageEvents: string[];
}

/**
 * Calculate daily rage update.
 */
export function calculateDailyRage(
  state: GameState,
  regions: RegionState[],
  stageChanged: boolean,
  didCleanMaintenance: boolean,
): RageResult {
  const rageEvents: string[] = [];
  let rageDelta = 0;

  // Stage-based rage (quadratic)
  const stageRage = state.currentStage * state.currentStage * BALANCING.RAGE_STAGE_MULTIPLIER;
  rageDelta += stageRage;

  // Per-region shortfall rage
  const perRegionRage = new Map<string, number>();
  for (const region of regions) {
    if (region.currentDemand > 0) {
      const shortfallRatio = 1 - (region.currentSupply / region.currentDemand);
      if (shortfallRatio > 0) {
        const regionRageDelta = shortfallRatio * 10 * region.rageSensitivity;
        perRegionRage.set(region.id, regionRageDelta);
        rageDelta += regionRageDelta;
      }
    }
  }

  // Unpredictability penalty (stage changed by more than 2)
  if (state.stageHistory.length > 0) {
    const yesterdayStage = state.stageHistory[state.stageHistory.length - 1];
    if (Math.abs(state.currentStage - yesterdayStage) > BALANCING.RAGE_UNPREDICTABILITY_STAGE_CHANGE) {
      rageDelta += BALANCING.RAGE_UNPREDICTABILITY_PENALTY;
      rageEvents.push('Sudden stage change angers public');
    }
  }

  // Stability bonus (stage unchanged from yesterday)
  if (!stageChanged && state.stageHistory.length > 0) {
    rageDelta -= BALANCING.RAGE_STABILITY_BONUS;
  }

  // Clean maintenance signal
  if (didCleanMaintenance) {
    rageDelta -= BALANCING.RAGE_INVESTMENT_BONUS;
    rageEvents.push('Public approves of grid investment');
  }

  // Natural decay
  rageDelta -= BALANCING.RAGE_NATURAL_DECAY;

  const newRage = Math.max(0, Math.min(100, state.rage + rageDelta));

  // Rage threshold events
  if (newRage >= BALANCING.RAGE_FURIOUS_THRESHOLD && state.rage < BALANCING.RAGE_FURIOUS_THRESHOLD) {
    rageEvents.push('Protests erupting across the country');
  }
  if (newRage >= BALANCING.RAGE_CRITICAL_THRESHOLD && state.rage < BALANCING.RAGE_CRITICAL_THRESHOLD) {
    rageEvents.push('Political pressure mounting — your position is at risk');
  }

  return {
    newRage,
    rageDelta: newRage - state.rage,
    perRegionRage,
    rageEvents,
  };
}

/**
 * Update per-region rage values.
 */
export function updateRegionRage(regions: RegionState[]): RegionState[] {
  return regions.map((region) => {
    if (region.currentDemand <= 0) return region;

    const shortfallRatio = 1 - (region.currentSupply / region.currentDemand);
    let rageChange = 0;

    if (shortfallRatio > 0.1) {
      rageChange = shortfallRatio * 8 * region.rageSensitivity;
      // Regions that are repeatedly shed get angrier faster
      if (region.consecutiveSheddingDays > 2) {
        rageChange *= 1.2;
      }
    } else {
      rageChange = -1; // Small decay when adequately supplied
    }

    const newConsecutive = shortfallRatio > 0.1 ? region.consecutiveSheddingDays + 1 : 0;

    return {
      ...region,
      rage: Math.max(0, Math.min(100, region.rage + rageChange)),
      consecutiveSheddingDays: newConsecutive,
    };
  });
}

/**
 * Get revenue penalty from rage level.
 */
export function getRageRevenuePenalty(rage: number): number {
  if (rage >= BALANCING.RAGE_CRITICAL_THRESHOLD) return BALANCING.RAGE_CRITICAL_REVENUE_PENALTY;
  if (rage >= BALANCING.RAGE_FURIOUS_THRESHOLD) return BALANCING.RAGE_FURIOUS_REVENUE_PENALTY;
  if (rage >= BALANCING.RAGE_ANGRY_THRESHOLD) return BALANCING.RAGE_ANGRY_REVENUE_PENALTY;
  if (rage >= BALANCING.RAGE_GRUMBLING_THRESHOLD) return BALANCING.RAGE_GRUMBLING_REVENUE_PENALTY;
  return 0;
}
