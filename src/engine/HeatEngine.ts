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

/**
 * Calculate daily heat update.
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
  const newHeat = Math.max(0, Math.min(100, state.heat + added - decay));

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
