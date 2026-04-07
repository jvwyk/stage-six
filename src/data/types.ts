// ── Plant Types ──

export type PlantType = 'coal' | 'nuclear' | 'diesel' | 'renewable' | 'import';
export type PlantStatus = 'online' | 'derated' | 'maintenance' | 'forced_outage' | 'standby' | 'starting';
export type PlantOperatingMode = 'idle' | 'normal' | 'push_hard' | 'run_hot';

export interface PlantDefinition {
  id: string;
  name: string;
  type: PlantType;
  maxCapacity: number;
  startingOutput: number;
  baseReliability: number;
  startingStatus: PlantStatus;
  fuelCostPerDay: number;
  icon: string;
  color: string;
}

export interface PlantState {
  id: string;
  name: string;
  type: PlantType;
  maxCapacity: number;
  currentOutput: number;
  reliability: number;
  status: PlantStatus;
  failureDebt: number;
  maintenanceDaysLeft: number;
  daysUntilRepair: number;
  fuelCostPerDay: number;
  daysSinceLastMaintenance: number;
  operatingMode: PlantOperatingMode;
}

// ── Region Types ──

export interface RegionDefinition {
  id: string;
  name: string;
  icon: string;
  tier: 1 | 2 | 3 | 4;
  baseDemand: number;
  priorityWeight: number;
  economicValue: number;
  rageSensitivity: number;
}

export interface RegionState {
  id: string;
  name: string;
  icon: string;
  tier: 1 | 2 | 3 | 4;
  baseDemand: number;
  currentDemand: number;
  currentSupply: number;
  priorityWeight: number;
  economicValue: number;
  rageSensitivity: number;
  rage: number;
  consecutiveSheddingDays: number;
}

// ── Opportunity Types ──

export type OpportunityCategory =
  | 'tender'
  | 'markup'
  | 'diversion'
  | 'selloff'
  | 'consulting'
  | 'political';

export type RiskLevel = 'low' | 'med' | 'high' | 'extreme';

export interface GridEffect {
  type: 'capacity_change' | 'reliability_change' | 'plant_repair' | 'plant_damage' | 'none';
  target?: string;
  value: number;
  duration?: number;
}

export interface OpportunityDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  tag: string;
  category: OpportunityCategory;
  riskLevel: RiskLevel;
  // Tender system (new)
  baseCost: number;               // Honest cost to grid budget
  maxInflation: number;           // Max markup multiplier (1.0 = no inflation, 2.0 = 100%)
  heatPerInflation: number;       // Heat added per 25% inflation step
  failureDebtPerInflation: number; // Extra failure debt per 25% inflation
  // Legacy fields (kept for backward compat, derived from baseCost)
  skimRange: [number, number];
  heatCost: number;
  budgetCost: number;
  gridEffect: GridEffect;
  gridEffectLabel: string;
  rageEffect: number;
  failChance: number;
  failConsequence: string;
  minDay: number;
  weight: number;
  tier: 1 | 2 | 3 | 4;
  canDelay: boolean;
}

export type TenderAction = 'clean' | 'inflate' | 'delay' | 'skip';

export interface TenderChoice {
  tenderId: string;
  action: TenderAction;
  inflationLevel: number;         // 0 for clean, 0.25/0.50/0.75/1.0 for inflate
}

export interface Opportunity extends OpportunityDefinition {
  skimAmount: number;
  delayCount: number;
  dayAppeared: number;
}

// ── Event Types ──

export type EventSeverity = 'info' | 'warning' | 'critical';

export interface EventEffect {
  type: 'supply' | 'demand' | 'rage' | 'heat' | 'budget' | 'plant_status';
  target?: string;
  value: number;
}

export interface EventChoice {
  label: string;
  description: string;
  effects: EventEffect[];
}

export interface EventDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  severity: EventSeverity;
  category: 'supply' | 'demand' | 'social' | 'political' | 'heat';
  minDay: number;
  maxDay: number;
  triggerCondition?: (state: GameState) => boolean;
  weight: number;
  effects: EventEffect[];
  duration: number;
  choices?: EventChoice[];
}

export interface ActiveEvent {
  event: EventDefinition;
  remainingDays: number;
  choiceMade?: number;
}

// ── Title Types ──

export interface TitleDefinition {
  id: string;
  title: string;
  condition: (state: GameState) => boolean;
  shareText: string;
  priority: number;
}

// ── Corruption & Decision Logs ──

export interface CorruptionEntry {
  day: number;
  action: string;
  skimAmount: number;
  heatAdded: number;
  category: OpportunityCategory;
  inflationLevel: number;
}

export interface DecisionEntry {
  day: number;
  type: string;
  description: string;
  outcome: string;
}

export interface TransactionEntry {
  label: string;
  amount: number;
}

// ── Day Report ──

export interface DayReport {
  day: number;
  skimmed: number;
  avgStage: number;
  heatDelta: number;
  rageDelta: number;
  budgetDelta: number;
  events: string[];
  plantFailures: string[];
  revenue: number;
  costs: number;
  supplyTotal: number;
  demandTotal: number;
  influenceDelta: number;
  diversionIncome: number;
  diversionDetected: boolean;
  tomorrowTeaser?: {
    title: string;
    baseCost: number;
    maxInflationPct: number;
    hint: string;
  };
}

// ── Player Actions ──

export interface PlayerActions {
  tenders: TenderChoice[];
  deals: Array<{
    opportunityId: string;
    choice: 'take' | 'clean' | 'skip';
  }>;
  stageSet: number;
  dieselActivated: string[];
  maintenanceScheduled: string[];
  eventChoices: Array<{
    eventId: string;
    choiceIndex: number;
  }>;
}

// ── End Conditions ──

export type EndReason = 'heat' | 'rage' | 'collapse' | 'bankrupt' | 'survived' | 'fled';

export interface EndCondition {
  reason: EndReason;
  description: string;
}

// ── Game State ──

export type GamePhase =
  | 'opportunities'
  | 'management'
  | 'resolution'
  | 'summary'
  | 'game_over';

export interface GameState {
  runId: string;
  startedAt: number;
  seed: string;
  mode: 'standard' | 'daily';

  day: number;
  phase: GamePhase;
  gameOver: boolean;
  gameOverReason: EndReason | null;

  bag: number;
  bagHistory: number[];

  heat: number;
  heatHistory: number[];

  budget: number;

  rage: number;
  rageHistory: number[];

  currentStage: number;
  stageHistory: number[];

  plants: PlantState[];
  regions: RegionState[];

  activeEvents: ActiveEvent[];
  todaysOpportunities: Opportunity[];
  delayedTenders: Opportunity[];
  recentOpportunityIds: string[];

  corruptionLog: CorruptionEntry[];
  decisionsLog: DecisionEntry[];
  transactionLog: TransactionEntry[];

  dayReport: DayReport | null;

  bankruptcyDays: number;
  consecutiveLowSupplyDays: number;
  demandMetDays: number;

  consecutiveGoodDays: number;
  totalDefection: number;

  // Budget recovery
  tariffIncreases: number;
  tariffMultiplier: number;
  bailoutUsed: boolean;
  emergencyLevyUsed: boolean;

  // Influence spend flags (reset daily)
  deflectedInvestigation: boolean;
  diversionCovered: boolean;

  // Breaking news flash (null when none)
  breakingNews: string | null;

  // Fuel & capacity
  dieselFuelDays: number;
  emergencyImportMW: number;

  // Power diversion
  diversionMW: number;

  // Influence
  influence: number;

  // Hidden corruption mechanics
  auditRisk: number;
  corruptionScore: number;

  playerActions: PlayerActions;
}

// ── Completed Run ──

export interface CompletedRun {
  runId: string;
  completedAt: number;
  day: number;
  bag: number;
  score: number;
  title: string;
  endReason: EndReason;
  corruptionLog: CorruptionEntry[];
  isDaily: boolean;
  dailyDate?: string;
  scoreBreakdown: {
    wealth: number;
    stability: number;
    trust: number;
  };
}

// ── Aggregate Stats ──

export interface AggregateStats {
  totalRuns: number;
  totalDaysPlayed: number;
  totalStolen: number;
  bestScore: number;
  bestBag: number;
  longestSurvival: number;
  arrestCount: number;
  survivalCount: number;
  favoriteTitle: string;
}

// ── Settings ──

export interface Settings {
  soundEnabled: boolean;
  animationsEnabled: boolean;
}

// ── Screen Routing ──

export type Screen =
  | 'title'
  | 'dashboard'
  | 'day_summary'
  | 'game_over'
  | 'breaking_news'
  | 'corruption_receipt'
  | 'plant_detail'
  | 'run_history'
  | 'daily_challenge'
  | 'how_to';
