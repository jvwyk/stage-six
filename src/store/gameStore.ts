import { create } from 'zustand';
import type { GameState, Screen } from '../data/types';
import * as GameEngine from '../engine/GameEngine';
import * as EventEngine from '../engine/EventEngine';
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
  takeDeal: (opportunityId: string) => void;
  cleanDeal: (opportunityId: string) => void;
  skipDeal: (opportunityId: string) => void;
  setStage: (stage: number) => void;
  activateDiesel: (plantId: string) => void;
  scheduleMaintenance: (plantId: string) => void;
  makeEventChoice: (eventId: string, choiceIndex: number) => void;

  // Fuel & capacity
  buyDieselFuel: () => void;
  buyEmergencyImport: () => void;

  // Budget recovery
  increaseTariff: () => void;
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

  takeDeal: (opportunityId) => {
    const { game } = get();
    if (!game) return;

    const updated: GameState = {
      ...game,
      playerActions: {
        ...game.playerActions,
        deals: [...game.playerActions.deals, { opportunityId, choice: 'take' }],
      },
    };
    saveCurrentRun(updated);
    set({ game: updated });
  },

  cleanDeal: (opportunityId) => {
    const { game } = get();
    if (!game) return;

    const updated: GameState = {
      ...game,
      playerActions: {
        ...game.playerActions,
        deals: [...game.playerActions.deals, { opportunityId, choice: 'clean' }],
      },
    };
    saveCurrentRun(updated);
    set({ game: updated });
  },

  skipDeal: (opportunityId) => {
    const { game } = get();
    if (!game) return;

    const updated: GameState = {
      ...game,
      playerActions: {
        ...game.playerActions,
        deals: [...game.playerActions.deals, { opportunityId, choice: 'skip' }],
      },
    };
    saveCurrentRun(updated);
    set({ game: updated });
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

    // Immediately take offline and deduct cost
    const maintenanceCost = Math.round(
      BALANCING.MAINTENANCE_COST_MIN +
      Math.random() * (BALANCING.MAINTENANCE_COST_MAX - BALANCING.MAINTENANCE_COST_MIN),
    );
    const duration = Math.round(
      BALANCING.MAINTENANCE_DURATION_MIN +
      Math.random() * (BALANCING.MAINTENANCE_DURATION_MAX - BALANCING.MAINTENANCE_DURATION_MIN),
    );

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
      playerActions: {
        ...game.playerActions,
        maintenanceScheduled: [...game.playerActions.maintenanceScheduled, plantId],
      },
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

  endDay: () => {
    const { game } = get();
    if (!game) return;

    const resolved = GameEngine.resolveDay(game);
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
