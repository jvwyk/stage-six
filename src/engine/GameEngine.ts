import type { GameState, DayReport, EndCondition, PlantState, RegionState, PlayerActions } from '../data/types';
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
 * Resolve a full day. Returns the updated state with a day report.
 */
export function resolveDay(state: GameState): GameState {
  const random = new SeededRandom(`${state.seed}-day-${state.day}`);
  let s = { ...state };

  // 1. Tick plant timers (repairs/maintenance complete)
  s.plants = PlantEngine.tickPlantTimers(s.plants);

  // 2. Tick failure debt
  s.plants = PlantEngine.tickFailureDebt(s.plants);

  // 3. Roll plant failures
  const prePlants = [...s.plants];
  s.plants = PlantEngine.rollFailures(s.plants, random);
  const plantFailures = PlantEngine.getFailedPlantNames(prePlants, s.plants);

  // 4. Get event effects
  const eventEffects = EventEngine.getActiveEventEffects(s.activeEvents);

  // 5. Calculate demand with event modifiers
  s.regions = SimulationEngine.calculateDemand(
    s.regions,
    s.day,
    random,
    eventEffects.demandModifiers,
  );

  // 6. Get available supply (accounting for event supply modifiers)
  const baseSupply = PlantEngine.getAvailableCapacity(s.plants);
  const totalSupply = Math.max(0, baseSupply + eventEffects.supplyModifier);

  // 7. Allocate supply across regions
  s.regions = SimulationEngine.allocateSupply(totalSupply, s.regions, s.currentStage);
  const gridResult = SimulationEngine.calculateDeficit(s.regions);

  // 8. Update region rage
  s.regions = RageEngine.updateRegionRage(s.regions);

  // 9. Calculate deal outcomes
  let daySkimmed = 0;
  let dayHeatAdded = 0;
  let dayBudgetFromDeals = 0;
  let dayRageFromDeals = 0;
  let tookCorruptAction = false;
  let didCleanMaintenance = false;
  const dayEvents: string[] = [];

  for (const deal of s.playerActions.deals) {
    const opp = s.todaysOpportunities.find((o) => o.id === deal.opportunityId);
    if (!opp) continue;

    if (deal.choice === 'take') {
      tookCorruptAction = true;
      const result = OpportunityEngine.applyTakeDeal(opp, random);
      result.corruptionEntry.day = s.day;
      daySkimmed += result.bagGain;
      dayHeatAdded += result.heatGain;
      dayBudgetFromDeals -= result.budgetCost;
      dayRageFromDeals += result.rageEffect;
      s.corruptionLog = [...s.corruptionLog, result.corruptionEntry];
      dayEvents.push(`You took the ${opp.title} deal and pocketed R${opp.skimAmount}M`);
      if (result.failed) {
        dayEvents.push(`Deal went wrong: ${result.failMessage}`);
      }
    } else if (deal.choice === 'clean') {
      const result = OpportunityEngine.applyCleanDeal(opp);
      dayBudgetFromDeals -= result.budgetCost;
      dayRageFromDeals += result.rageEffect;
      dayEvents.push(`You awarded ${opp.title} as a clean contract`);
    }
  }

  // 10. Apply maintenance scheduled
  for (const plantId of s.playerActions.maintenanceScheduled) {
    const idx = s.plants.findIndex((p) => p.id === plantId);
    if (idx >= 0 && (s.plants[idx].status === 'online' || s.plants[idx].status === 'derated')) {
      didCleanMaintenance = true;
      s.plants = [
        ...s.plants.slice(0, idx),
        PlantEngine.applyMaintenance(s.plants[idx], false, random),
        ...s.plants.slice(idx + 1),
      ];
      dayEvents.push(`${s.plants[idx].name} taken offline for maintenance`);
    }
  }

  // 11. Apply diesel activations
  for (const plantId of s.playerActions.dieselActivated) {
    const idx = s.plants.findIndex((p) => p.id === plantId);
    if (idx >= 0) {
      s.plants = [
        ...s.plants.slice(0, idx),
        PlantEngine.activateDiesel(s.plants[idx]),
        ...s.plants.slice(idx + 1),
      ];
      dayEvents.push(`${s.plants[idx].name} diesel plant activated`);
    }
  }

  // 12. Update bag
  s.bag = s.bag + daySkimmed;

  // 13. Calculate heat
  const heatResult = HeatEngine.calculateDailyHeat(s, dayHeatAdded + eventEffects.heatDelta, tookCorruptAction);
  s.heat = heatResult.newHeat;
  dayEvents.push(...heatResult.events);

  // 14. Calculate rage
  const stageChanged = s.stageHistory.length > 0 &&
    s.stageHistory[s.stageHistory.length - 1] !== s.currentStage;
  const rageResult = RageEngine.calculateDailyRage(
    s,
    s.regions,
    stageChanged,
    didCleanMaintenance,
  );
  s.rage = Math.max(0, Math.min(100, rageResult.newRage + dayRageFromDeals + eventEffects.rageDelta));
  dayEvents.push(...rageResult.rageEvents);

  // 15. Calculate economy
  const revenue = EconomyEngine.calculateRevenue(s.regions, s.rage);
  const costs = EconomyEngine.calculateCosts(s.plants, 0);
  const econResult = EconomyEngine.updateBudget(
    s.budget + dayBudgetFromDeals + eventEffects.budgetDelta,
    revenue,
    costs,
  );
  s.budget = econResult.newBudget;

  // 16. Track bankruptcy days
  if (s.budget < 0) {
    s.bankruptcyDays = s.bankruptcyDays + 1;
  } else {
    s.bankruptcyDays = 0;
  }

  // 17. Track consecutive low supply days
  if (gridResult.supplyRatio < BALANCING.GRID_COLLAPSE_SUPPLY_RATIO) {
    s.consecutiveLowSupplyDays = s.consecutiveLowSupplyDays + 1;
  } else {
    s.consecutiveLowSupplyDays = 0;
  }

  // 18. Tick active events
  s.activeEvents = EventEngine.tickActiveEvents(s.activeEvents);

  // 19. Roll new events
  const newEvents = EventEngine.rollNewEvents(s, random);
  if (newEvents.length > 0) {
    s.activeEvents = [...s.activeEvents, ...newEvents];
    for (const ne of newEvents) {
      dayEvents.push(`${ne.event.icon} ${ne.event.title}: ${ne.event.description}`);
    }
  }

  // 20. Record plant failures
  for (const name of plantFailures) {
    dayEvents.push(`${name} suffered a failure`);
  }

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
    budgetDelta: econResult.budgetDelta + dayBudgetFromDeals + eventEffects.budgetDelta,
    events: dayEvents,
    plantFailures,
    revenue,
    costs,
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

  // Rage revolt
  if (state.rage >= BALANCING.RAGE_REVOLT_THRESHOLD) {
    return {
      reason: 'rage',
      description: 'The people have had enough. You are removed from office.',
    };
  }

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

  return {
    ...state,
    day: nextDay,
    phase: 'opportunities',
    todaysOpportunities: opportunities,
    recentOpportunityIds: OpportunityEngine.updateRecentOpportunities(
      state.recentOpportunityIds,
      opportunities.map((o) => o.id),
    ),
    dayReport: null,
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
    gameOverReason: 'survived', // Treated as survived but with reduced bag
    phase: 'game_over',
  };
}
