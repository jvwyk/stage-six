import type { RegionState, PlantState } from '../data/types';
import { BALANCING } from '../data/balancing';
import { getRageRevenuePenalty } from './RageEngine';
import { getHeatBudgetPenalty } from './HeatEngine';
import { getModeFuelMultiplier } from './PlantEngine';

export interface EconomyResult {
  revenue: number;
  costs: number;
  budgetDelta: number;
  newBudget: number;
}

/**
 * Calculate daily revenue from electricity sales.
 * Revenue is reduced by rage penalties (people stop paying).
 */
export function calculateRevenue(regions: RegionState[], rage: number, tariffMultiplier: number = 1.0): number {
  const ragePenalty = getRageRevenuePenalty(rage);
  let revenue = 0;

  for (const region of regions) {
    const regionRevenue = region.currentSupply * region.economicValue * BALANCING.TARIFF_RATE * tariffMultiplier;
    revenue += regionRevenue;
  }

  return Math.round(revenue * (1 - ragePenalty));
}

/**
 * Calculate the heat-based budget penalty (legal fees from investigations).
 * Spec: -5% at journalist threshold (46-65), -10% at inquiry threshold (66-80).
 */
export function calculateHeatPenalty(budget: number, heat: number): number {
  const penaltyRate = getHeatBudgetPenalty(heat);
  if (penaltyRate <= 0 || budget <= 0) return 0;
  return Math.round(budget * penaltyRate);
}

/**
 * Calculate daily costs (fuel + any additional costs).
 */
export function calculateCosts(plants: PlantState[], additionalCosts: number = 0): number {
  let costs = 0;

  for (const plant of plants) {
    if (plant.status === 'online' || plant.status === 'derated') {
      const fuelMult = getModeFuelMultiplier(plant.operatingMode);
      costs += Math.round(plant.fuelCostPerDay * fuelMult);
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
