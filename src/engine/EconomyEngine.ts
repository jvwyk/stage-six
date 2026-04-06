import type { RegionState, PlantState } from '../data/types';
import { BALANCING } from '../data/balancing';
import { getRageRevenuePenalty } from './RageEngine';

export interface EconomyResult {
  revenue: number;
  costs: number;
  budgetDelta: number;
  newBudget: number;
}

/**
 * Calculate daily revenue from electricity sales.
 */
export function calculateRevenue(regions: RegionState[], rage: number): number {
  const ragePenalty = getRageRevenuePenalty(rage);
  let revenue = 0;

  for (const region of regions) {
    const regionRevenue = region.currentSupply * region.economicValue * BALANCING.TARIFF_RATE;
    revenue += regionRevenue;
  }

  return Math.round(revenue * (1 - ragePenalty));
}

/**
 * Calculate daily costs (fuel + any additional costs).
 */
export function calculateCosts(plants: PlantState[], additionalCosts: number = 0): number {
  let costs = 0;

  for (const plant of plants) {
    if (plant.status === 'online' || plant.status === 'derated') {
      costs += plant.fuelCostPerDay;
    }
  }

  return costs + additionalCosts;
}

/**
 * Update the budget with revenue and costs.
 */
export function updateBudget(
  currentBudget: number,
  revenue: number,
  costs: number,
): EconomyResult {
  const budgetDelta = revenue - costs;
  const newBudget = currentBudget + budgetDelta;

  return {
    revenue,
    costs,
    budgetDelta,
    newBudget,
  };
}

/**
 * Check if bankruptcy threshold is met.
 */
export function checkBankruptcy(budget: number, bankruptcyDays: number): boolean {
  return budget < 0 && bankruptcyDays >= BALANCING.BANKRUPTCY_GRACE_DAYS;
}
