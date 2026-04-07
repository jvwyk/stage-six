import type { Opportunity, CorruptionEntry, GridEffect } from '../data/types';
import { OPPORTUNITIES } from '../data/opportunities';
import { BALANCING } from '../data/balancing';
import type { SeededRandom } from './RandomEngine';

/**
 * Generate today's opportunities based on current game state.
 */
export function generateOpportunities(
  day: number,
  recentlyUsedIds: string[],
  heat: number,
  random: SeededRandom,
): Opportunity[] {
  // Filter eligible opportunities
  const eligible = OPPORTUNITIES.filter((op) => {
    if (op.minDay > day) return false;
    if (recentlyUsedIds.includes(op.id)) return false;
    return true;
  });

  if (eligible.length === 0) return [];

  // Determine how many opportunities today
  let [min, max] = BALANCING.OPPORTUNITY_COUNT_EARLY;
  if (day > BALANCING.OPPORTUNITY_MID_DAY_END) {
    [min, max] = BALANCING.OPPORTUNITY_COUNT_LATE;
  } else if (day > BALANCING.OPPORTUNITY_EARLY_DAY_END) {
    [min, max] = BALANCING.OPPORTUNITY_COUNT_MID;
  }
  const count = random.range(min, max);

  // Weight opportunities
  const weights = eligible.map((op) => {
    let weight = op.weight;

    // Later days favor higher tiers
    if (day > BALANCING.OPPORTUNITY_LATE_TIER3_DAY && op.tier >= 3) weight *= BALANCING.OPPORTUNITY_LATE_TIER3_WEIGHT_BONUS;
    if (day > BALANCING.OPPORTUNITY_LATE_TIER4_DAY && op.tier >= 4) weight *= BALANCING.OPPORTUNITY_LATE_TIER4_WEIGHT_BONUS;

    // Low heat = more temptation (risky deals appear more)
    if (heat < BALANCING.OPPORTUNITY_LOW_HEAT_THRESHOLD && (op.riskLevel === 'high' || op.riskLevel === 'extreme')) {
      weight *= BALANCING.OPPORTUNITY_LOW_HEAT_RISKY_BONUS;
    }

    return weight;
  });

  // Select opportunities
  const selected: Opportunity[] = [];
  const used = new Set<number>();

  // Ensure at least one low/medium risk option
  const safeOptions = eligible.filter(
    (op) => op.riskLevel === 'low' || op.riskLevel === 'med',
  );
  if (safeOptions.length > 0 && count > 0) {
    const safeOp = random.pick(safeOptions);
    const idx = eligible.indexOf(safeOp);
    used.add(idx);
    selected.push(resolveOpportunity(safeOp, random));
  }

  // Fill remaining slots
  while (selected.length < count && used.size < eligible.length) {
    const remaining = eligible.filter((_, i) => !used.has(i));
    const remainingWeights = weights.filter((_, i) => !used.has(i));

    if (remaining.length === 0) break;

    const picked = random.weightedPick(remaining, remainingWeights);
    const idx = eligible.indexOf(picked);
    if (!used.has(idx)) {
      used.add(idx);
      selected.push(resolveOpportunity(picked, random));
    }
  }

  return selected;
}

/**
 * Resolve a specific skim amount from the range.
 */
function resolveOpportunity(def: typeof OPPORTUNITIES[number], random: SeededRandom): Opportunity {
  const skimAmount = random.range(def.skimRange[0], def.skimRange[1]);
  return { ...def, skimAmount, delayCount: 0, dayAppeared: 0 };
}

/**
 * Apply a "take deal" action. Returns bag increase, heat increase, and budget change.
 */
export function applyTakeDeal(
  opportunity: Opportunity,
  random: SeededRandom,
): {
  bagGain: number;
  heatGain: number;
  budgetCost: number;
  rageEffect: number;
  gridEffect: GridEffect;
  failed: boolean;
  failMessage: string;
  corruptionEntry: CorruptionEntry;
} {
  let failed = false;
  let failMessage = '';
  let heatGain = opportunity.heatCost;

  // Check for deal failure
  if (opportunity.failChance > 0 && random.chance(opportunity.failChance)) {
    failed = true;
    failMessage = opportunity.failConsequence;
    heatGain += BALANCING.OPPORTUNITY_FAIL_EXTRA_HEAT;
  }

  const corruptionEntry: CorruptionEntry = {
    day: 0, // Caller sets this
    action: opportunity.title,
    skimAmount: opportunity.skimAmount,
    heatAdded: heatGain,
    category: opportunity.category,
    inflationLevel: 0,
  };

  return {
    bagGain: opportunity.skimAmount,
    heatGain,
    budgetCost: opportunity.budgetCost,
    rageEffect: opportunity.rageEffect,
    gridEffect: opportunity.gridEffect,
    failed,
    failMessage,
    corruptionEntry,
  };
}

/**
 * Apply a "clean deal" action. No skim, no heat, same grid effect.
 */
export function applyCleanDeal(
  opportunity: Opportunity,
): {
  budgetCost: number;
  rageEffect: number;
  gridEffect: GridEffect;
} {
  return {
    budgetCost: opportunity.budgetCost,
    rageEffect: Math.min(0, opportunity.rageEffect), // Only negative rage (good)
    gridEffect: opportunity.gridEffect,
  };
}

/**
 * Apply a tender choice with inflation. Returns all effects.
 * inflationLevel: 0 = clean, 0.25/0.50/0.75/1.0 = increasingly corrupt
 */
export function applyTenderChoice(
  opportunity: Opportunity,
  inflationLevel: number,
  random: SeededRandom,
): {
  bagGain: number;
  heatGain: number;
  budgetCost: number;
  rageEffect: number;
  gridEffect: GridEffect;
  failureDebtAdded: number;
  failed: boolean;
  failMessage: string;
  corruptionEntry: CorruptionEntry | null;
} {
  const isClean = inflationLevel <= 0;

  // Calculate costs and gains based on inflation
  const inflationMultiplier = 1 + inflationLevel;
  const gridPays = Math.round(opportunity.baseCost * inflationMultiplier);
  const bagGain = isClean ? 0 : Math.round(opportunity.baseCost * inflationLevel);
  const steps = Math.round(inflationLevel / 0.25); // 0,1,2,3,4
  const heatGain = isClean ? 0 : opportunity.heatPerInflation * steps;

  // Grid effect degradation: higher inflation = worse quality work
  const degradationIndex = Math.min(steps, BALANCING.TENDER_GRID_EFFECT_DEGRADATION.length - 1);
  const degradation = BALANCING.TENDER_GRID_EFFECT_DEGRADATION[degradationIndex];
  const degradedGridEffect: GridEffect = {
    ...opportunity.gridEffect,
    value: Math.round(opportunity.gridEffect.value * degradation),
  };

  // Deal failure check (only on corrupt deals)
  let failed = false;
  let failMessage = '';
  if (!isClean && opportunity.failChance > 0 && random.chance(opportunity.failChance)) {
    failed = true;
    failMessage = opportunity.failConsequence;
  }

  // Rage: clean deals get only positive rage effects, corrupt deals get full rage
  const rageEffect = isClean ? Math.min(0, opportunity.rageEffect) : opportunity.rageEffect;

  const corruptionEntry: CorruptionEntry | null = isClean ? null : {
    day: 0,
    action: opportunity.title,
    skimAmount: bagGain,
    heatAdded: heatGain,
    category: opportunity.category,
    inflationLevel,
  };

  const failureDebtAdded = isClean ? 0 : opportunity.failureDebtPerInflation * steps;

  return {
    bagGain,
    heatGain,
    budgetCost: gridPays,
    rageEffect,
    gridEffect: degradedGridEffect,
    failureDebtAdded,
    failed,
    failMessage,
    corruptionEntry,
  };
}

/**
 * Apply a tender delay. Returns updated opportunity with worsen roll.
 */
export function applyTenderDelay(
  opportunity: Opportunity,
  random: SeededRandom,
): { delayed: Opportunity; worsened: boolean } {
  let baseCost = opportunity.baseCost;
  let worsened = false;

  if (random.chance(BALANCING.TENDER_DELAY_WORSEN_CHANCE)) {
    baseCost = Math.round(baseCost * (1 + BALANCING.TENDER_DELAY_WORSEN_AMOUNT));
    worsened = true;
  }

  return {
    delayed: {
      ...opportunity,
      baseCost,
      delayCount: opportunity.delayCount + 1,
    },
    worsened,
  };
}

/**
 * Merge delayed tenders from previous day into today's opportunities.
 */
export function mergeDelayedTenders(
  todaysOpportunities: Opportunity[],
  delayedTenders: Opportunity[],
): Opportunity[] {
  // Delayed tenders appear first
  return [...delayedTenders, ...todaysOpportunities];
}

/**
 * Get the available inflation steps for an opportunity based on its maxInflation.
 */
export function getAvailableInflationSteps(opportunity: Opportunity): number[] {
  return BALANCING.TENDER_INFLATION_STEPS.filter(
    (step) => 1 + step <= opportunity.maxInflation + 0.001
  );
}

/**
 * Get the IDs of recently used opportunities for cooldown tracking.
 */
export function updateRecentOpportunities(
  recentIds: string[],
  newIds: string[],
): string[] {
  const combined = [...recentIds, ...newIds];
  // Keep only last COOLDOWN entries worth of IDs
  return combined.slice(-BALANCING.OPPORTUNITY_REPEAT_COOLDOWN * 3);
}
