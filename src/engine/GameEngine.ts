import type { GameState, DayReport, EndCondition, PlantState, RegionState, PlayerActions, GridEffect } from '../data/types';
import { BALANCING } from '../data/balancing';
import { PLANTS } from '../data/plants';
import { REGIONS } from '../data/regions';
import { SeededRandom } from './RandomEngine';
import * as PlantEngine from './PlantEngine';
import * as SimulationEngine from './SimulationEngine';
import * as RageEngine from './RageEngine';
import * as HeatEngine from './HeatEngine';
import * as EconomyEngine from './EconomyEngine';
import * as OpportunityEngine from './OpportunityEngine';
import * as EventEngine from './EventEngine';

/**
 * Create a fresh game state.
 */
export function createNewGame(mode: 'standard' | 'daily', seed?: string): GameState {
  const gameSeed = seed || `${Date.now()}-${Math.random()}`;
  const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const plants: PlantState[] = PLANTS.map((def) => ({
    id: def.id,
    name: def.name,
    type: def.type,
    maxCapacity: def.maxCapacity,
    currentOutput: def.startingOutput,
    reliability: def.baseReliability,
    status: def.startingStatus,
    failureDebt: 0,
    maintenanceDaysLeft: 0,
    daysUntilRepair: 0,
    fuelCostPerDay: def.fuelCostPerDay,
    daysSinceLastMaintenance: 0,
  }));

  const regions: RegionState[] = REGIONS.map((def) => ({
    ...def,
    currentDemand: def.baseDemand,
    currentSupply: 0,
    rage: 10,
    consecutiveSheddingDays: 0,
  }));

  const random = new SeededRandom(gameSeed);
  const opportunities = OpportunityEngine.generateOpportunities(
    1,
    [],
    BALANCING.STARTING_HEAT,
    random,
  );

  return {
    runId,
    startedAt: Date.now(),
    seed: gameSeed,
    mode,
    day: 1,
    phase: 'opportunities',
    gameOver: false,
    gameOverReason: null,
    bag: BALANCING.STARTING_BAG,
    bagHistory: [],
    heat: BALANCING.STARTING_HEAT,
    heatHistory: [],
    budget: BALANCING.STARTING_BUDGET,
    rage: BALANCING.STARTING_RAGE,
    rageHistory: [],
    currentStage: BALANCING.STARTING_STAGE,
    stageHistory: [],
    plants,
    regions,
    activeEvents: [],
    todaysOpportunities: opportunities,
    recentOpportunityIds: opportunities.map((o) => o.id),
    corruptionLog: [],
    decisionsLog: [],
    dayReport: null,
    bankruptcyDays: 0,
    consecutiveLowSupplyDays: 0,
    demandMetDays: 0,
    consecutiveGoodDays: 0,
    totalDefection: 0,
    tariffIncreases: 0,
    tariffMultiplier: 1.0,
    bailoutUsed: false,
    emergencyLevyUsed: false,
    dieselFuelDays: 0,
    emergencyImportMW: 0,
    auditRisk: 0,
    corruptionScore: 0,
    playerActions: createEmptyActions(),
  };
}

export function createEmptyActions(): PlayerActions {
  return {
    deals: [],
    stageSet: -1,
    dieselActivated: [],
    maintenanceScheduled: [],
    eventChoices: [],
  };
}

/**
 * Apply a grid effect from a deal to the plant fleet.
 */
function applyGridEffect(plants: PlantState[], effect: GridEffect, random: SeededRandom): PlantState[] {
  if (effect.type === 'none') return plants;

  return plants.map((plant) => {
    switch (effect.type) {
      case 'capacity_change': {
        if (effect.target === 'all' || effect.target === plant.id) {
          const newOutput = Math.max(0, Math.min(plant.maxCapacity, plant.currentOutput + effect.value));
          return { ...plant, currentOutput: newOutput };
        }
        return plant;
      }
      case 'reliability_change': {
        if (effect.target === plant.id) {
          return { ...plant, reliability: Math.max(0, Math.min(100, plant.reliability + effect.value)) };
        }
        return plant;
      }
      case 'plant_repair': {
        // Repair a random plant that needs it, or a specific one
        if (effect.target === 'random' && (plant.status === 'forced_outage' || plant.status === 'derated')) {
          return {
            ...plant,
            daysUntilRepair: Math.max(0, plant.daysUntilRepair - effect.value),
          };
        }
        if (effect.target === plant.id) {
          return {
            ...plant,
            daysUntilRepair: Math.max(0, plant.daysUntilRepair - effect.value),
          };
        }
        return plant;
      }
      case 'plant_damage': {
        if (effect.target === 'random_two' && random.chance(0.5)) {
          return {
            ...plant,
            status: 'forced_outage' as const,
            currentOutput: 0,
            daysUntilRepair: 999, // Permanent
          };
        }
        return plant;
      }
      default:
        return plant;
    }
  });
}

/**
 * Resolve a full day. Returns the updated state with a day report.
 */
export function resolveDay(state: GameState): GameState {
  const random = new SeededRandom(`${state.seed}-day-${state.day}`);
  let s = { ...state };

  const dayEvents: string[] = [];
  let daySkimmed = 0;
  let dayHeatAdded = 0;
  let dayBudgetCosts = 0;
  let dayRageFromActions = 0;
  let tookCorruptAction = false;
  let didCleanMaintenance = false;

  // ── PHASE 1: World Update ──

  // 1. Tick plant timers (repairs/maintenance complete)
  s.plants = PlantEngine.tickPlantTimers(s.plants);

  // 2. Tick failure debt
  s.plants = PlantEngine.tickFailureDebt(s.plants);

  // 3. Roll plant failures
  const prePlants = [...s.plants];
  s.plants = PlantEngine.rollFailures(s.plants, random);
  const plantFailures = PlantEngine.getFailedPlantNames(prePlants, s.plants);
  for (const name of plantFailures) {
    dayEvents.push(`${name} suffered a failure`);
  }

  // 4. Get active event effects
  const eventEffects = EventEngine.getActiveEventEffects(s.activeEvents);

  // ── PHASE 2: Player Actions ──

  // 5. Apply diesel activations (BEFORE supply calc so they help today)
  for (const plantId of s.playerActions.dieselActivated) {
    const idx = s.plants.findIndex((p) => p.id === plantId);
    if (idx >= 0 && s.plants[idx].type === 'diesel' && s.plants[idx].status === 'standby') {
      s.plants = [
        ...s.plants.slice(0, idx),
        PlantEngine.activateDiesel(s.plants[idx]),
        ...s.plants.slice(idx + 1),
      ];
      dayBudgetCosts += BALANCING.DIESEL_ACTIVATION_COST;
      dayEvents.push(`${s.plants[idx].name} diesel plant activated`);
    }
  }

  // 6. Apply maintenance scheduled
  for (const plantId of s.playerActions.maintenanceScheduled) {
    const idx = s.plants.findIndex((p) => p.id === plantId);
    if (idx >= 0 && (s.plants[idx].status === 'online' || s.plants[idx].status === 'derated')) {
      didCleanMaintenance = true;
      const maintenanceCost = random.range(BALANCING.MAINTENANCE_COST_MIN, BALANCING.MAINTENANCE_COST_MAX);
      dayBudgetCosts += maintenanceCost;
      s.plants = [
        ...s.plants.slice(0, idx),
        PlantEngine.applyMaintenance(s.plants[idx], false, random),
        ...s.plants.slice(idx + 1),
      ];
      dayEvents.push(`${s.plants[idx].name} taken offline for maintenance (R${maintenanceCost}M)`);
    }
  }

  // 7. Process deal outcomes and apply grid effects
  for (const deal of s.playerActions.deals) {
    const opp = s.todaysOpportunities.find((o) => o.id === deal.opportunityId);
    if (!opp) continue;

    if (deal.choice === 'take') {
      tookCorruptAction = true;
      const result = OpportunityEngine.applyTakeDeal(opp, random);
      result.corruptionEntry.day = s.day;
      daySkimmed += result.bagGain;
      dayHeatAdded += result.heatGain;
      dayBudgetCosts += result.budgetCost;
      dayRageFromActions += result.rageEffect;
      s.corruptionLog = [...s.corruptionLog, result.corruptionEntry];
      s.plants = applyGridEffect(s.plants, result.gridEffect, random);
      dayEvents.push(`You took the ${opp.title} deal and pocketed R${opp.skimAmount}M`);
      if (result.failed) {
        dayEvents.push(`Deal went wrong: ${result.failMessage}`);
      }
    } else if (deal.choice === 'clean') {
      const result = OpportunityEngine.applyCleanDeal(opp);
      dayBudgetCosts += result.budgetCost;
      dayRageFromActions += result.rageEffect;
      s.plants = applyGridEffect(s.plants, result.gridEffect, random);
      dayEvents.push(`You awarded ${opp.title} as a clean contract`);
    }
  }

  // ── PHASE 3: Simulation ──

  // 8. Calculate demand with event modifiers
  s.regions = SimulationEngine.calculateDemand(
    s.regions,
    s.day,
    random,
    eventEffects.demandModifiers,
  );

  // 9. Get available supply (accounting for event supply modifiers + emergency imports)
  const baseSupply = PlantEngine.getAvailableCapacity(s.plants);
  const totalSupply = Math.max(0, baseSupply + eventEffects.supplyModifier + s.emergencyImportMW);

  // 9b. Enforce minimum stage
  const totalDemandRaw = s.regions.reduce((sum, r) => sum + r.currentDemand, 0);
  const { minimumStage } = SimulationEngine.calculateMinimumStage(totalSupply, totalDemandRaw);
  if (s.currentStage < minimumStage) {
    dayEvents.push(`Grid auto-set to Stage ${minimumStage} — insufficient supply for Stage ${s.currentStage}`);
    s.currentStage = minimumStage;
  }

  // 9c. Tick diesel fuel (fuel runs out = diesel plants go standby)
  if (s.dieselFuelDays > 0) {
    s.dieselFuelDays = s.dieselFuelDays - 1;
    if (s.dieselFuelDays <= 0) {
      s.plants = s.plants.map((p) =>
        p.type === 'diesel' && p.status === 'online'
          ? { ...p, status: 'standby' as const, currentOutput: 0 }
          : p,
      );
      dayEvents.push('Diesel fuel exhausted — diesel plants returning to standby');
    }
  }

  // 10. Allocate supply across regions
  s.regions = SimulationEngine.allocateSupply(totalSupply, s.regions, s.currentStage);
  const gridResult = SimulationEngine.calculateDeficit(s.regions);

  // 11. Update region rage
  s.regions = RageEngine.updateRegionRage(s.regions);

  // ── PHASE 4: Consequences ──

  // 12. Update bag
  s.bag = s.bag + daySkimmed;

  // 13. Calculate heat
  const heatResult = HeatEngine.calculateDailyHeat(s, dayHeatAdded + eventEffects.heatDelta, tookCorruptAction);
  s.heat = heatResult.newHeat;
  dayEvents.push(...heatResult.events);

  // 14. Roll heat investigation (spec: when heat >= 66, 15% daily chance a past deal is exposed)
  if (HeatEngine.checkInvestigation(s.heat, random) && s.corruptionLog.length > 0) {
    const exposedDeal = random.pick(s.corruptionLog);
    dayRageFromActions += BALANCING.HEAT_INVESTIGATION_RAGE_COST;
    dayBudgetCosts += BALANCING.HEAT_INVESTIGATION_BUDGET_COST;
    dayEvents.push(`Investigation exposed your ${exposedDeal.action} deal from day ${exposedDeal.day}`);
  }

  // 15. Calculate rage (new formula: rewards stage reduction + meeting demand)
  const rageResult = RageEngine.calculateDailyRage(
    s,
    s.regions,
    gridResult.supplyRatio,
    didCleanMaintenance,
  );
  s.rage = Math.max(0, Math.min(BALANCING.RAGE_REVOLT_THRESHOLD, rageResult.newRage + dayRageFromActions + eventEffects.rageDelta));
  dayEvents.push(...rageResult.rageEvents);

  // 15b. Apply public defection at extreme rage (capped at max)
  const defectionResult = RageEngine.applyPublicDefection(s.regions, s.rage, s.totalDefection);
  s.regions = defectionResult.regions;
  if (defectionResult.newTotalDefection > s.totalDefection) {
    dayEvents.push(`Public going off-grid — ${Math.round(defectionResult.newTotalDefection * 100)}% demand permanently lost`);
  }
  s.totalDefection = defectionResult.newTotalDefection;

  // 15c. Track demand satisfaction + consecutive good days
  const demandFullyMet = gridResult.supplyRatio >= 1.0 && s.currentStage === 0;
  const demandNearMet = gridResult.supplyRatio >= BALANCING.RAGE_ADEQUATE_SUPPLY_THRESHOLD
    && s.currentStage <= BALANCING.DEMAND_NEAR_MET_STAGE_MAX;

  if (demandFullyMet) {
    s.demandMetDays = s.demandMetDays + 1;
    s.consecutiveGoodDays = s.consecutiveGoodDays + 1;
  } else {
    s.consecutiveGoodDays = 0;
  }

  // 15d. Calculate demand satisfaction budget bonus
  let satisfactionBonus = 0;
  if (demandFullyMet) {
    satisfactionBonus = BALANCING.DEMAND_MET_BUDGET_BONUS;
    dayEvents.push('Full power delivery — consumer confidence boosting revenue');
  } else if (demandNearMet) {
    satisfactionBonus = BALANCING.DEMAND_NEAR_MET_BUDGET_BONUS;
  }

  // Apply streak multiplier
  if (satisfactionBonus > 0 && s.consecutiveGoodDays >= BALANCING.GOOD_DAYS_STREAK_HIGH_THRESHOLD) {
    satisfactionBonus = Math.round(satisfactionBonus * BALANCING.GOOD_DAYS_STREAK_HIGH_MULTIPLIER);
    dayEvents.push(`${s.consecutiveGoodDays}-day stability streak — bonus doubled!`);
  } else if (satisfactionBonus > 0 && s.consecutiveGoodDays >= BALANCING.GOOD_DAYS_STREAK_MID_THRESHOLD) {
    satisfactionBonus = Math.round(satisfactionBonus * BALANCING.GOOD_DAYS_STREAK_MID_MULTIPLIER);
  }

  // 16. Calculate economy
  const revenue = EconomyEngine.calculateRevenue(s.regions, s.rage, s.tariffMultiplier);
  const fuelCosts = EconomyEngine.calculateCosts(s.plants, 0);
  const heatPenalty = EconomyEngine.calculateHeatPenalty(s.budget, s.heat);
  const totalDayCosts = fuelCosts + dayBudgetCosts + eventEffects.budgetDelta + heatPenalty - satisfactionBonus;
  if (heatPenalty > 0) {
    dayEvents.push(`Legal fees from investigations: -R${heatPenalty}M`);
  }
  const econResult = EconomyEngine.updateBudget(s.budget, revenue, totalDayCosts);
  s.budget = econResult.newBudget;

  // 17. Track bankruptcy days
  if (s.budget < 0) {
    s.bankruptcyDays = s.bankruptcyDays + 1;
  } else {
    s.bankruptcyDays = 0;
  }

  // 18. Track consecutive low supply days
  if (gridResult.supplyRatio < BALANCING.GRID_COLLAPSE_SUPPLY_RATIO) {
    s.consecutiveLowSupplyDays = s.consecutiveLowSupplyDays + 1;
  } else {
    s.consecutiveLowSupplyDays = 0;
  }

  // ── PHASE 5: Events ──

  // 19. Roll new events (BEFORE tick so new events get their full duration)
  const newEvents = EventEngine.rollNewEvents(s, random);
  if (newEvents.length > 0) {
    s.activeEvents = [...s.activeEvents, ...newEvents];
    for (const ne of newEvents) {
      dayEvents.push(`${ne.event.icon} ${ne.event.title}: ${ne.event.description}`);
    }
  }

  // 20. Tick active events (after effects applied, before next day)
  s.activeEvents = EventEngine.tickActiveEvents(s.activeEvents);

  // 21. Update histories
  s.bagHistory = [...s.bagHistory, s.bag];
  s.heatHistory = [...s.heatHistory, s.heat];
  s.rageHistory = [...s.rageHistory, s.rage];
  s.stageHistory = [...s.stageHistory, s.currentStage];

  // 22. Check end conditions
  const endCondition = checkEndConditions(s);
  if (endCondition) {
    s.gameOver = true;
    s.gameOverReason = endCondition.reason;
    s.phase = 'game_over';
    dayEvents.push(endCondition.description);
  } else if (s.day >= BALANCING.TOTAL_DAYS) {
    s.gameOver = true;
    s.gameOverReason = 'survived';
    s.phase = 'game_over';
    dayEvents.push('You survived your full 30-day appointment!');
  }

  // 23. Build day report
  const dayReport: DayReport = {
    day: s.day,
    skimmed: daySkimmed,
    avgStage: s.stageHistory.length > 0
      ? s.stageHistory.reduce((a, b) => a + b, 0) / s.stageHistory.length
      : s.currentStage,
    heatDelta: heatResult.heatDelta,
    rageDelta: rageResult.rageDelta,
    budgetDelta: econResult.budgetDelta,
    events: dayEvents,
    plantFailures,
    revenue,
    costs: totalDayCosts,
    supplyTotal: gridResult.totalSupply,
    demandTotal: gridResult.totalDemand,
  };

  // 24. Generate tomorrow's teaser
  if (!s.gameOver && s.day < BALANCING.TOTAL_DAYS) {
    const teaserRandom = new SeededRandom(`${s.seed}-day-${s.day + 1}-teaser`);
    const teaserOpps = OpportunityEngine.generateOpportunities(
      s.day + 1,
      s.recentOpportunityIds,
      s.heat,
      teaserRandom,
    );
    if (teaserOpps.length > 0) {
      const biggestOpp = teaserOpps.reduce((max, op) =>
        op.skimAmount > max.skimAmount ? op : max, teaserOpps[0]);
      dayReport.tomorrowTeaser = {
        title: biggestOpp.title,
        skimAmount: biggestOpp.skimAmount,
        hint: s.heat > 70 ? `But your heat is at ${Math.round(s.heat)}%...` : 'Tempting...',
      };
    }
  }

  s.dayReport = dayReport;
  s.phase = s.gameOver ? 'game_over' : 'summary';

  return s;
}

/**
 * Check all end conditions.
 */
export function checkEndConditions(state: GameState): EndCondition | null {
  // Heat arrest
  if (HeatEngine.checkArrest(state.heat, new SeededRandom(`${state.seed}-arrest-${state.day}`))) {
    return {
      reason: 'heat',
      description: 'The Hawks have come for you. You are under arrest.',
    };
  }

  // Rage no longer causes direct game-over — it's indirect pressure
  // via revenue penalties, protest events, and public defection

  // Grid collapse
  if (state.consecutiveLowSupplyDays >= BALANCING.GRID_COLLAPSE_CONSECUTIVE_DAYS) {
    return {
      reason: 'collapse',
      description: 'Total grid collapse. The country goes dark.',
    };
  }

  // Bankruptcy
  if (EconomyEngine.checkBankruptcy(state.budget, state.bankruptcyDays)) {
    return {
      reason: 'bankrupt',
      description: 'The grid is bankrupt. Operations cease.',
    };
  }

  return null;
}

/**
 * Advance to the next day, generating new opportunities.
 */
export function advanceToNextDay(state: GameState): GameState {
  const nextDay = state.day + 1;
  const random = new SeededRandom(`${state.seed}-day-${nextDay}`);

  const opportunities = OpportunityEngine.generateOpportunities(
    nextDay,
    state.recentOpportunityIds,
    state.heat,
    random,
  );

  // Auto-set stage to at least recommended for the new day
  const supply = PlantEngine.getAvailableCapacity(state.plants);
  const demand = state.regions.reduce((sum, r) => sum + r.baseDemand, 0);
  const { recommendedStage } = SimulationEngine.calculateMinimumStage(supply, demand);
  const newStage = Math.max(state.currentStage, recommendedStage);

  return {
    ...state,
    day: nextDay,
    phase: 'opportunities',
    currentStage: newStage,
    todaysOpportunities: opportunities,
    recentOpportunityIds: OpportunityEngine.updateRecentOpportunities(
      state.recentOpportunityIds,
      opportunities.map((o) => o.id),
    ),
    dayReport: null,
    emergencyImportMW: 0, // Reset daily import
    playerActions: createEmptyActions(),
  };
}

/**
 * Apply the "flee" action. Player keeps 40% of bag.
 */
export function flee(state: GameState): GameState {
  return {
    ...state,
    bag: Math.round(state.bag * BALANCING.FLEE_BAG_RETENTION),
    gameOver: true,
    gameOverReason: 'fled',
    phase: 'game_over',
  };
}
