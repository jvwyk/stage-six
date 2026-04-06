import type { GameState, ActiveEvent } from '../data/types';
import { EVENTS } from '../data/events';
import { BALANCING } from '../data/balancing';
import type { SeededRandom } from './RandomEngine';

/**
 * Roll for new events based on current game state.
 */
export function rollNewEvents(
  state: GameState,
  random: SeededRandom,
): ActiveEvent[] {
  const { day } = state;

  // Determine event chance based on game phase
  let eventChance = BALANCING.EVENT_BASE_CHANCE_EARLY;
  if (day > BALANCING.EVENT_MID_DAY_END) {
    eventChance = BALANCING.EVENT_BASE_CHANCE_LATE;
  } else if (day > BALANCING.EVENT_EARLY_DAY_END) {
    eventChance = BALANCING.EVENT_BASE_CHANCE_MID;
  }

  // Check how many active events we have
  if (state.activeEvents.length >= BALANCING.MAX_ACTIVE_EVENTS) {
    return [];
  }

  if (!random.chance(eventChance)) {
    return [];
  }

  // Filter eligible events
  const activeEventIds = new Set(state.activeEvents.map((e) => e.event.id));
  const eligible = EVENTS.filter((event) => {
    if (event.minDay > day || event.maxDay < day) return false;
    if (activeEventIds.has(event.id)) return false;
    if (event.triggerCondition && !event.triggerCondition(state)) return false;
    return true;
  });

  if (eligible.length === 0) return [];

  // Weighted selection
  const weights = eligible.map((e) => e.weight);
  const selected = random.weightedPick(eligible, weights);

  return [{
    event: selected,
    remainingDays: selected.duration,
    choiceMade: undefined,
  }];
}

/**
 * Tick down active event durations. Remove expired events.
 */
export function tickActiveEvents(activeEvents: ActiveEvent[]): ActiveEvent[] {
  return activeEvents
    .map((ae) => ({
      ...ae,
      remainingDays: ae.remainingDays - 1,
    }))
    .filter((ae) => ae.remainingDays > 0 || ae.event.duration === 0);
}

/**
 * Apply ongoing effects from active events.
 * Returns supply modifiers, demand modifiers, and other deltas.
 */
export function getActiveEventEffects(
  activeEvents: ActiveEvent[],
): {
  supplyModifier: number;
  demandModifiers: Map<string, number>;
  rageDelta: number;
  heatDelta: number;
  budgetDelta: number;
} {
  let supplyModifier = 0;
  const demandModifiers = new Map<string, number>();
  let rageDelta = 0;
  let heatDelta = 0;
  let budgetDelta = 0;

  for (const ae of activeEvents) {
    // Only apply ongoing effects for events with duration > 0
    // Instant events (duration === 0) apply effects once when triggered
    if (ae.event.duration === 0 && ae.remainingDays <= 0) continue;

    for (const effect of ae.event.effects) {
      switch (effect.type) {
        case 'supply':
          supplyModifier += effect.value;
          break;
        case 'demand':
          if (effect.target) {
            const current = demandModifiers.get(effect.target) || 0;
            demandModifiers.set(effect.target, current + effect.value);
          }
          break;
        case 'rage':
          rageDelta += effect.value;
          break;
        case 'heat':
          heatDelta += effect.value;
          break;
        case 'budget':
          budgetDelta += effect.value;
          break;
      }
    }

    // Apply choice effects if a choice was made
    if (ae.choiceMade !== undefined && ae.event.choices) {
      const choice = ae.event.choices[ae.choiceMade];
      if (choice) {
        for (const effect of choice.effects) {
          switch (effect.type) {
            case 'rage':
              rageDelta += effect.value;
              break;
            case 'heat':
              heatDelta += effect.value;
              break;
            case 'budget':
              budgetDelta += effect.value;
              break;
          }
        }
      }
    }
  }

  return { supplyModifier, demandModifiers, rageDelta, heatDelta, budgetDelta };
}

/**
 * Apply a player's choice to an event.
 */
export function applyEventChoice(
  activeEvents: ActiveEvent[],
  eventId: string,
  choiceIndex: number,
): ActiveEvent[] {
  return activeEvents.map((ae) => {
    if (ae.event.id === eventId) {
      return { ...ae, choiceMade: choiceIndex };
    }
    return ae;
  });
}

/**
 * Get events that have choices pending (for UI).
 */
export function getPendingChoiceEvents(activeEvents: ActiveEvent[]): ActiveEvent[] {
  return activeEvents.filter(
    (ae) => ae.event.choices && ae.event.choices.length > 0 && ae.choiceMade === undefined,
  );
}
