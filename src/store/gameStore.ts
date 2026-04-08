import { create } from 'zustand';
import type { GameState, Screen } from '../data/types';
import * as GameEngine from '../engine/GameEngine';
import * as EventEngine from '../engine/EventEngine';
import * as OpportunityEngine from '../engine/OpportunityEngine';
import { SeededRandom } from '../engine/RandomEngine';
import { buildCompletedRun } from '../engine/ScoringEngine';
import { BALANCING } from '../data/balancing';
import { saveCurrentRun, clearCurrentRun, loadCurrentRun } from '../utils/storage';
import { useHistoryStore } from './historyStore';

interface GameStore {
  game: GameState | null;
  screen: Screen;

  // Navigation
  setScreen: (screen: Screen) => void;

  // Game lifecycle
  newGame: (mode: 'standard' | 'daily', seed?: string) => void;
  resumeGame: () => void;
  abandonRun: () => void;

  // Player actions
  setStage: (stage: number) => void;
  setPlantMode: (plantId: string, mode: import('../data/types').PlantOperatingMode) => void;
  activateDiesel: (plantId: string) => void;
  scheduleMaintenance: (plantId: string) => void;
  rushRepair: (plantId: string) => void;
  rushMaintenance: (plantId: string) => void;
  makeEventChoice: (eventId: string, choiceIndex: number) => void;

  // Tender actions
  processTender: (tenderId: string, action: import('../data/types').TenderAction, inflationLevel: number) => void;

  // Power diversion
  setDiversion: (mw: number) => void;

  // Influence
  spendInfluence: (action: 'suppress_rage' | 'deflect_investigation' | 'cover_diversion') => void;

  // Fuel & capacity
  buyDieselFuel: () => void;
  buyEmergencyImport: () => void;

  // Budget recovery & transactions
  increaseTariff: () => void;
  reduceTariff: () => void;
  sellDieselFuel: () => void;
  requestBailout: () => void;
  requestEmergencyLevy: () => void;

  // Day lifecycle
  endDay: () => void;
  continueTomorrow: () => void;
  flee: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  game: null,
  screen: 'title',

  setScreen: (screen) => set({ screen }),

  newGame: (mode, seed) => {
    const game = GameEngine.createNewGame(mode, seed);
    saveCurrentRun(game);
    set({ game, screen: 'dashboard' });
  },

  resumeGame: () => {
    const game = loadCurrentRun();
    if (game) {
      set({ game, screen: 'dashboard' });
    }
  },

  abandonRun: () => {
    clearCurrentRun();
    set({ game: null, screen: 'title' });
  },


  setStage: (stage) => {
    const { game } = get();
    if (!game) return;

    const updated: GameState = {
      ...game,
      currentStage: Math.max(0, Math.min(8, stage)),
      playerActions: {
        ...game.playerActions,
        stageSet: stage,
      },
    };
    saveCurrentRun(updated);
    set({ game: updated });
  },

  setPlantMode: (plantId, mode) => {
    const { game } = get();
    if (!game) return;
    const idx = game.plants.findIndex((p) => p.id === plantId);
    if (idx < 0) return;
    const plant = game.plants[idx];
    if (plant.status !== 'online' && plant.status !== 'derated') return;

    const updatedPlants = [...game.plants];
    updatedPlants[idx] = { ...plant, operatingMode: mode };
    const updated: GameState = { ...game, plants: updatedPlants };
    saveCurrentRun(updated);
    set({ game: updated });
  },

  activateDiesel: (plantId) => {
    const { game } = get();
    if (!game) return;
    const plantIdx = game.plants.findIndex((p) => p.id === plantId);
    if (plantIdx < 0) return;
    const plant = game.plants[plantIdx];
    if (plant.type !== 'diesel' || plant.status !== 'standby') return;

    // Cold start: plant goes to 'starting', costs budget immediately
    const updatedPlants = [...game.plants];
    updatedPlants[plantIdx] = {
      ...plant,
      status: 'starting' as const,
      currentOutput: 0,
      daysUntilRepair: BALANCING.DIESEL_COLD_START_DAYS,
    };

    const updated: GameState = {
      ...game,
      plants: updatedPlants,
      budget: game.budget - BALANCING.DIESEL_ACTIVATION_COST,
      transactionLog: [...game.transactionLog, { label: `Start ${plant.name}`, amount: -BALANCING.DIESEL_ACTIVATION_COST }],
      playerActions: {
        ...game.playerActions,
        dieselActivated: [...game.playerActions.dieselActivated, plantId],
      },
    };
    saveCurrentRun(updated);
    set({ game: updated });
  },

  scheduleMaintenance: (plantId) => {
    const { game } = get();
    if (!game) return;
    const plantIdx = game.plants.findIndex((p) => p.id === plantId);
    if (plantIdx < 0) return;
    const plant = game.plants[plantIdx];
    if (plant.status !== 'online' && plant.status !== 'derated') return;

    // Immediately take offline and deduct cost (use seeded random for determinism)
    const mRandom = new SeededRandom(`${game.seed}-maint-${game.day}-${plantId}`);
    const maintenanceCost = mRandom.range(BALANCING.MAINTENANCE_COST_MIN, BALANCING.MAINTENANCE_COST_MAX);
    const duration = mRandom.range(BALANCING.MAINTENANCE_DURATION_MIN, BALANCING.MAINTENANCE_DURATION_MAX);

    const updatedPlants = [...game.plants];
    updatedPlants[plantIdx] = {
      ...plant,
      status: 'maintenance' as const,
      currentOutput: 0,
      maintenanceDaysLeft: duration,
      failureDebt: Math.max(0, plant.failureDebt - BALANCING.FAILURE_DEBT_CLEAN_MAINTENANCE_DECREASE),
    };

    const updated: GameState = {
      ...game,
      plants: updatedPlants,
      budget: game.budget - maintenanceCost,
      transactionLog: [...game.transactionLog, { label: `Maintain ${plant.name}`, amount: -maintenanceCost }],
      playerActions: {
        ...game.playerActions,
        maintenanceScheduled: [...game.playerActions.maintenanceScheduled, plantId],
      },
    };
    saveCurrentRun(updated);
    set({ game: updated });
  },

  rushRepair: (plantId) => {
    const { game } = get();
    if (!game || game.budget < BALANCING.RUSH_REPAIR_COST) return;
    const idx = game.plants.findIndex((p) => p.id === plantId);
    if (idx < 0 || game.plants[idx].status !== 'forced_outage' || game.plants[idx].daysUntilRepair <= 0) return;

    const updatedPlants = [...game.plants];
    updatedPlants[idx] = {
      ...game.plants[idx],
      daysUntilRepair: Math.ceil(game.plants[idx].daysUntilRepair / 2),
    };
    const updated: GameState = {
      ...game,
      plants: updatedPlants,
      budget: game.budget - BALANCING.RUSH_REPAIR_COST,
      heat: Math.min(BALANCING.HEAT_MAX, game.heat + BALANCING.RUSH_REPAIR_HEAT),
      transactionLog: [...game.transactionLog, { label: `Rush repair ${game.plants[idx].name}`, amount: -BALANCING.RUSH_REPAIR_COST }],
    };
    saveCurrentRun(updated);
    set({ game: updated });
  },

  rushMaintenance: (plantId) => {
    const { game } = get();
    if (!game || game.budget < BALANCING.RUSH_MAINTENANCE_COST) return;
    const idx = game.plants.findIndex((p) => p.id === plantId);
    if (idx < 0 || game.plants[idx].status !== 'maintenance' || game.plants[idx].maintenanceDaysLeft <= 0) return;

    const updatedPlants = [...game.plants];
    updatedPlants[idx] = {
      ...game.plants[idx],
      maintenanceDaysLeft: Math.max(1, game.plants[idx].maintenanceDaysLeft - 1),
    };
    const updated: GameState = {
      ...game,
      plants: updatedPlants,
      budget: game.budget - BALANCING.RUSH_MAINTENANCE_COST,
      heat: Math.min(BALANCING.HEAT_MAX, game.heat + BALANCING.RUSH_MAINTENANCE_HEAT),
      transactionLog: [...game.transactionLog, { label: `Rush maintenance ${game.plants[idx].name}`, amount: -BALANCING.RUSH_MAINTENANCE_COST }],
    };
    saveCurrentRun(updated);
    set({ game: updated });
  },

  makeEventChoice: (eventId, choiceIndex) => {
    const { game } = get();
    if (!game) return;

    const updated: GameState = {
      ...game,
      activeEvents: EventEngine.applyEventChoice(game.activeEvents, eventId, choiceIndex),
      playerActions: {
        ...game.playerActions,
        eventChoices: [...game.playerActions.eventChoices, { eventId, choiceIndex }],
      },
    };
    saveCurrentRun(updated);
    set({ game: updated });
  },

  buyDieselFuel: () => {
    const { game } = get();
    if (!game || game.budget < BALANCING.DIESEL_FUEL_COST) return;
    // Must have at least one diesel plant that's online or starting
    const hasDiesel = game.plants.some((p) => p.type === 'diesel' && (p.status === 'online' || p.status === 'starting'));
    if (!hasDiesel) return;

    const updated: GameState = {
      ...game,
      budget: game.budget - BALANCING.DIESEL_FUEL_COST,
      dieselFuelDays: game.dieselFuelDays + BALANCING.DIESEL_FUEL_DURATION,
      transactionLog: [...game.transactionLog, { label: 'Buy diesel fuel', amount: -BALANCING.DIESEL_FUEL_COST }],
    };
    saveCurrentRun(updated);
    set({ game: updated });
  },

  buyEmergencyImport: () => {
    const { game } = get();
    if (!game || game.budget < BALANCING.EMERGENCY_IMPORT_COST) return;
    if (game.emergencyImportMW > 0) return; // Max 1 per day

    const updated: GameState = {
      ...game,
      budget: game.budget - BALANCING.EMERGENCY_IMPORT_COST,
      emergencyImportMW: BALANCING.EMERGENCY_IMPORT_MW,
      transactionLog: [...game.transactionLog, { label: 'Emergency import', amount: -BALANCING.EMERGENCY_IMPORT_COST }],
    };
    saveCurrentRun(updated);
    set({ game: updated });
  },

  increaseTariff: () => {
    const { game } = get();
    if (!game || game.tariffIncreases >= BALANCING.TARIFF_INCREASE_MAX) return;

    const updated: GameState = {
      ...game,
      tariffIncreases: game.tariffIncreases + 1,
      tariffMultiplier: game.tariffMultiplier + BALANCING.TARIFF_INCREASE_AMOUNT,
      rage: Math.min(BALANCING.RAGE_REVOLT_THRESHOLD, game.rage + BALANCING.TARIFF_INCREASE_RAGE_COST),
      transactionLog: [...game.transactionLog, { label: 'Tariff increase (+15% rev)', amount: 0 }],
    };
    saveCurrentRun(updated);
    set({ game: updated });
  },

  reduceTariff: () => {
    const { game } = get();
    if (!game || game.tariffIncreases <= 0) return;

    const updated: GameState = {
      ...game,
      tariffIncreases: game.tariffIncreases - 1,
      tariffMultiplier: Math.max(1.0, game.tariffMultiplier - BALANCING.TARIFF_INCREASE_AMOUNT),
      rage: Math.max(0, game.rage - BALANCING.TARIFF_DECREASE_RAGE_BONUS),
      transactionLog: [...game.transactionLog, { label: 'Tariff reduction (-15% rev)', amount: 0 }],
    };
    saveCurrentRun(updated);
    set({ game: updated });
  },

  sellDieselFuel: () => {
    const { game } = get();
    if (!game || game.dieselFuelDays <= 0) return;

    const days = game.dieselFuelDays;
    const budgetGain = BALANCING.DIESEL_FUEL_SELL_PRICE_PER_DAY * days;
    const skimGain = BALANCING.DIESEL_FUEL_SELL_SKIM_PER_DAY * days;

    const updated: GameState = {
      ...game,
      budget: game.budget + budgetGain,
      bag: game.bag + skimGain,
      heat: Math.min(BALANCING.HEAT_MAX, game.heat + BALANCING.DIESEL_FUEL_SELL_HEAT),
      dieselFuelDays: 0,
      corruptionLog: [...game.corruptionLog, {
        day: game.day,
        action: 'Diesel fuel sale (black market)',
        skimAmount: skimGain,
        heatAdded: BALANCING.DIESEL_FUEL_SELL_HEAT,
        category: 'selloff' as const,
        inflationLevel: 0,
      }],
      transactionLog: [
        ...game.transactionLog,
        { label: `Sold ${days}d diesel fuel`, amount: budgetGain },
        { label: 'Your cut (fuel skim)', amount: skimGain },
      ],
    };
    saveCurrentRun(updated);
    set({ game: updated });
  },

  requestBailout: () => {
    const { game } = get();
    if (!game || game.bailoutUsed) return;

    const updated: GameState = {
      ...game,
      budget: game.budget + BALANCING.BAILOUT_AMOUNT,
      heat: Math.min(BALANCING.HEAT_MAX, game.heat + BALANCING.BAILOUT_HEAT_COST),
      rage: Math.min(BALANCING.RAGE_REVOLT_THRESHOLD, game.rage + BALANCING.BAILOUT_RAGE_COST),
      bailoutUsed: true,
    };
    saveCurrentRun(updated);
    set({ game: updated });
  },

  requestEmergencyLevy: () => {
    const { game } = get();
    if (!game || game.emergencyLevyUsed) return;

    // Reduce economic value of industrial regions (tier 2)
    const updatedRegions = game.regions.map((r) => {
      if (r.tier === 2) {
        return { ...r, economicValue: r.economicValue * (1 - BALANCING.EMERGENCY_LEVY_ECONOMIC_PENALTY) };
      }
      return r;
    });

    const updated: GameState = {
      ...game,
      budget: game.budget + BALANCING.EMERGENCY_LEVY_AMOUNT,
      heat: Math.min(BALANCING.HEAT_MAX, game.heat + BALANCING.EMERGENCY_LEVY_HEAT_COST),
      rage: Math.min(BALANCING.RAGE_REVOLT_THRESHOLD, game.rage + BALANCING.EMERGENCY_LEVY_RAGE_COST),
      regions: updatedRegions,
      emergencyLevyUsed: true,
    };
    saveCurrentRun(updated);
    set({ game: updated });
  },

  processTender: (tenderId, action, inflationLevel) => {
    const { game } = get();
    if (!game) return;

    if (action === 'delay') {
      // Handle delay: move to delayed list, add rage
      const opp = game.todaysOpportunities.find((o) => o.id === tenderId);
      if (!opp || opp.delayCount >= BALANCING.TENDER_DELAY_MAX) return;

      const { delayed, worsened } = OpportunityEngine.applyTenderDelay(opp, new SeededRandom(game.day * 1000 + game.delayedTenders.length));

      const updated: GameState = {
        ...game,
        rage: Math.min(BALANCING.RAGE_REVOLT_THRESHOLD, game.rage + BALANCING.TENDER_DELAY_RAGE_COST),
        delayedTenders: [...game.delayedTenders, delayed],
        playerActions: {
          ...game.playerActions,
          tenders: [...game.playerActions.tenders, { tenderId, action, inflationLevel: 0 }],
        },
        transactionLog: [...game.transactionLog, {
          label: `Delayed ${opp.title}${worsened ? ' (cost increased!)' : ''}`,
          amount: 0,
        }],
      };
      saveCurrentRun(updated);
      set({ game: updated });
      return;
    }

    const updated: GameState = {
      ...game,
      playerActions: {
        ...game.playerActions,
        tenders: [...game.playerActions.tenders, { tenderId, action, inflationLevel }],
      },
    };
    saveCurrentRun(updated);
    set({ game: updated });
  },

  setDiversion: (mw) => {
    const { game } = get();
    if (!game) return;

    const maxMW = Math.round(
      game.plants.reduce((sum, p) =>
        (p.status === 'online' || p.status === 'derated') ? sum + p.currentOutput : sum, 0)
      * BALANCING.DIVERSION_MAX_RATIO,
    );
    const clamped = Math.max(0, Math.min(mw, maxMW));

    const updated: GameState = { ...game, diversionMW: clamped };
    saveCurrentRun(updated);
    set({ game: updated });
  },

  spendInfluence: (action) => {
    const { game } = get();
    if (!game) return;

    let cost = 0;
    let rageReduction = 0;

    switch (action) {
      case 'suppress_rage':
        cost = BALANCING.INFLUENCE_SUPPRESS_RAGE_COST;
        rageReduction = BALANCING.INFLUENCE_SUPPRESS_RAGE_AMOUNT;
        break;
      case 'deflect_investigation':
        cost = BALANCING.INFLUENCE_DEFLECT_INVESTIGATION_COST;
        break;
      case 'cover_diversion':
        cost = BALANCING.INFLUENCE_COVER_DIVERSION_COST;
        break;
    }

    if (game.influence < cost) return;

    const updated: GameState = {
      ...game,
      influence: game.influence - cost,
      rage: Math.max(0, game.rage - rageReduction),
      deflectedInvestigation: action === 'deflect_investigation' ? true : game.deflectedInvestigation,
      diversionCovered: action === 'cover_diversion' ? true : game.diversionCovered,
      transactionLog: [...game.transactionLog, { label: `Influence: ${action.replace(/_/g, ' ')}`, amount: 0 }],
    };
    saveCurrentRun(updated);
    set({ game: updated });
  },

  endDay: () => {
    const { game } = get();
    if (!game) return;

    // Guardrail: block if unresolved event choices exist
    const unresolvedEvents = game.activeEvents.filter(
      (ae) => ae.event.choices && ae.event.choices.length > 0 && ae.choiceMade === undefined,
    );
    if (unresolvedEvents.length > 0) return;

    let resolved: GameState;
    try {
      resolved = GameEngine.resolveDay(game);
    } catch (e) {
      console.error('resolveDay failed:', e);
      const errGame: GameState = {
        ...game,
        transactionLog: [...game.transactionLog, { label: 'ERROR: Day could not resolve. Try again.', amount: 0 }],
      };
      saveCurrentRun(errGame);
      set({ game: errGame });
      return;
    }

    saveCurrentRun(resolved);

    if (resolved.gameOver) {
      // Save to history
      const completedRun = buildCompletedRun(resolved);
      useHistoryStore.getState().addRun(completedRun);
      clearCurrentRun();

      // Route to appropriate screen
      const screen: Screen = resolved.gameOverReason === 'heat'
        ? 'breaking_news'
        : 'game_over';
      set({ game: resolved, screen });
    } else {
      set({ game: resolved, screen: 'day_summary' });
    }
  },

  continueTomorrow: () => {
    const { game } = get();
    if (!game) return;

    const nextDayState = GameEngine.advanceToNextDay(game);
    saveCurrentRun(nextDayState);
    set({ game: nextDayState, screen: 'dashboard' });
  },

  flee: () => {
    const { game } = get();
    if (!game) return;

    const fledState = GameEngine.flee(game);
    const completedRun = buildCompletedRun(fledState);
    useHistoryStore.getState().addRun(completedRun);
    clearCurrentRun();
    set({ game: fledState, screen: 'game_over' });
  },
}));
