# ⚡ STAGE 6 — Implementation Plan (Claude Code)

**Estimated Total Effort:** 8–12 focused sessions
**Approach:** Vertical slices — each phase produces a playable build

---

## Pre-Flight: Project Bootstrap

### Session 0: Scaffold (15 min)

```bash
# Create project
npm create vite@latest stage6 -- --template react-ts
cd stage6

# Install dependencies
npm install zustand
npm install -D @types/node

# Clean boilerplate
rm src/App.css src/index.css src/assets/*
```

**Create base file structure:**
```
src/
  engine/
  data/
  store/
  screens/
  components/
    layout/
    game/
    shared/
  hooks/
  utils/
  styles/
```

**Set up:**
- `styles/tokens.ts` — design tokens from prototype
- `styles/global.css` — reset, animations, fonts
- `vite.config.ts` — base config
- `index.html` — viewport meta, font links, PWA meta tags

**Deliverable:** Empty app renders with correct fonts and dark background.

---

## Phase 1: Data & Engine Core

### Session 1: Static Data (30 min)

**Files to create:**
- `data/regions.ts` — 5 region definitions with all properties
- `data/plants.ts` — 6 plant definitions with all properties
- `data/opportunities.ts` — 15 opportunity definitions (tiers 1–3)
- `data/events.ts` — 15 event definitions with effects and choices
- `data/titles.ts` — 9 title definitions with conditions
- `data/balancing.ts` — all tuning constants centralized

**Approach:** Type-first. Define all TypeScript interfaces in a `types.ts` file, then populate data files. Every magic number goes in `balancing.ts`.

**Deliverable:** All game data importable and type-safe. No runtime code yet.

### Session 2: Core Engine — Random, Plants, Simulation (45 min)

**Files to create:**
- `engine/RandomEngine.ts` — Seeded PRNG (mulberry32). Methods: `next()`, `range()`, `chance()`, `pick()`, `weightedPick()`, `shuffle()`.
- `engine/PlantEngine.ts`:
  - `rollFailures(plants, random)` → updated plant array with new statuses
  - `applyMaintenance(plant)` → plant with reduced failure debt
  - `tickFailureDebt(plants)` → plants with increased debt
  - `getAvailableCapacity(plants)` → total MW available
- `engine/SimulationEngine.ts`:
  - `calculateDemand(regions, day, random, activeEvents)` → demand per region
  - `allocateSupply(totalSupply, regions, stage)` → supply per region
  - `calculateDeficit(supply, demand)` → deficit object

**Testing:** Write inline smoke tests or a simple test file. Verify:
- Seeded random produces identical sequences
- Plant failure rolls are within expected bounds
- Supply allocation respects priority weights

**Deliverable:** Core simulation runs headless. Can calculate a day's supply vs demand.

### Session 3: Rage, Heat, Economy, Scoring Engines (45 min)

**Files to create:**
- `engine/RageEngine.ts`:
  - `calculateDailyRage(state, gridResult, events)` → { newRage, perRegionRage, rageEvents }
  - `checkRageThreshold(rage)` → threshold effects
- `engine/HeatEngine.ts`:
  - `calculateDailyHeat(state, playerActions)` → { newHeat, decayed, added }
  - `rollHeatEvents(heat, random)` → heat events that fire
  - `checkArrest(heat, random)` → boolean
  - `checkInvestigation(heat, random)` → investigation event or null
- `engine/EconomyEngine.ts`:
  - `calculateRevenue(regions, rage)` → daily revenue
  - `calculateCosts(plants, actions)` → daily costs
  - `updateBudget(budget, revenue, costs)` → new budget
  - `checkBankruptcy(budget, graceDays)` → boolean
- `engine/ScoringEngine.ts`:
  - `calculateFinalScore(state)` → { score, breakdown }
  - `assignTitle(state)` → title object
  - `generateShareText(state, title, score)` → string

**Deliverable:** All engines complete. Can simulate a full day resolution headless.

### Session 4: Opportunity Engine, Event Engine, Game Engine (45 min)

**Files to create:**
- `engine/OpportunityEngine.ts`:
  - `generateOpportunities(day, recentlyUsed, heat, random)` → Opportunity[]
  - `applyDeal(state, opportunity, choice)` → updated state
- `engine/EventEngine.ts`:
  - `rollNewEvents(state, random)` → new events
  - `tickActiveEvents(activeEvents)` → updated events (duration -1, remove expired)
  - `applyEventEffects(state, events)` → updated state
- `engine/GameEngine.ts`:
  - `resolveDay(state, playerActions)` → DayResult
  - `checkEndConditions(state)` → EndCondition | null
  - `buildDayReport(state, results)` → DayReport

**Testing:** Run a complete 30-day simulation headless. Log day-by-day state. Verify:
- Games last roughly 18–22 days on average (run 100 random sims)
- Heat arrest is most common death at ~35%
- Surviving 30 days happens ~20% of the time

**Deliverable:** Complete game engine. Can simulate full games without UI.

---

## Phase 2: State Management & Persistence

### Session 5: Zustand Stores & localStorage (30 min)

**Files to create:**
- `utils/storage.ts`:
  - `loadState()` → StorageSchema
  - `saveCurrentRun(state)` — called after every day
  - `saveHistory(run)` — called on game end
  - `clearCurrentRun()`
  - `loadHistory()` → CompletedRun[]
  - `loadSettings()` → Settings
  - Version checking and migration scaffold

- `store/gameStore.ts`:
  - Zustand store wrapping GameEngine
  - Actions: `newGame`, `resumeGame`, `takeDeal`, `cleanDeal`, `skipDeal`, `setStage`, `activateDiesel`, `scheduleMaintenance`, `endDay`, `continueTomorrow`, `flee`, `abandonRun`
  - Auto-save after every state change via Zustand middleware

- `store/historyStore.ts`:
  - Zustand store for run history and aggregate stats
  - Loaded from localStorage on mount
  - Auto-save on mutation

- `store/settingsStore.ts`:
  - Minimal: `{ soundEnabled, animationsEnabled }`

**Deliverable:** Full game state management. Can start a game, make decisions, advance days, and persist/resume — all without UI.

---

## Phase 3: UI Shell & Core Screens

### Session 6: Shared Components & Layout (45 min)

**Files to create (from prototype patterns):**
- `components/shared/MeterBar.tsx`
- `components/shared/StatusPill.tsx`
- `components/shared/Card.tsx`
- `components/shared/Button.tsx`
- `components/shared/SectionHeader.tsx`
- `components/layout/TopBar.tsx` — Day, budget, Bag display, heat, rage
- `components/layout/BottomBar.tsx` — End Day button, menu
- `components/layout/BottomSheet.tsx` — Reusable bottom sheet modal

**Approach:** Extract directly from the v2 prototype. These are already production-quality. Convert inline styles to use tokens.

**Deliverable:** Component library renders correctly. Storybook-style test page showing all components.

### Session 7: Title Screen & Dashboard (60 min)

**Files to create:**
- `screens/TitleScreen.tsx`:
  - New Game button → starts game, navigates to dashboard
  - Resume button (shown if `currentRun` exists in localStorage)
  - History button
  - Daily Challenge button (disabled for MVP, shows "Coming Soon")

- `screens/DashboardScreen.tsx`:
  - TopBar with Bag, Heat, Rage (from store)
  - Supply vs Demand summary card
  - Stage selector (0–8) — updates store
  - Opportunity cards (from store's `todaysOpportunities`)
  - Region list (from store's regions)
  - Plant fleet mini-view
  - Grid action buttons (diesel, maintenance)
  - Bottom bar with End Day button

- `components/game/BagDisplay.tsx` — Gold-glow offshore account
- `components/game/HeatMeter.tsx` — With threshold labels
- `components/game/RageMeter.tsx`
- `components/game/StageSelector.tsx` — 0–8 button row
- `components/game/OpportunityCard.tsx` — Risk/reward card
- `components/game/RegionRow.tsx` — Region with supply bar and rage

**Integration:** Wire up to gameStore. Opportunities render from engine output. Stage selector updates store. Real data flows.

**Deliverable:** Can start a game and see the dashboard with live data.

### Session 8: Deal Modal & Day Flow (45 min)

**Files to create:**
- `components/game/DealModal.tsx`:
  - Bottom sheet showing opportunity detail
  - Your Cut (gold), Heat Added (amber), Grid Effect
  - Three buttons: Take Deal, Clean, Skip
  - Heat warning when approaching threshold
  - Wired to `gameStore.takeDeal()` / `cleanDeal()` / `skipDeal()`

- `screens/DaySummaryScreen.tsx`:
  - Metrics: skimmed, avg stage, heat delta, rage delta
  - "What Happened" narrative events
  - Tomorrow's opportunity teaser (the "one more turn" hook)
  - "Continue to Day X" button → advances day

- Screen flow: Dashboard → (take deals) → End Day → Day Summary → Continue → Dashboard

**Deliverable:** Complete day loop is playable. Can take deals, end day, see summary, advance.

### Session 9: Game Over Screens (45 min)

**Files to create:**
- `screens/BreakingNewsScreen.tsx`:
  - Phased cinematic reveal (red flash → banner → headline → BUSTED stamp)
  - Uses CSS animation timing
  - "View Corruption Receipt" button

- `screens/CorruptionReceiptScreen.tsx`:
  - Dashed-border receipt from corruptionLog
  - Itemized deals with day, offence, skim, heat
  - Total stolen
  - Score breakdown
  - Share card with copy-to-clipboard
  - "What you missed" teaser
  - Try Again / Back to Title

- `screens/GameOverScreen.tsx`:
  - Generic game over for rage/collapse/bankrupt/survive
  - Title assignment and display
  - Score breakdown
  - Share card
  - Handles all non-arrest game overs

- `utils/share.ts`:
  - `generateShareText(run)` → formatted string
  - `copyToClipboard(text)` → copies + shows toast
  - Future: `generateOGImage(run)` for rich sharing

**Deliverable:** All game endings are fully rendered. Arrest → Breaking News → Receipt flow is cinematic.

---

## Phase 4: Polish & Secondary Screens

### Session 10: Plant Detail & Run History (30 min)

**Files to create:**
- `screens/PlantDetailScreen.tsx`:
  - Full plant fleet view
  - Per-plant: output bar, reliability, failure debt (hidden label), status
  - Maintenance scheduling button
  - Fleet summary (online/derated/outage counts)

- `screens/RunHistoryScreen.tsx`:
  - List of completed runs from historyStore
  - Each: date, day reached, title, score, bag
  - Tap to see corruption receipt
  - Aggregate stats at top (total runs, best score, total stolen)
  - Clear history option

- `components/screens/ResumeDialog.tsx`:
  - Shown on app load if currentRun exists
  - "Resume Day X" vs "New Game" (with abandon confirmation)

- `components/screens/PauseMenu.tsx`:
  - Save & Quit (saves and returns to title)
  - Flee the Country (if heat > 80)
  - Settings (sound, animations toggle)
  - Abandon Run (with confirmation)

**Deliverable:** All screens implemented. Full game flow from start to finish to history.

### Session 11: Event System UI & Alerts (30 min)

**Files to create:**
- `components/game/EventAlert.tsx`:
  - In-dashboard alert cards for active events
  - Severity-colored (info/warning/critical)
  - Tap to expand with choices if applicable

- Event choice modals:
  - Integrated into DealModal pattern (bottom sheet)
  - Show event description, choices with costs/effects
  - Wire to event resolution in gameStore

- Heat event integration:
  - Whistleblower / journalist / audit events
  - Show inline in dashboard with appropriate urgency

**Deliverable:** Events appear, render, and resolve through player interaction.

### Session 12: Animations, Transitions & Final Polish (45 min)

**Tasks:**
- Staggered card entrance animations (fadeUp with delays)
- Bag value count-up animation on skim
- Heat bar glow at high values
- Screen transitions (cross-fade or slide)
- Stage selector feedback (color shift, haptic future-proofing)
- Breaking News phased reveal timing polish
- BUSTED stamp physics
- Skeleton loading states during day resolution
- Touch feedback on all interactive elements
- Safe area inset testing
- Final responsive pass (320px – 430px)
- Empty states (no events, no opportunities)
- Error boundaries for localStorage failures

**Deliverable:** Production-quality visual polish. Game feels finished.

---

## Phase 5: Testing & Balancing

### Session 13: Balancing Pass (30 min)

**Tasks:**
- Run 500 automated simulations headless
- Analyze distribution: avg survival days, arrest rate, max bag
- Tune `balancing.ts` constants to hit targets:
  - Avg run: 18–22 days
  - Arrest rate: 30–40%
  - Survival rate: 15–25%
  - First run: 10–15 days
- Ensure day 1–5 feels tutorial-ish (few events, small deals)
- Ensure day 20+ feels chaotic (multiple events, huge deals)
- Verify no degenerate strategies (e.g., never taking deals shouldn't be optimal)
- Ensure "just taking every deal" fails by ~day 15

### Session 14: Manual QA (30 min)

**Checklist:**
- [ ] New game → play 30 days → survive → score → history
- [ ] New game → get arrested → Breaking News → Receipt → Share
- [ ] New game → grid collapse → game over
- [ ] New game → rage revolt → game over
- [ ] New game → bankruptcy → game over
- [ ] Save mid-game → close browser → reopen → resume
- [ ] Resume → abandon → start new
- [ ] Resume → flee → keeps 40% bag
- [ ] Run history shows all completed runs
- [ ] Share card copies correct text
- [ ] Works on iOS Safari (375px width)
- [ ] Works on Android Chrome (360px width)
- [ ] Works on desktop (constrained to 430px)
- [ ] No horizontal scroll anywhere
- [ ] All touch targets ≥ 44px
- [ ] localStorage quota handling (graceful error)

---

## Phase Summary

| Phase | Sessions | Focus | Deliverable |
|-------|----------|-------|-------------|
| 0 | 1 | Scaffold | Empty app with design system |
| 1 | 4 | Engine | Complete game engine (headless) |
| 2 | 1 | State | Zustand + localStorage persistence |
| 3 | 4 | UI Core | All main screens, playable game |
| 4 | 3 | Polish | Secondary screens, animations, events |
| 5 | 2 | QA | Balancing, testing, mobile QA |
| **Total** | **15** | | **Shippable MVP** |

---

## Claude Code Session Tips

### Starting Each Session

```
Read the relevant docs:
- GAME_SPEC.md for game design questions
- TECHNICAL_ARCHITECTURE.md for code structure
- This file for what to build next

Start each session with:
"We're building Stage 6. I'm on Session [X]: [name]. 
Here's the current state: [what's done].
Let's build: [what's next]."
```

### Key Principles for Claude Code

1. **Type-first.** Define interfaces before implementing.
2. **Engine is pure.** No React, no DOM, no side effects in `engine/`.
3. **All magic numbers in `balancing.ts`.** Never hardcode in engine code.
4. **Prototype is the design spec.** The `.jsx` files ARE the visual target.
5. **Save early, save often.** Every gameStore action triggers a localStorage save.
6. **Mobile-first always.** Test at 375px width. Touch targets 44px minimum.

### File Naming Conventions

- Engine modules: `PascalCase.ts` (e.g., `PlantEngine.ts`)
- React components: `PascalCase.tsx` (e.g., `DealModal.tsx`)
- Data files: `camelCase.ts` (e.g., `balancing.ts`)
- Utils: `camelCase.ts` (e.g., `storage.ts`)
- Stores: `camelCase.ts` (e.g., `gameStore.ts`)

---

## Deployment (Post-MVP)

```bash
# Build
npm run build

# Deploy to Vercel (recommended for simplicity)
npx vercel

# Or Cloudflare Pages
npx wrangler pages deploy dist

# Or Netlify
npx netlify deploy --prod --dir dist
```

No backend required for MVP. Everything runs client-side with localStorage.

---

## END OF IMPLEMENTATION PLAN
