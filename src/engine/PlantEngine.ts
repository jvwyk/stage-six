import type { PlantState, PlantOperatingMode } from '../data/types';
import { BALANCING } from '../data/balancing';
import type { SeededRandom } from './RandomEngine';

/**
 * Roll failure checks for all plants. Returns updated plant array.
 */
export function rollFailures(plants: PlantState[], random: SeededRandom): PlantState[] {
  let anyFailed = false;

  const results = plants.map((plant) => {
    if (plant.status === 'maintenance' || plant.status === 'forced_outage' || plant.status === 'standby' || plant.status === 'starting') {
      return plant;
    }

    const baseFailChance = (100 - plant.reliability) / 100;
    const adjustedFailChance = baseFailChance * (1 + plant.failureDebt / BALANCING.PLANT_FAILURE_DEBT_DIVISOR);
    const clampedChance = Math.min(adjustedFailChance, BALANCING.PLANT_FAILURE_MAX_CHANCE);

    if (random.chance(clampedChance)) {
      // Determine if full outage or derate
      if (random.chance(BALANCING.PLANT_FAILURE_OUTAGE_CHANCE)) {
        // Full forced outage
        anyFailed = true;
        return {
          ...plant,
          status: 'forced_outage' as const,
          currentOutput: 0,
          daysUntilRepair: random.range(
            BALANCING.REPAIR_DURATION_MIN,
            BALANCING.REPAIR_DURATION_MAX,
          ),
        };
      } else {
        // Derate
        const derateFactor = random.floatRange(
          BALANCING.DERATE_OUTPUT_MIN,
          BALANCING.DERATE_OUTPUT_MAX,
        );
        return {
          ...plant,
          status: 'derated' as const,
          currentOutput: Math.round(plant.maxCapacity * derateFactor),
        };
      }
    }

    return plant;
  });

  // Cascade failure check
  if (anyFailed) {
    return results.map((plant) => {
      if (plant.status === 'online' || plant.status === 'derated') {
        if (plant.failureDebt > BALANCING.PLANT_CASCADE_DEBT_THRESHOLD && random.chance(BALANCING.CASCADE_FAILURE_BONUS)) {
          return {
            ...plant,
            status: 'forced_outage' as const,
            currentOutput: 0,
            daysUntilRepair: random.range(
              BALANCING.REPAIR_DURATION_MIN,
              BALANCING.REPAIR_DURATION_MAX,
            ),
          };
        }
      }
      return plant;
    });
  }

  return results;
}

/**
 * Tick repair/maintenance countdowns. Plants that finish repair go online.
 */
export function tickPlantTimers(plants: PlantState[]): PlantState[] {
  return plants.map((plant) => {
    if (plant.status === 'forced_outage' && plant.daysUntilRepair > 0) {
      const remaining = plant.daysUntilRepair - 1;
      if (remaining <= 0) {
        return {
          ...plant,
          status: 'online' as const,
          currentOutput: plant.maxCapacity,
          daysUntilRepair: 0,
        };
      }
      return { ...plant, daysUntilRepair: remaining };
    }

    // Cold start: diesel plants starting up come online after countdown
    if (plant.status === 'starting' && plant.daysUntilRepair > 0) {
      const remaining = plant.daysUntilRepair - 1;
      if (remaining <= 0) {
        return {
          ...plant,
          status: 'online' as const,
          currentOutput: plant.maxCapacity,
          daysUntilRepair: 0,
        };
      }
      return { ...plant, daysUntilRepair: remaining };
    }

    if (plant.status === 'maintenance' && plant.maintenanceDaysLeft > 0) {
      const remaining = plant.maintenanceDaysLeft - 1;
      if (remaining <= 0) {
        return {
          ...plant,
          status: 'online' as const,
          currentOutput: plant.maxCapacity,
          maintenanceDaysLeft: 0,
          daysSinceLastMaintenance: 0,
        };
      }
      return { ...plant, maintenanceDaysLeft: remaining };
    }

    return plant;
  });
}

/**
 * Apply maintenance to a plant. Takes it offline for scheduled repair.
 */
export function applyMaintenance(plant: PlantState, corrupt: boolean, random: SeededRandom): PlantState {
  const duration = random.range(BALANCING.MAINTENANCE_DURATION_MIN, BALANCING.MAINTENANCE_DURATION_MAX);
  const debtReduction = corrupt
    ? BALANCING.FAILURE_DEBT_CORRUPT_MAINTENANCE_DECREASE
    : BALANCING.FAILURE_DEBT_CLEAN_MAINTENANCE_DECREASE;

  return {
    ...plant,
    status: 'maintenance',
    currentOutput: 0,
    maintenanceDaysLeft: duration,
    failureDebt: Math.max(0, plant.failureDebt - debtReduction),
  };
}

/**
 * Tick failure debt for all plants (daily increase from wear).
 */
export function tickFailureDebt(plants: PlantState[]): PlantState[] {
  return plants.map((plant) => {
    if (plant.status !== 'online' && plant.status !== 'derated') {
      return plant;
    }

    let debtIncrease = 0;

    // Get operating mode multiplier
    const modeMult = getModeDebtMultiplier(plant.operatingMode);

    // Daily wear if not recently maintained
    if (plant.daysSinceLastMaintenance >= BALANCING.DAYS_WITHOUT_MAINTENANCE_THRESHOLD) {
      debtIncrease += BALANCING.FAILURE_DEBT_DAILY_INCREASE;
    }

    // Overload penalty (when actual output exceeds safe capacity threshold)
    const outputRatio = plant.maxCapacity > 0 ? plant.currentOutput / plant.maxCapacity : 0;
    if (outputRatio > BALANCING.PLANT_OVERLOAD_THRESHOLD) {
      debtIncrease += BALANCING.FAILURE_DEBT_OVERLOAD_INCREASE;
    }

    // Apply mode multiplier to all debt accumulation
    debtIncrease = Math.round(debtIncrease * modeMult);

    // Always increment maintenance counter (reset happens in tickPlantTimers on maintenance completion)
    const newDaysSince = plant.daysSinceLastMaintenance + 1;

    return {
      ...plant,
      failureDebt: Math.min(BALANCING.PLANT_FAILURE_DEBT_MAX, plant.failureDebt + debtIncrease),
      daysSinceLastMaintenance: newDaysSince,
    };
  });
}

/**
 * Activate a diesel plant (bring from standby to online).
 */
export function activateDiesel(plant: PlantState): PlantState {
  if (plant.type !== 'diesel' || plant.status !== 'standby') return plant;
  return {
    ...plant,
    status: 'starting',
    currentOutput: 0,
    daysUntilRepair: BALANCING.DIESEL_COLD_START_DAYS,
  };
}

/**
 * Get mode output multiplier.
 */
export function getModeOutputMultiplier(mode: PlantOperatingMode): number {
  switch (mode) {
    case 'idle': return BALANCING.PLANT_MODE_IDLE_OUTPUT;
    case 'push_hard': return BALANCING.PLANT_MODE_PUSH_OUTPUT;
    case 'run_hot': return BALANCING.PLANT_MODE_HOT_OUTPUT;
    default: return BALANCING.PLANT_MODE_NORMAL_OUTPUT;
  }
}

/**
 * Get mode fuel cost multiplier.
 */
export function getModeFuelMultiplier(mode: PlantOperatingMode): number {
  switch (mode) {
    case 'idle': return BALANCING.PLANT_MODE_IDLE_FUEL;
    case 'push_hard': return BALANCING.PLANT_MODE_PUSH_FUEL;
    case 'run_hot': return BALANCING.PLANT_MODE_HOT_FUEL;
    default: return BALANCING.PLANT_MODE_NORMAL_FUEL;
  }
}

/**
 * Get mode failure debt multiplier.
 */
export function getModeDebtMultiplier(mode: PlantOperatingMode): number {
  switch (mode) {
    case 'idle': return BALANCING.PLANT_MODE_IDLE_DEBT_MULT;
    case 'push_hard': return BALANCING.PLANT_MODE_PUSH_DEBT_MULT;
    case 'run_hot': return BALANCING.PLANT_MODE_HOT_DEBT_MULT;
    default: return BALANCING.PLANT_MODE_NORMAL_DEBT_MULT;
  }
}

/**
 * Get effective output for a plant based on its status and operating mode.
 */
export function getPlantEffectiveOutput(plant: PlantState): number {
  if (plant.status !== 'online' && plant.status !== 'derated') return 0;
  const modeMultiplier = getModeOutputMultiplier(plant.operatingMode);
  return Math.round(plant.maxCapacity * modeMultiplier * (plant.status === 'derated' ? plant.currentOutput / plant.maxCapacity : 1));
}

/**
 * Get total available capacity from all online/derated plants (mode-aware).
 */
export function getAvailableCapacity(plants: PlantState[]): number {
  return plants.reduce((total, plant) => {
    return total + getPlantEffectiveOutput(plant);
  }, 0);
}

/**
 * Get plant names that had failures this tick (for reporting).
 */
export function getFailedPlantNames(before: PlantState[], after: PlantState[]): string[] {
  const failures: string[] = [];
  for (let i = 0; i < before.length; i++) {
    const was = before[i].status;
    const now = after[i].status;
    if ((was === 'online' || was === 'derated') && now === 'forced_outage') {
      failures.push(after[i].name);
    }
  }
  return failures;
}
