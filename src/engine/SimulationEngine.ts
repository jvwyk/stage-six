import type { RegionState } from '../data/types';
import { BALANCING } from '../data/balancing';
import type { SeededRandom } from './RandomEngine';

/**
 * Calculate demand for each region for the current day.
 */
export function calculateDemand(
  regions: RegionState[],
  day: number,
  random: SeededRandom,
  demandModifiers: Map<string, number>,
): RegionState[] {
  const seasonalModifier =
    BALANCING.DEMAND_SEASONAL_AMPLITUDE *
    Math.sin(((day - BALANCING.DEMAND_SEASONAL_PEAK_DAY) / BALANCING.TOTAL_DAYS) * Math.PI);

  return regions.map((region) => {
    const dailyVariance = random.floatRange(
      -BALANCING.DEMAND_DAILY_VARIANCE,
      BALANCING.DEMAND_DAILY_VARIANCE,
    );
    const eventModifier = (demandModifiers.get(region.id) || 0) / 100;

    const demand = Math.round(
      region.baseDemand * (1 + dailyVariance + eventModifier + seasonalModifier),
    );

    return {
      ...region,
      currentDemand: Math.max(0, demand),
    };
  });
}

/**
 * Allocate supply across regions based on the current load shedding stage.
 * Low-priority regions shed first.
 */
export function allocateSupply(
  totalSupply: number,
  regions: RegionState[],
  stage: number,
): RegionState[] {
  const demandCut = BALANCING.STAGE_DEMAND_CUT[stage] || 0;
  const totalDemand = regions.reduce((sum, r) => sum + r.currentDemand, 0);
  const effectiveDemand = Math.round(totalDemand * (1 - demandCut));

  // Available supply to distribute
  const supplyToDistribute = Math.min(totalSupply, effectiveDemand);

  // Calculate inverse priority weights for shedding distribution
  const totalPriority = regions.reduce((sum, r) => sum + r.priorityWeight, 0);

  return regions.map((region) => {
    // Each region gets supply proportional to its priority weight
    const shareRatio = region.priorityWeight / totalPriority;
    const idealSupply = Math.round(supplyToDistribute * shareRatio);

    // Cap at the region's effective demand
    const regionEffectiveDemand = Math.round(region.currentDemand * (1 - demandCut));
    const allocated = Math.min(idealSupply, regionEffectiveDemand);

    return {
      ...region,
      currentSupply: allocated,
    };
  });
}

/**
 * Calculate the overall supply/demand deficit.
 */
export function calculateDeficit(regions: RegionState[]): {
  totalSupply: number;
  totalDemand: number;
  deficit: number;
  supplyRatio: number;
} {
  const totalSupply = regions.reduce((sum, r) => sum + r.currentSupply, 0);
  const totalDemand = regions.reduce((sum, r) => sum + r.currentDemand, 0);
  const deficit = totalDemand - totalSupply;
  const supplyRatio = totalDemand > 0 ? totalSupply / totalDemand : 1;

  return { totalSupply, totalDemand, deficit, supplyRatio };
}
