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
 * New formula: rewards stage reduction and meeting demand.
 * Rage no longer causes game-over — it's indirect pressure via revenue and defection.
 */
export function calculateDailyRage(
  state: GameState,
  regions: RegionState[],
  supplyRatio: number,
  didCleanMaintenance: boolean,
): RageResult {
  const rageEvents: string[] = [];
  let rageDelta = 0;

  // Stage-based rage: gentle below stage 4, quadratic above
  const stage = state.currentStage;
  if (stage >= BALANCING.RAGE_HIGH_STAGE_THRESHOLD) {
    const excess = stage - BALANCING.RAGE_HIGH_STAGE_THRESHOLD + 1;
    rageDelta += excess * excess * BALANCING.RAGE_HIGH_STAGE_MULTIPLIER;
  } else if (stage > 0) {
    rageDelta += stage * BALANCING.RAGE_LOW_STAGE_MULTIPLIER;
  }

  // Stage REDUCTION reward — lowering stage actively reduces rage
  if (state.stageHistory.length > 0) {
    const yesterdayStage = state.stageHistory[state.stageHistory.length - 1];
    if (stage < yesterdayStage) {
      rageDelta -= (yesterdayStage - stage) * BALANCING.RAGE_STAGE_REDUCTION_BONUS;
      rageEvents.push('Stage reduced — public pressure easing');
    }
  }

  // Demand satisfaction reward — meeting demand actively reduces rage
  if (supplyRatio >= 1.0 && stage === 0) {
    rageDelta -= BALANCING.RAGE_FULL_SUPPLY_BONUS;
    rageEvents.push('Full demand met — no load shedding needed');
  } else if (supplyRatio >= BALANCING.RAGE_ADEQUATE_SUPPLY_THRESHOLD) {
    rageDelta -= BALANCING.RAGE_ADEQUATE_SUPPLY_BONUS;
  }

  // Per-region shortfall rage
  const perRegionRage = new Map<string, number>();
  for (const region of regions) {
    if (region.currentDemand > 0) {
      const shortfallRatio = 1 - (region.currentSupply / region.currentDemand);
      if (shortfallRatio > 0) {
        const regionRageDelta = shortfallRatio * BALANCING.RAGE_SHORTFALL_MULTIPLIER * region.rageSensitivity;
        perRegionRage.set(region.id, regionRageDelta);
        rageDelta += regionRageDelta;
      }
    }
  }

  // Unpredictability penalty (stage changed by more than 2)
  if (state.stageHistory.length > 0) {
    const yesterdayStage = state.stageHistory[state.stageHistory.length - 1];
    if (Math.abs(stage - yesterdayStage) > BALANCING.RAGE_UNPREDICTABILITY_STAGE_CHANGE) {
      rageDelta += BALANCING.RAGE_UNPREDICTABILITY_PENALTY;
      rageEvents.push('Sudden stage change angers public');
    }
  }

  // Stability bonus (stage unchanged from yesterday)
  if (state.stageHistory.length > 0 && state.stageHistory[state.stageHistory.length - 1] === stage) {
    rageDelta -= BALANCING.RAGE_STABILITY_BONUS;
  }

  // Clean maintenance signal
  if (didCleanMaintenance) {
    rageDelta -= BALANCING.RAGE_INVESTMENT_BONUS;
    rageEvents.push('Public approves of grid investment');
  }

  // Natural decay
  rageDelta -= BALANCING.RAGE_NATURAL_DECAY;

  const newRage = Math.max(0, Math.min(BALANCING.RAGE_REVOLT_THRESHOLD, state.rage + rageDelta));

  // Rage threshold events
  if (newRage >= BALANCING.RAGE_FURIOUS_THRESHOLD && state.rage < BALANCING.RAGE_FURIOUS_THRESHOLD) {
    rageEvents.push('Protests erupting across the country');
  }
  if (newRage >= BALANCING.RAGE_CRITICAL_THRESHOLD && state.rage < BALANCING.RAGE_CRITICAL_THRESHOLD) {
    rageEvents.push('Public switching to generators and solar');
  }
  if (newRage >= BALANCING.RAGE_EXTREME_THRESHOLD && state.rage < BALANCING.RAGE_EXTREME_THRESHOLD) {
    rageEvents.push('Revenue collapsing — mass grid defection underway');
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

    if (shortfallRatio > BALANCING.RAGE_REGION_SHORTFALL_THRESHOLD) {
      rageChange = shortfallRatio * BALANCING.RAGE_REGION_SHORTFALL_MULTIPLIER * region.rageSensitivity;
      if (region.consecutiveSheddingDays > BALANCING.RAGE_CONSECUTIVE_SHEDDING_DAYS) {
        rageChange *= BALANCING.RAGE_CONSECUTIVE_SHEDDING_MULTIPLIER;
      }
    } else {
      rageChange = -BALANCING.RAGE_REGION_DECAY;
    }

    const newConsecutive = shortfallRatio > BALANCING.RAGE_REGION_SHORTFALL_THRESHOLD ? region.consecutiveSheddingDays + 1 : 0;

    return {
      ...region,
      rage: Math.max(0, Math.min(BALANCING.RAGE_REVOLT_THRESHOLD, region.rage + rageChange)),
      consecutiveSheddingDays: newConsecutive,
    };
  });
}

/**
 * Apply public defection — at extreme rage, public switches to solar/generators.
 * Reduces base demand (sounds good but kills tariff revenue).
 */
export function applyPublicDefection(
  regions: RegionState[],
  rage: number,
  totalDefection: number,
): { regions: RegionState[]; newTotalDefection: number } {
  if (rage < BALANCING.RAGE_DEFECTION_THRESHOLD || totalDefection >= BALANCING.RAGE_DEFECTION_MAX) {
    return { regions, newTotalDefection: totalDefection };
  }

  const newTotal = Math.min(totalDefection + BALANCING.RAGE_DEFECTION_RATE, BALANCING.RAGE_DEFECTION_MAX);
  const dailyRate = BALANCING.RAGE_DEFECTION_RATE;

  return {
    regions: regions.map((region) => ({
      ...region,
      baseDemand: Math.round(region.baseDemand * (1 - dailyRate)),
    })),
    newTotalDefection: newTotal,
  };
}

/**
 * Get revenue penalty from rage level.
 */
export function getRageRevenuePenalty(rage: number): number {
  if (rage >= BALANCING.RAGE_EXTREME_THRESHOLD) return BALANCING.RAGE_EXTREME_REVENUE_PENALTY;
  if (rage >= BALANCING.RAGE_CRITICAL_THRESHOLD) return BALANCING.RAGE_CRITICAL_REVENUE_PENALTY;
  if (rage >= BALANCING.RAGE_FURIOUS_THRESHOLD) return BALANCING.RAGE_FURIOUS_REVENUE_PENALTY;
  if (rage >= BALANCING.RAGE_ANGRY_THRESHOLD) return BALANCING.RAGE_ANGRY_REVENUE_PENALTY;
  if (rage >= BALANCING.RAGE_GRUMBLING_THRESHOLD) return BALANCING.RAGE_GRUMBLING_REVENUE_PENALTY;
  return 0;
}
