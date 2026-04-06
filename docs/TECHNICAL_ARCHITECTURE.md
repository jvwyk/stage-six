# ⚡ STAGE 6 — Technical Architecture

**Stack:** React 18+ · TypeScript · Vite · Zustand · localStorage
**Target:** Mobile-first PWA (430px max-width, touch-optimized)

---

## 1. Project Structure

```
stage6/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── public/
│   ├── favicon.svg
│   ├── manifest.json          # PWA manifest (Phase 2)
│   └── og-image.png           # Social share image
├── src/
│   ├── main.tsx               # Entry point
│   ├── App.tsx                # Root component, screen router
│   ├── vite-env.d.ts
│   │
│   ├── engine/                # ── GAME ENGINE (pure logic, no React) ──
│   │   ├── GameEngine.ts      # Main engine: orchestrates a full day
│   │   ├── SimulationEngine.ts # Supply/demand resolution
│   │   ├── EventEngine.ts     # Event selection, triggering, resolution
│   │   ├── OpportunityEngine.ts # Deal generation & selection
│   │   ├── RageEngine.ts      # Rage calculation
│   │   ├── HeatEngine.ts      # Heat calculation, threshold checks
│   │   ├── EconomyEngine.ts   # Budget, revenue, costs
│   │   ├── PlantEngine.ts     # Plant state machine, failure rolls
│   │   ├── ScoringEngine.ts   # End-game scoring, title assignment
│   │   └── RandomEngine.ts    # Seeded PRNG for daily challenge
│   │
│   ├── data/                  # ── STATIC GAME DATA ──
│   │   ├── regions.ts         # Region definitions
│   │   ├── plants.ts          # Plant definitions
│   │   ├── opportunities.ts   # Opportunity pool
│   │   ├── events.ts          # Event pool
│   │   ├── titles.ts          # Title definitions & conditions
│   │   └── balancing.ts       # Tuning constants (all magic numbers here)
│   │
│   ├── store/                 # ── STATE MANAGEMENT (Zustand) ──
│   │   ├── gameStore.ts       # Active game state + actions
│   │   ├── historyStore.ts    # Run history + stats
│   │   └── settingsStore.ts   # User preferences
│   │
│   ├── screens/               # ── FULL-PAGE SCREENS ──
│   │   ├── TitleScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── DaySummaryScreen.tsx
│   │   ├── GameOverScreen.tsx
│   │   ├── BreakingNewsScreen.tsx
│   │   ├── CorruptionReceiptScreen.tsx
│   │   ├── PlantDetailScreen.tsx
│   │   ├── RunHistoryScreen.tsx
│   │   └── DailyChallengeScreen.tsx  # Phase 2
│   │
│   ├── components/            # ── SHARED UI COMPONENTS ──
│   │   ├── layout/
│   │   │   ├── TopBar.tsx
│   │   │   ├── BottomBar.tsx
│   │   │   └── BottomSheet.tsx
│   │   ├── game/
│   │   │   ├── BagDisplay.tsx        # The offshore account display
│   │   │   ├── HeatMeter.tsx
│   │   │   ├── RageMeter.tsx
│   │   │   ├── StageSelector.tsx
│   │   │   ├── OpportunityCard.tsx
│   │   │   ├── RegionRow.tsx
│   │   │   ├── PlantCard.tsx
│   │   │   ├── EventAlert.tsx
│   │   │   └── DealModal.tsx
│   │   ├── shared/
│   │   │   ├── MeterBar.tsx
│   │   │   ├── StatusPill.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── SectionHeader.tsx
│   │   │   └── ShareCard.tsx
│   │   └── screens/
│   │       ├── ResumeDialog.tsx
│   │       └── PauseMenu.tsx
│   │
│   ├── hooks/                 # ── CUSTOM HOOKS ──
│   │   ├── useGame.ts         # Main game orchestration hook
│   │   ├── useAnimatedValue.ts
│   │   └── usePersistence.ts  # localStorage sync
│   │
│   ├── utils/                 # ── UTILITIES ──
│   │   ├── format.ts          # formatMW, formatMoney, etc.
│   │   ├── random.ts          # Seeded random helpers
│   │   ├── share.ts           # Share card generation
│   │   └── storage.ts         # localStorage wrapper with versioning
│   │
│   └── styles/                # ── DESIGN SYSTEM ──
│       ├── tokens.ts          # Colors, fonts, spacing constants
│       ├── global.css         # Reset, animations, scrollbar
│       └── animations.ts      # Reusable animation definitions
```

---

## 2. State Management (Zustand)

### 2.1 Game Store

```typescript
// store/gameStore.ts

interface GameStore {
  // ── State ──
  game: GameState | null;        // null = no active game
  phase: GamePhase;              // which part of the day loop we're in
  activeEvents: GameEvent[];     // currently active events
  todaysOpportunities: Opportunity[];
  dayReport: DayReport | null;   // populated after day resolution
  
  // ── Actions ──
  newGame: (mode: 'standard' | 'daily', seed?: string) => void;
  resumeGame: () => void;
  
  // Day lifecycle
  startDay: () => void;          // Generate opportunities, trigger events
  takeDeal: (opportunityId: string) => void;
  cleanDeal: (opportunityId: string) => void;
  skipDeal: (opportunityId: string) => void;
  setStage: (stage: number) => void;
  activateDiesel: (plantId: string) => void;
  scheduleMaintenance: (plantId: string) => void;
  endDay: () => void;            // Resolve simulation, generate report
  
  // Flow control
  continueTomorrow: () => void;  // Advance to next day
  flee: () => void;              // End run, keep 40% bag
  
  // Meta
  abandonRun: () => void;
  saveState: () => void;         // Persist to localStorage
}

type GamePhase = 
  | 'opportunities'    // Viewing/deciding on deals
  | 'management'       // Grid actions
  | 'resolution'       // Day resolving (animation)
  | 'summary'          // Viewing day report
  | 'game_over';       // Terminal state
```

### 2.2 History Store

```typescript
// store/historyStore.ts

interface HistoryStore {
  runs: CompletedRun[];
  stats: AggregateStats;
  
  addRun: (run: CompletedRun) => void;
  clearHistory: () => void;
  getBestRun: () => CompletedRun | null;
  getStats: () => AggregateStats;
}

interface AggregateStats {
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
```

### 2.3 Persistence Layer

```typescript
// utils/storage.ts

const STORAGE_VERSION = 1;

interface StorageSchema {
  version: number;
  currentRun: GameState | null;
  history: CompletedRun[];
  settings: Settings;
  stats: AggregateStats;
}

// Save after every action that modifies game state
// Load on app mount
// Version check for migrations
```

---

## 3. Engine Architecture

### 3.1 Day Resolution Pipeline

The GameEngine orchestrates the full day in a deterministic pipeline:

```typescript
// engine/GameEngine.ts

class GameEngine {
  resolveDay(state: GameState, playerActions: PlayerActions): DayResult {
    // 1. Pre-calculation
    const demand = SimulationEngine.calculateDemand(state);
    
    // 2. Apply player actions
    const postActions = this.applyActions(state, playerActions);
    
    // 3. Plant state resolution
    const plantResults = PlantEngine.resolvePlants(postActions);
    
    // 4. Supply/demand resolution
    const gridResult = SimulationEngine.resolve(plantResults, demand);
    
    // 5. Event resolution (active events tick down, new events may fire)
    const eventResult = EventEngine.resolve(plantResults, gridResult);
    
    // 6. Rage update
    const rageResult = RageEngine.calculate(gridResult, eventResult, state);
    
    // 7. Heat update (decay + any heat events)
    const heatResult = HeatEngine.calculate(state, playerActions);
    
    // 8. Economy update
    const econResult = EconomyEngine.calculate(gridResult, state);
    
    // 9. Check end conditions
    const endCheck = this.checkEndConditions(heatResult, rageResult, gridResult, econResult);
    
    // 10. Build day report
    return this.buildReport(/* all results */);
  }
}
```

### 3.2 Pure Functions

ALL engine code is pure functions (no side effects, no React, no DOM). This enables:
- Easy unit testing
- Deterministic replay (for daily challenge verification)
- State can be serialized/deserialized trivially

### 3.3 Seeded Random

For daily challenges, all randomness uses a seeded PRNG:

```typescript
// engine/RandomEngine.ts

class SeededRandom {
  private seed: number;
  
  constructor(seed: string) {
    this.seed = this.hashString(seed);
  }
  
  next(): number { /* mulberry32 */ }
  range(min: number, max: number): number { /* ... */ }
  chance(probability: number): boolean { /* ... */ }
  pick<T>(array: T[]): T { /* ... */ }
  weightedPick<T>(items: T[], weights: number[]): T { /* ... */ }
}
```

---

## 4. Data Layer

### 4.1 Static Data Pattern

All game data is defined as typed constants:

```typescript
// data/balancing.ts — ALL magic numbers live here

export const BALANCING = {
  // General
  TOTAL_DAYS: 30,
  DAILY_CHALLENGE_DAYS: 7,
  STARTING_BUDGET: 5000,        // millions
  
  // Heat
  HEAT_DECAY_BASE: 2,
  HEAT_DECAY_CLEAN_BONUS: 3,
  HEAT_INVESTIGATION_THRESHOLD: 80,
  HEAT_FLEE_THRESHOLD: 80,
  HEAT_ARREST_THRESHOLD: 100,
  HEAT_INVESTIGATION_DAILY_CHANCE: 0.15,
  HEAT_ARREST_DAILY_CHANCE: 0.25,
  FLEE_BAG_RETENTION: 0.4,
  
  // Rage
  RAGE_STAGE_MULTIPLIER: 0.5,   // stage² × this
  RAGE_STABILITY_BONUS: 2,
  RAGE_INVESTMENT_BONUS: 3,
  RAGE_NATURAL_DECAY: 1,
  RAGE_REVOLT_THRESHOLD: 100,
  
  // Economy
  TARIFF_RATE: 0.15,            // R millions per MW
  BANKRUPTCY_GRACE_DAYS: 3,
  
  // Plants
  FAILURE_DEBT_DAILY_INCREASE: 2,
  FAILURE_DEBT_OVERLOAD_INCREASE: 5,
  FAILURE_DEBT_CORRUPT_INCREASE: 3,
  FAILURE_DEBT_CLEAN_MAINTENANCE_DECREASE: 20,
  FAILURE_DEBT_CORRUPT_MAINTENANCE_DECREASE: 8,
  CASCADE_FAILURE_BONUS: 0.10,
  
  // Events
  EVENT_BASE_CHANCE_EARLY: 0.40,
  EVENT_BASE_CHANCE_MID: 0.55,
  EVENT_BASE_CHANCE_LATE: 0.70,
  MAX_ACTIVE_EVENTS: 3,
  
  // Opportunities
  OPPORTUNITY_REPEAT_COOLDOWN: 5, // days before same opportunity can appear
  MIN_OPPORTUNITIES_PER_DAY: 1,
  
  // Scoring
  WEALTH_WEIGHT: 0.40,
  STABILITY_WEIGHT: 0.40,
  TRUST_WEIGHT: 0.20,
} as const;
```

---

## 5. Screen Routing

Simple state-based routing (no React Router needed):

```typescript
// App.tsx

type Screen = 
  | 'title'
  | 'dashboard'
  | 'day_summary'
  | 'game_over'
  | 'breaking_news'
  | 'corruption_receipt'
  | 'plant_detail'
  | 'run_history'
  | 'daily_challenge';

function App() {
  const [screen, setScreen] = useState<Screen>('title');
  const game = useGameStore(s => s.game);
  
  // Auto-route to resume dialog on mount if game exists
  useEffect(() => {
    if (game) setScreen('dashboard'); // or show resume dialog
  }, []);
  
  return (
    <div style={{ maxWidth: 430, margin: '0 auto' }}>
      {screen === 'title' && <TitleScreen ... />}
      {screen === 'dashboard' && <DashboardScreen ... />}
      {/* etc */}
    </div>
  );
}
```

---

## 6. Styling Strategy

### 6.1 Approach: CSS-in-JS (Inline Styles + CSS Variables)

No external CSS framework. Design tokens as TypeScript constants. Global CSS only for animations and resets.

Rationale: Maximum portability, zero build complexity, tokens are type-safe.

### 6.2 Design Tokens

```typescript
// styles/tokens.ts

export const tokens = {
  color: {
    bg: '#08080a',
    surface: '#101014',
    raised: '#18181e',
    border: '#25252e',
    text: '#e8e5e0',
    muted: '#78756e',
    dim: '#48453e',
    gold: '#d4a843',
    goldBright: '#f0c95c',
    red: '#e63946',
    green: '#2ec47a',
    amber: '#e8943a',
    blue: '#4a8fe7',
    cyan: '#22b8cf',
    purple: '#9d6dea',
  },
  font: {
    display: "'Bebas Neue', sans-serif",
    serif: "'Playfair Display', serif",
    mono: "'JetBrains Mono', monospace",
    body: "'Outfit', sans-serif",
  },
  space: {
    xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24,
  },
  radius: {
    sm: 4, md: 8, lg: 12, xl: 16,
  },
} as const;
```

### 6.3 Animations

Defined as CSS keyframes in `global.css`, referenced in components. Key animations:
- `fadeUp` — staggered card reveals
- `goldPulse` — bag glow
- `stampIn` — BUSTED stamp
- `shake` — breaking news
- `flicker` — lightning bolt
- `slideSheet` — bottom sheet entrance

---

## 7. Performance Considerations

- **No heavy libraries.** React + Zustand + Vite only. Total JS bundle target: <100KB gzipped.
- **Lazy load screens.** Game over / history screens loaded on demand.
- **Minimal re-renders.** Zustand selectors prevent unnecessary component updates.
- **No images.** All visual elements are CSS + emoji. Zero asset loading.
- **Instant save.** localStorage writes are synchronous and near-instant for our data size (~50KB max per run).

---

## 8. Testing Strategy

### 8.1 Engine Tests (Unit)

Every engine module gets comprehensive unit tests:
- `PlantEngine.test.ts` — failure rolls, state transitions, failure debt
- `HeatEngine.test.ts` — decay, threshold checks, arrest probability
- `RageEngine.test.ts` — stage impact, regional calculations
- `EconomyEngine.test.ts` — revenue, costs, bankruptcy
- `ScoringEngine.test.ts` — score calculation, title assignment
- `GameEngine.test.ts` — full day resolution, end conditions

### 8.2 Integration Tests

- Full 30-day run simulation (headless, no UI)
- Daily challenge determinism (same seed = same opportunities)
- Save/resume produces identical state

### 8.3 Manual Testing

- Mobile device testing (iOS Safari, Android Chrome)
- Safe area insets on notched phones
- localStorage limits and error handling
- Share card rendering

---

## 9. localStorage Schema & Migration

```typescript
// utils/storage.ts

const KEYS = {
  VERSION: 'stage6_version',
  CURRENT_RUN: 'stage6_current_run',
  HISTORY: 'stage6_history',
  SETTINGS: 'stage6_settings',
  STATS: 'stage6_stats',
  DAILY: 'stage6_daily',
} as const;

function loadState(): StorageSchema {
  const version = JSON.parse(localStorage.getItem(KEYS.VERSION) || '0');
  
  if (version < CURRENT_VERSION) {
    return migrate(version);
  }
  
  return {
    version,
    currentRun: safeLoad(KEYS.CURRENT_RUN),
    history: safeLoad(KEYS.HISTORY) || [],
    settings: safeLoad(KEYS.SETTINGS) || DEFAULT_SETTINGS,
    stats: safeLoad(KEYS.STATS) || DEFAULT_STATS,
  };
}

function saveCurrentRun(state: GameState) {
  localStorage.setItem(KEYS.CURRENT_RUN, JSON.stringify(state));
}
```

---

## END OF TECHNICAL ARCHITECTURE
