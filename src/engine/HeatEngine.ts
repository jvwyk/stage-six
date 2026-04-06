import type { GameState } from '../data/types';
import { BALANCING } from '../data/balancing';
import type { SeededRandom } from './RandomEngine';

export interface HeatResult {
  newHeat: number;
  heatDelta: number;
  decayed: number;
  added: number;
  events: string[];
}

// Threshold bands in ascending order for band-drop limit enforcement
const HEAT_BANDS = [
  0,
  BALANCING.HEAT_WHISPER_THRESHOLD,     // 26
  BALANCING.HEAT_JOURNALIST_THRESHOLD,  // 46
  BALANCING.HEAT_INQUIRY_THRESHOLD,     // 66
  BALANCING.HEAT_IMMINENT_THRESHOLD,    // 81
  BALANCING.HEAT_ARREST_THRESHOLD,      // 96
];

function getBandIndex(heat: number): number {
  for (let i = HEAT_BANDS.length - 1; i >= 0; i--) {
    if (heat >= HEAT_BANDS[i]) return i;
  }
  return 0;
}

/**
 * Calculate daily heat update.
 * Spec rule: heat cannot drop more than 1 threshold band per day.
 */
export function calculateDailyHeat(
  state: GameState,
  heatAdded: number,
  tookCorruptAction: boolean,
): HeatResult {
  const events: string[] = [];

  // Decay
  let decay = BALANCING.HEAT_DECAY_BASE;
  if (!tookCorruptAction) {
    decay += BALANCING.HEAT_DECAY_CLEAN_BONUS;
    events.push('Clean day — heat cooling faster');
  }

  const added = heatAdded;
  let newHeat = Math.max(0, Math.min(BALANCING.HEAT_MAX, state.heat + added - decay));

  // Enforce band-drop limit: heat cannot drop more than 1 threshold band per day
  if (newHeat < state.heat) {
    const currentBand = getBandIndex(state.heat);
    if (currentBand >= 2) {
      // Minimum heat is the bottom of the band one below current
      const minHeat = HEAT_BANDS[currentBand - 1];
      newHeat = Math.max(newHeat, minHeat);
    }
  }

  // Threshold events
  if (newHeat >= BALANCING.HEAT_JOURNALIST_THRESHOLD && state.heat < BALANCING.HEAT_JOURNALIST_THRESHOLD) {
    events.push('Journalists are sniffing around');
  }
  if (newHeat >= BALANCING.HEAT_INQUIRY_THRESHOLD && state.heat < BALANCING.HEAT_INQUIRY_THRESHOLD) {
    events.push('Parliamentary inquiry launched');
  }
  if (newHeat >= BALANCING.HEAT_IMMINENT_THRESHOLD && state.heat < BALANCING.HEAT_IMMINENT_THRESHOLD) {
    events.push('Arrest is imminent — consider fleeing');
  }

  return {
    newHeat,
    heatDelta: newHeat - state.heat,
    decayed: decay,
    added,
    events,
  };
}

/**
 * Check if arrest happens this day (when heat >= 81).
 */
export function checkArrest(heat: number, random: SeededRandom): boolean {
  if (heat >= BALANCING.HEAT_ARREST_THRESHOLD) {
    return true; // Guaranteed at 96+
  }
  if (heat >= BALANCING.HEAT_IMMINENT_THRESHOLD) {
    return random.chance(BALANCING.HEAT_ARREST_DAILY_CHANCE);
  }
  return false;
}

/**
 * Check if an investigation event fires (when heat >= 66).
 */
export function checkInvestigation(heat: number, random: SeededRandom): boolean {
  if (heat >= BALANCING.HEAT_INQUIRY_THRESHOLD) {
    return random.chance(BALANCING.HEAT_INVESTIGATION_DAILY_CHANCE);
  }
  return false;
}

/**
 * Get the budget penalty rate from the current heat level.
 * Spec: -5% at journalist threshold (46-65), -10% at inquiry threshold (66-80).
 */
export function getHeatBudgetPenalty(heat: number): number {
  if (heat >= BALANCING.HEAT_INQUIRY_THRESHOLD) return BALANCING.HEAT_INQUIRY_BUDGET_PENALTY;
  if (heat >= BALANCING.HEAT_JOURNALIST_THRESHOLD) return BALANCING.HEAT_JOURNALIST_BUDGET_PENALTY;
  return 0;
}

/**
 * Get heat status label for UI display.
 */
export function getHeatStatusLabel(heat: number): string {
  if (heat >= BALANCING.HEAT_ARREST_THRESHOLD) return 'ARRESTED';
  if (heat >= BALANCING.HEAT_IMMINENT_THRESHOLD) return 'ARREST IMMINENT';
  if (heat >= BALANCING.HEAT_INQUIRY_THRESHOLD) return 'PARLIAMENTARY INQUIRY';
  if (heat >= BALANCING.HEAT_JOURNALIST_THRESHOLD) return 'JOURNALISTS SNIFFING';
  if (heat >= BALANCING.HEAT_WHISPER_THRESHOLD) return 'WHISPERS';
  return 'UNDER THE RADAR';
}
