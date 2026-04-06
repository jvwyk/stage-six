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
  const effectiveDemand = totalDemand * (1 - demandCut);

  // Available supply to distribute
  const supplyToDistribute = Math.min(totalSupply, effectiveDemand);

  // Calculate priority weights for distribution
  const totalPriority = regions.reduce((sum, r) => sum + r.priorityWeight, 0);
  if (totalPriority <= 0) {
    return regions.map((region) => ({ ...region, currentSupply: 0 }));
  }

  // Allocate using largest remainder method to avoid rounding loss
  const rawAllocations = regions.map((region) => {
    const shareRatio = region.priorityWeight / totalPriority;
    const regionEffectiveDemand = region.currentDemand * (1 - demandCut);
    return Math.min(supplyToDistribute * shareRatio, regionEffectiveDemand);
  });

  // Floor all values first, then distribute remainders
  const floored = rawAllocations.map(Math.floor);
  let remainder = Math.round(supplyToDistribute) - floored.reduce((a, b) => a + b, 0);
  const remainders = rawAllocations.map((raw, i) => ({ index: i, frac: raw - floored[i] }));
  remainders.sort((a, b) => b.frac - a.frac);

  for (const r of remainders) {
    if (remainder <= 0) break;
    floored[r.index]++;
    remainder--;
  }

  return regions.map((region, i) => ({
    ...region,
    currentSupply: floored[i],
  }));
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

/**
 * Calculate the minimum and recommended load shedding stages.
 * minimumStage: lowest stage that avoids grid collapse (supply >= 40% demand)
 * recommendedStage: lowest stage where supply meets effective demand
 */
export function calculateMinimumStage(
  availableSupply: number,
  totalDemand: number,
): { minimumStage: number; recommendedStage: number } {
  let minimumStage = 0;
  let recommendedStage = 0;

  // Find minimum stage (avoids collapse)
  for (let s = 0; s < BALANCING.STAGE_DEMAND_CUT.length; s++) {
    const effectiveDemand = totalDemand * (1 - BALANCING.STAGE_DEMAND_CUT[s]);
    if (availableSupply >= effectiveDemand * BALANCING.GRID_COLLAPSE_SUPPLY_RATIO) {
      minimumStage = s;
      break;
    }
    minimumStage = s;
  }

  // Find recommended stage (supply meets demand)
  recommendedStage = BALANCING.STAGE_DEMAND_CUT.length - 1;
  for (let s = 0; s < BALANCING.STAGE_DEMAND_CUT.length; s++) {
    const effectiveDemand = totalDemand * (1 - BALANCING.STAGE_DEMAND_CUT[s]);
    if (availableSupply >= effectiveDemand) {
      recommendedStage = s;
      break;
    }
  }

  return { minimumStage, recommendedStage };
}
