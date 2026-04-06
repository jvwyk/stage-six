import { create } from 'zustand';
import type { GameState, Screen } from '../data/types';
import * as GameEngine from '../engine/GameEngine';
import * as EventEngine from '../engine/EventEngine';
import { buildCompletedRun } from '../engine/ScoringEngine';
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

    const updated: GameState = {
      ...game,
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

    const updated: GameState = {
      ...game,
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
