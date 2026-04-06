# ⚡ STAGE 6 — Complete Game Design Specification

**Version:** 2.0
**Date:** April 6, 2026
**Status:** Implementation-Ready
**Platform:** Web-first, mobile-optimized (PWA)
**Stack:** React 18+, TypeScript, Vite, Zustand, localStorage

---

## 0. Document Map

| Document | Purpose |
|----------|---------|
| `GAME_SPEC.md` (this file) | Complete game design, systems, data, and balancing |
| `IMPLEMENTATION_PLAN.md` | Phased build plan for Claude Code |
| `TECHNICAL_ARCHITECTURE.md` | Code architecture, state management, file structure |
| `prototypes/stage6-v1.jsx` | Initial UI mockup (management sim framing) |
| `prototypes/stage6-v2.jsx` | Final UI mockup (greed-vs-survival loop) |

---

## 1. Game Identity

### 1.1 Elevator Pitch

*"Drug Wars meets SimCity — but you're running South Africa's failing power grid and skimming billions while the lights go out."*

### 1.2 Player Fantasy

You are the newly appointed controller of a fictionalized South African national grid. The country is in crisis. The grid is crumbling. You have 30 days before your temporary appointment ends.

**The public thinks you're here to save them. You're here to get rich.**

Every decision is a trade-off between keeping the grid alive (so you don't get fired) and extracting personal wealth through corrupt deals. Push too hard and journalists catch on. Play too safe and you leave empty-handed.

### 1.3 Core Tension (The Drug Wars Principle)

The game is NOT primarily a management sim. Management is the *constraint*. The core emotion is **greed vs. self-preservation** — identical to Drug Wars where inventory management exists to serve the gambling loop.

The player should constantly feel:
- "One more deal and I can beat my high score"
- "My heat is high but this opportunity is massive"
- "If I just survive 3 more days there's a huge payout coming"

### 1.4 Design Pillars

1. **Greed Loop First** — Every screen should remind the player of their offshore balance and tempt them with more
2. **Risk is Visible** — Heat meter is always visible; consequences are clearly telegraphed
3. **10-Second Decisions** — No decision takes more than 10 seconds to evaluate
4. **Emergent Stories** — The combination of deals, events, and consequences creates unique narratives
5. **Screenshot Bait** — Every end state (arrest, grid collapse, survival) produces inherently shareable content

---

## 2. Core Game Loop

```
┌─────────────────────────────────────────┐
│              START OF DAY               │
│                                         │
│  1. World Update                        │
│     - Plant states resolve              │
│     - Demand recalculated               │
│     - Events trigger                    │
│                                         │
│  2. OPPORTUNITY PHASE (The Drug Wars    │
│     Moment)                             │
│     - 1-3 deals presented               │
│     - Each: reward vs heat cost         │
│     - Player takes, cleans, or skips    │
│                                         │
│  3. GRID MANAGEMENT PHASE               │
│     - Set load shedding stage (0-8)     │
│     - Optional: activate diesel         │
│     - Optional: schedule maintenance    │
│                                         │
│  4. SIMULATION RESOLUTION               │
│     - Supply vs demand calculated       │
│     - Plant failures roll               │
│     - Rage updates                      │
│     - Heat events check                 │
│     - Economy settles                   │
│                                         │
│  5. DAY SUMMARY                         │
│     - What happened                     │
│     - What you earned                   │
│     - Tomorrow's teaser                 │
│     - "One More Day" button             │
│                                         │
│  6. CHECK END CONDITIONS                │
│     → Grid collapse? → GAME OVER        │
│     → Rage maxed? → GAME OVER           │
│     → Heat maxed? → BREAKING NEWS       │
│     → Bankrupt? → GAME OVER             │
│     → Day 30? → FINAL SCORE             │
│                                         │
│  7. ADVANCE DAY → back to 1             │
└─────────────────────────────────────────┘
```

---

## 3. Player State

All values tracked per run and persisted to localStorage.

```typescript
interface PlayerState {
  // Identity
  runId: string;              // UUID for this run
  startedAt: number;          // timestamp
  
  // Progression
  day: number;                // 1-30
  gameOver: boolean;
  gameOverReason: string | null; // 'heat' | 'rage' | 'collapse' | 'bankrupt' | 'survived'
  
  // THE BAG — Personal Wealth (the real score)
  bag: number;                // Rands (personal offshore account)
  bagHistory: number[];       // bag value at end of each day (for charts)
  
  // Heat — Exposure Risk (the Drug Wars "police" mechanic)
  heat: number;               // 0-100
  heatHistory: number[];
  
  // Grid Budget — Operational funds (NOT personal money)
  budget: number;             // Rands available for grid operations
  
  // Public Rage — Systemic pressure
  rage: number;               // 0-100
  rageHistory: number[];
  
  // Grid
  currentStage: number;       // 0-8 load shedding
  stageHistory: number[];
  
  // Corruption log (for the receipt)
  corruptionLog: CorruptionEntry[];
  
  // Decisions log
  decisionsLog: DecisionEntry[];
}

interface CorruptionEntry {
  day: number;
  action: string;
  skimAmount: number;
  heatAdded: number;
  category: string;           // 'tender' | 'markup' | 'diversion' | 'selloff'
}

interface DecisionEntry {
  day: number;
  type: string;
  description: string;
  outcome: string;
}
```

---

## 4. The Bag — Personal Wealth System

### 4.1 Overview

The Bag is the player's offshore account. It is the PRIMARY score metric and the emotional center of the game. It is always visible in the UI header.

### 4.2 Income Sources

| Source | Typical Range | Heat Cost | Frequency |
|--------|-------------|-----------|-----------|
| Tender Kickbacks | R80M–R400M | 8–25 | Every 2-3 days |
| Procurement Markups | R40M–R200M | 5–18 | Every 1-2 days |
| Emergency Fund Diversion | R200M–R800M | 20–35 | Rare (day 15+) |
| Asset Sell-offs | R300M–R600M | 15–30 | Rare |
| "Consulting Fees" | R20M–R80M | 3–8 | Common |

### 4.3 Scaling

Opportunities scale up as days progress:

| Day Range | Avg Opportunity Size | Avg Heat Cost |
|-----------|---------------------|---------------|
| 1–7 | R40M–R120M | 5–12 |
| 8–15 | R100M–R300M | 10–20 |
| 16–22 | R200M–R500M | 15–28 |
| 23–30 | R400M–R800M | 20–35 |

This creates the Drug Wars escalation: the biggest scores are at the end, but your heat is already high.

### 4.4 Loss on Arrest

If heat triggers arrest, the player's bag is SEIZED. Final score reflects this (wealth × 0 if arrested). This makes heat management existential, not just inconvenient.

---

## 5. Heat System — Exposure & Investigation

### 5.1 Overview

Heat replaces the Drug Wars "police encounter" mechanic. Every corrupt action increases heat. At thresholds, bad things happen. At 100%, you're arrested.

### 5.2 Heat Thresholds

| Heat Range | Status | Effects |
|-----------|--------|---------|
| 0–25 | Under the Radar | No effects |
| 26–45 | Whispers | Occasional "rumour" events (flavor only) |
| 46–65 | Journalists Sniffing | Daily Maverick starts investigating. Random events may reveal past deals. -5% budget (legal fees) |
| 66–80 | Parliamentary Inquiry | Hawks involvement. Each day: 15% chance a random past deal is exposed (+rage, +budget cost). Budget penalty -10% |
| 81–95 | Imminent Arrest | Each day: 25% chance of arrest. Player gets "flee" option (ends run, keeps 40% of bag) |
| 96–100 | Arrested | GAME OVER — Breaking News screen. Bag seized. |

### 5.3 Heat Decay

Heat naturally decays, rewarding patience:
- Base decay: -2/day
- Bonus if no corrupt action taken: -3/day (total -5)
- Minimum decay: heat cannot drop more than 1 threshold band per day

### 5.4 Heat Events (Random, tied to thresholds)

When heat > 45, random investigation events can fire:

- **"Whistleblower Leak"** — A past deal is partially revealed. +15 rage, +5 heat.
- **"Financial Audit"** — Budget penalty R200M. Chance to "bribe auditor" for R100M and +8 heat.
- **"Journalist Doorstep"** — Player gets choice: "No comment" (+3 rage) or "Threaten legal action" (+5 heat, -rage).
- **"Parliamentary Question"** — Forces player to skip one opportunity next day (too much scrutiny).

---

## 6. Opportunity System — The Market

### 6.1 Overview

Each day, 1–3 opportunities are presented. These are the "buy low / sell high" moments from Drug Wars. Each opportunity has:

```typescript
interface Opportunity {
  id: string;
  title: string;
  description: string;
  
  // Reward
  skimAmount: number;         // Rands added to The Bag
  
  // Cost
  heatCost: number;           // Heat added
  budgetCost: number;         // Grid budget spent (or 0)
  gridEffect: GridEffect;     // Impact on grid
  rageEffect: number;         // Direct rage change
  
  // Risk
  riskLevel: 'low' | 'med' | 'high' | 'extreme';
  failChance: number;         // 0-1, chance deal goes wrong
  failConsequence: string;    // What happens on fail
  
  // Metadata
  category: OpportunityCategory;
  minDay: number;             // Earliest day this can appear
  weight: number;             // Selection weight
}

type OpportunityCategory = 
  | 'tender'       // Maintenance/procurement contracts
  | 'markup'       // Inflated purchasing
  | 'diversion'    // Redirecting emergency funds
  | 'selloff'      // Selling grid assets
  | 'consulting'   // Ghost consulting fees
  | 'political';   // Political favors for cash

interface GridEffect {
  type: 'capacity_change' | 'reliability_change' | 'plant_repair' | 'plant_damage' | 'none';
  target?: string;            // Plant ID or 'all'
  value: number;
  duration?: number;          // Days
}
```

### 6.2 Player Choices Per Opportunity

Every opportunity presents exactly 3 choices:

1. **Take the Deal** — Get the skim, pay the heat, apply grid effect
2. **Do It Clean** — No skim (R0), no heat, better grid effect (or same cost from budget)
3. **Skip** — No action, no effect, opportunity lost

### 6.3 Opportunity Pool (MVP — 20 opportunities)

#### Tier 1: Common (days 1–30, weight: high)

1. **Diesel Emergency Markup** — Approve diesel at inflated rates. Skim R80M–R180M. Heat +8. Grid: +1,350MW for 2 days.
2. **Spare Parts Overcharge** — Source parts through connected supplier. Skim R40M–R90M. Heat +5. Grid: repairs 1 plant 1 day faster.
3. **Consulting Ghost** — Approve "strategy consulting" invoice. Skim R20M–R60M. Heat +3. Grid: none.
4. **Transport Contract** — Coal transport at 2× rates. Skim R50M–R120M. Heat +6. Grid: +400MW coal output.
5. **Security Tender** — Overpriced perimeter security. Skim R30M–R70M. Heat +4. Grid: none (but prevents 1 sabotage event).

#### Tier 2: Moderate (days 5+, weight: medium)

6. **Coal Shipment Kickback** — Broker coal at 3× market. Skim R80M–R200M. Heat +12. Grid: +600MW restored.
7. **Maintenance Tender** — BEE contractor at 4× rate. Skim R150M–R350M. Heat +18. Grid: plant repaired in 5 days.
8. **Insurance Fraud** — Claim damage that didn't happen. Skim R100M–R250M. Heat +15. Grid: none. 15% fail → exposed, +30 heat.
9. **Grid Extension Bribe** — Municipality pays for priority. Skim R60M–R150M. Heat +10. Grid: 1 region gets +priority.
10. **Fuel Stockpile Sale** — Sell reserve diesel on black market. Skim R70M–R180M. Heat +12. Grid: diesel unavailable for 3 days.

#### Tier 3: High-Value (days 12+, weight: low)

11. **Foreign Grid Access Sale** — Sell export capacity. Skim R300M–R600M. Heat +22. Grid: -500MW permanent.
12. **Emergency Fund Diversion** — Redirect disaster funds. Skim R400M–R800M. Heat +28. Grid: budget -R500M.
13. **Political Protection Deal** — Minister offers cover for cash. Skim R200M–R400M. Heat -10 (!). Grid: none. But rage +15.
14. **Nuclear Contract Skim** — Koeberg maintenance fraud. Skim R250M–R500M. Heat +25. Grid: Koeberg reliability -15%.
15. **IPP Blocking Fee** — Block renewable competition for kickback. Skim R150M–R300M. Heat +20. Grid: no renewable capacity growth.

#### Tier 4: Endgame (days 20+, weight: very low)

16. **The Big One** — R2B emergency infrastructure fund. Skim R600M–R1.2B. Heat +35. Grid: major capacity boost OR nothing (your choice).
17. **International Loan Skim** — World Bank emergency loan. Skim R500M–R900M. Heat +30. Grid: +R2B budget.
18. **Privatization Kickback** — Sell grid assets to connected buyer. Skim R700M–R1.5B. Heat +40. Grid: lose 2 plants permanently.
19. **Election Fund** — Divert to party election campaign. Skim R400M–R800M. Heat +25. Rage -20 (political cover).
20. **Golden Parachute** — Set up your exit. Skim R300M. Heat +15. If game ends within 3 days, bag is protected from seizure.

### 6.4 Opportunity Selection Algorithm

```
Each day:
1. Filter pool by minDay <= currentDay
2. Filter out opportunities taken in last 5 days (no repeats)
3. Weight remaining by: base_weight × day_multiplier × heat_inverse_bonus
   - day_multiplier: later days = higher tier opportunities weighted more
   - heat_inverse_bonus: if heat < 30, slightly more risky deals appear (temptation)
4. Select 1–3 opportunities:
   - Days 1–5: always 1 opportunity
   - Days 6–15: 1–2 opportunities
   - Days 16–30: 2–3 opportunities
5. At least 1 must be low/medium risk (always give the player a "safe" option)
```

---

## 7. World Model — Regions

### 7.1 Region Data

```typescript
interface Region {
  id: string;
  name: string;
  icon: string;
  tier: 1 | 2 | 3 | 4;
  baseDemand: number;         // MW
  currentDemand: number;      // After modifiers
  currentSupply: number;      // Allocated
  priorityWeight: number;     // For auto-allocation
  economicValue: number;      // Revenue per MW delivered
  rageSensitivity: number;    // Rage multiplier when undersupplied
  rage: number;               // 0-100, per-region
}
```

### 7.2 Regions Table

| Region | Tier | Base Demand | Priority | Econ Value | Rage Sensitivity |
|--------|------|------------|----------|------------|-----------------|
| Johannesburg | 1 | 4,200 MW | 1.0 | 1.2 | 1.0 |
| Cape Town | 1 | 3,100 MW | 0.95 | 1.1 | 1.1 |
| Pretoria | 1 | 2,800 MW | 0.90 | 1.0 | 0.9 |
| Durban | 2 | 2,200 MW | 0.75 | 0.9 | 1.3 |
| Ekurhuleni | 2 | 1,800 MW | 0.70 | 1.0 | 0.8 |
| Gqeberha | 3 | 900 MW | 0.50 | 0.7 | 1.2 |
| Polokwane | 3 | 700 MW | 0.45 | 0.6 | 1.0 |
| Bloemfontein | 3 | 600 MW | 0.40 | 0.6 | 0.9 |
| Karoo Grid | 4 | 300 MW | 0.20 | 0.3 | 0.6 |
| Northern Belt | 4 | 250 MW | 0.15 | 0.3 | 0.5 |

**MVP: Use 5 regions** (Johannesburg, Cape Town, Durban, Ekurhuleni, Polokwane)

### 7.3 Demand Model

```
Daily Demand = baseDemand × (1 + dailyVariance + eventModifier + seasonalModifier)

dailyVariance: uniform random ±8%
eventModifier: from active events (-20% to +25%)
seasonalModifier: sin wave peaking at day 15 (±5%)
```

---

## 8. Generation System — Power Plants

### 8.1 Plant Data

```typescript
interface Plant {
  id: string;
  name: string;
  type: PlantType;
  maxCapacity: number;        // MW
  currentOutput: number;      // MW
  reliability: number;        // 0-100, affects failure chance
  status: PlantStatus;
  failureDebt: number;        // Hidden, 0-100, increases failure probability
  maintenanceDaysLeft: number; // 0 = not in maintenance
  daysUntilRepair: number;    // 0 = not broken
  fuelCostPerDay: number;     // Rands (0 for nuclear/renewable)
}

type PlantType = 'coal' | 'nuclear' | 'diesel' | 'renewable' | 'import';
type PlantStatus = 'online' | 'derated' | 'maintenance' | 'forced_outage' | 'standby';
```

### 8.2 Plant Fleet (MVP)

| Plant | Type | Max MW | Reliability | Fuel Cost/Day | Notes |
|-------|------|--------|------------|---------------|-------|
| Medupi | Coal | 4,800 | 55% | R12M | Starts derated at 3,200MW |
| Kusile | Coal | 4,800 | 42% | R14M | Starts derated at 2,100MW |
| Matimba | Coal | 3,990 | 68% | R10M | Most reliable coal |
| Koeberg | Nuclear | 1,860 | 91% | R0 | Very stable, can't be rushed |
| Ankerlig | Diesel | 1,350 | 88% | R45M | Expensive, on-demand |
| Gourikwa | Diesel | 740 | 85% | R25M | Backup diesel |
| Sere Wind | Renewable | 100 | 70% | R0 | Variable (50-100% of capacity) |
| Cahora Bassa | Import | 1,200 | 78% | R8M | Event-sensitive |

**Total Theoretical Max: 18,840 MW**
**Typical Available: 11,000–13,000 MW**
**Total Demand: ~14,000–17,000 MW**

This ensures the player is ALWAYS slightly underpowered — the core tension.

### 8.3 Plant State Machine

```
                ┌───────────┐
         ┌──────│  Online    │◄────────────┐
         │      └─────┬─────┘             │
    fail roll     derate roll         repair complete
         │            │                    │
         ▼            ▼                    │
  ┌──────────┐  ┌──────────┐    ┌─────────────────┐
  │  Forced   │  │ Derated  │    │  Maintenance    │
  │  Outage   │  │ (50-80%) │    │  (offline 2-5d) │
  └──────┬────┘  └─────┬────┘    └────────▲────────┘
         │             │                   │
         └─────────────┴──── player action ┘
```

### 8.4 Failure Debt (Hidden Variable)

Each plant has a hidden `failureDebt` (0–100) that represents deferred maintenance damage.

**Increases:**
- +2/day if plant is online and not maintained in last 10 days
- +5/day if plant is overloaded (output > 90% capacity)
- +3 per corrupt maintenance tender (shoddy work)

**Decreases:**
- -20 for clean maintenance
- -8 for corrupt maintenance (partial fix)

**Effect on failure probability:**
```
dailyFailChance = baseFailChance × (1 + failureDebt / 50)

Example: Plant with 10% base fail, 60 failure debt:
failChance = 0.10 × (1 + 60/50) = 0.10 × 2.2 = 22% per day
```

When failureDebt > 80: **cascade risk** — if this plant fails, adjacent plants have +10% fail chance (grid stress).

---

## 9. Load Shedding System

### 9.1 Stage Table

| Stage | Demand Cut | Description |
|-------|-----------|-------------|
| 0 | 0% | No shedding |
| 1 | 5% | Minor rolling cuts |
| 2 | 10% | Noticeable outages |
| 3 | 15% | Widespread disruption |
| 4 | 20% | Severe — hospitals on backup |
| 5 | 25% | Critical infrastructure strained |
| 6 | 30% | National emergency |
| 7 | 35% | Near-total collapse |
| 8 | 40% | Catastrophic — grid edge |

### 9.2 Auto-Allocation

When the player sets a stage, supply is cut proportionally across regions weighted by inverse priority (low-priority regions shed first):

```
regionCut = totalCut × (1 - region.priorityWeight) / sumOfInversePriorities
```

### 9.3 Stage Effects on Rage

```
dailyRageFromStage = stage × stage × 0.5  (quadratic — high stages are disproportionately punishing)

Stage 2: +2 rage/day (manageable)
Stage 4: +8 rage/day (worrying)
Stage 6: +18 rage/day (critical)
Stage 8: +32 rage/day (game-ending within 2-3 days)
```

---

## 10. Public Rage System

### 10.1 Rage Inputs (Per Day)

```
Rage += stageRage              // Quadratic from stage (see 9.3)
Rage += sum(regionRageDeltas)  // Per-region shortfalls × sensitivity
Rage += eventRage              // From active events
Rage += unpredictabilityPenalty // If stage changed by >2 from yesterday

Rage -= stabilityBonus         // -2 if stage unchanged from yesterday
Rage -= investmentSignal       // -3 if player did clean maintenance today
Rage -= naturalDecay           // -1 base
```

### 10.2 Rage Thresholds

| Range | Level | Effect |
|-------|-------|--------|
| 0–25 | Calm | No effects |
| 26–50 | Grumbling | -5% tariff revenue (people stop paying) |
| 51–70 | Angry | -10% revenue. Random protest events. |
| 71–85 | Furious | -20% revenue. Protests block plant access (-500MW random). |
| 86–95 | Critical | -30% revenue. Political pressure events. Cannot skip load shedding. |
| 96–100 | Revolt | GAME OVER — "The people have had enough." |

### 10.3 Per-Region Rage

Each region tracks its own rage. National rage = weighted average. Some events and consequences are per-region:
- A region at rage > 80 may trigger a protest that blocks a local plant
- Regions remember being deprioritized — rage sensitivity increases if repeatedly shed

---

## 11. Economy System

### 11.1 Budget (Operational Funds)

The budget is NOT the player's money. It's the grid's operational fund.

**Income:**
```
dailyRevenue = sum(region.supplyDelivered × region.economicValue × tariffRate)
tariffRate = R0.15M per MW (modified by rage penalties)
```

**Costs:**
```
dailyFuelCost = sum(plant.fuelCostPerDay) for all online plants
maintenanceCost = R80M–R200M per plant maintenance event
emergencyCost = from events
```

**Starting Budget:** R5,000M (R5B)

### 11.2 Bankruptcy

If budget drops below R0, the player has 3 days to recover before GAME OVER (bankrupt). During this time, diesel plants cannot be activated and no new tenders can be awarded.

---

## 12. Event System

### 12.1 Event Structure

```typescript
interface GameEvent {
  id: string;
  title: string;
  description: string;
  icon: string;
  severity: 'info' | 'warning' | 'critical';
  
  // Trigger conditions
  minDay: number;
  maxDay: number;
  triggerCondition?: (state: GameState) => boolean;
  weight: number;
  
  // Effects
  effects: EventEffect[];
  duration: number;           // Days (0 = instant)
  
  // Player choice (optional)
  choices?: EventChoice[];
}

interface EventEffect {
  type: 'supply' | 'demand' | 'rage' | 'heat' | 'budget' | 'plant_status';
  target?: string;
  value: number;
}

interface EventChoice {
  label: string;
  description: string;
  cost?: number;
  effects: EventEffect[];
}
```

### 12.2 Event Pool (MVP — 25 Events)

#### Supply Events
1. **Boiler Tube Leak** — Random coal plant loses 800MW for 3 days. Choice: rush repair (R220M, 1 day) or standard (3 days).
2. **Conveyor Belt Failure** — Coal supply disrupted. -400MW for 2 days.
3. **Fuel Oil Contamination** — Diesel plants offline for 1 day.
4. **Turbine Vibration** — Random plant derated to 60% for 2 days.
5. **Transformer Explosion** — Plant fully offline for 4 days. +10 rage.
6. **Import Line Trip** — Cahora Bassa offline for 1-2 days.
7. **Ash Dam Overflow** — Environmental shutdown of 1 coal plant for 3 days.

#### Demand Events
8. **Cold Front** — Demand +15% for 3 days (Western Cape).
9. **Heat Wave** — Demand +12% for 2 days (Gauteng).
10. **Major Sporting Event** — Demand +8% for 1 day.
11. **Industrial Surge** — Ekurhuleni demand +20% for 2 days.
12. **Mining Expansion** — Permanent demand +200MW.

#### Social Events
13. **Cable Theft** — -300MW in random region for 2 days.
14. **Substation Sabotage** — -500MW, +15 rage. Choice: increase security (R150M) or ignore.
15. **Protest March** — Region at highest rage blocks access to nearby plant. -1,000MW for 1 day.
16. **Union Strike** — All coal plants -20% output for 3 days.
17. **Social Media Outrage** — +20 rage (viral load shedding video).

#### Political Events
18. **Minister Calls** — Political pressure to reduce stage. If you comply: -5 rage but grid strained. If you refuse: +10 rage.
19. **Election Promise** — Must reduce to Stage 2 or below for 2 days or +25 rage.
20. **Parliamentary Inquiry** — If heat > 50: -R200M legal costs, +5 heat.
21. **International Pressure** — Foreign investors threaten pullout. Must maintain Stage ≤ 3 for 3 days.

#### Heat Events
22. **Whistleblower** — A past corrupt deal is revealed. +15 rage, +8 heat.
23. **Journalist Investigation** — Daily Maverick publishes. Choice: "no comment" (+5 rage) or "legal threat" (+8 heat).
24. **Financial Audit** — Hawks investigate books. -R200M. Choice: bribe auditor (R100M, +10 heat) or cooperate (+5 heat).
25. **Leaked Documents** — Most expensive past deal exposed. +20 rage, +10 heat.

### 12.3 Event Frequency

```
Base: 1 event every 2 days
Day 1–10: 40% chance per day
Day 11–20: 55% chance per day
Day 21–30: 70% chance per day

Multiple events can stack (max 3 active simultaneously)
```

---

## 13. Win / Loss Conditions

### 13.1 Loss Conditions (Checked Daily)

| Condition | Trigger | Screen |
|-----------|---------|--------|
| **Arrested** | Heat ≥ 100 | Breaking News → Corruption Receipt |
| **Grid Collapse** | Total supply < 40% of demand for 2 consecutive days | Blackout Screen |
| **Public Revolt** | Rage ≥ 100 | Revolt Screen |
| **Bankruptcy** | Budget < 0 for 3 consecutive days | Bankruptcy Screen |

### 13.2 Win Condition

Survive all 30 days without triggering any loss condition.

### 13.3 Flee Option

When heat > 80, player can choose to **Flee** — ending the run early but keeping 40% of their bag. This creates a genuine strategic choice: do you cash out or go for the big score?

---

## 14. Scoring System

### 14.1 Final Score Calculation

```
IF arrested:
  score = 0 (bag seized, total failure)

IF fled:
  score = (bag × 0.4) / maxPossibleBag × 100

IF survived OR other game over:
  wealthScore = (bag / maxPossibleBag) × 40        // 40% weight
  stabilityScore = (avgStability) × 40              // 40% weight  
  trustScore = (100 - finalRage) / 100 × 20         // 20% weight
  
  finalScore = wealthScore + stabilityScore + trustScore
```

### 14.2 Player Titles

Titles are assigned based on play style:

| Title | Condition | Share Text |
|-------|-----------|-----------|
| **Grid Savior** | Bag < R100M, avg stage < 2, survived | "Saved the grid. Left empty-handed. Hero complex." |
| **Civil Servant** | Bag < R500M, avg stage < 4, survived | "Kept the lights mostly on. Only minor theft." |
| **Opportunist** | Bag R500M–R2B, survived | "Balanced greed and governance. A true politician." |
| **Tenderpreneur** | Bag R2B–R5B, any outcome | "Billions stolen. The grid? Not your problem." |
| **Minister of Darkness** | Avg stage > 5, any bag | "The nation sat in darkness while you cashed in." |
| **Eskom CEO** | Survived with bag > R3B and avg stage < 3 | "Somehow kept the lights on AND got rich. Suspicious." |
| **Whistleblower's Target** | Arrested via heat | "The Daily Maverick got you. Should've been more careful." |
| **Load Shedding Legend** | Grid collapse | "Total blackout. Your legacy: darkness." |
| **Exile** | Fled the country | "Took the money and ran. Living in Dubai now." |

---

## 15. Viral & Social Mechanics

### 15.1 The Corruption Receipt

The end-of-game "receipt" is designed to be screenshot-friendly:
- Dashed border (looks like a real receipt)
- Itemized list of every corrupt deal
- Total stolen prominently displayed
- Player title as headline
- Day survived / cause of end
- Fixed aspect ratio optimized for Instagram Stories and Twitter

### 15.2 Share Card Format

```
⚡ STAGE 6 — Day {X}/{30}
💰 Stole: R{bag} across {N} deals
🔥 Title: {title}
📰 {endReason}
📊 Score: {score}/100

Think you'd last longer? [link]
```

### 15.3 Daily Challenge Mode

- **7-day run** (shorter, more accessible)
- **Same seed for all players** on a given calendar day
- **Leaderboard** sorted by score
- **Archetypes shown** — players see if others played corrupt or clean
- Updates daily at midnight SAST

### 15.4 Run History

All completed runs stored in localStorage:
```typescript
interface RunHistory {
  runs: CompletedRun[];
}

interface CompletedRun {
  runId: string;
  completedAt: number;
  day: number;
  bag: number;
  score: number;
  title: string;
  endReason: string;
  corruptionLog: CorruptionEntry[];
  isDaily: boolean;
  dailyDate?: string;
}
```

---

## 16. Persistence & Session Management

### 16.1 localStorage Schema

```
stage6_current_run    → JSON: PlayerState (active game)
stage6_run_history    → JSON: RunHistory (all completed runs)  
stage6_settings       → JSON: { soundEnabled, animationsEnabled, haptics }
stage6_daily_seed     → JSON: { date, seed, completed, score }
stage6_stats          → JSON: { totalRuns, bestScore, totalStolen, totalDays, ... }
```

### 16.2 Save/Resume Flow

- Game state saved to `stage6_current_run` after every day resolution
- On app load:
  - If `stage6_current_run` exists → show "Resume" option
  - Player can Resume or Start New (with confirmation if run in progress)
- On game over → move to history, clear current_run

### 16.3 New Game While In Progress

Player can start new game at any time. The in-progress game is:
- Option A: Abandoned (not saved to history, lost)
- Option B: Auto-scored as "Fled" (keeps 40% of bag, saved to history)

We recommend Option B — it's more thematic and preserves data.

---

## 17. UI Structure

### 17.1 Screen Flow

```
App Load
  ├── Has current_run? → Resume Dialog
  │     ├── Resume → Dashboard (current day)
  │     └── New Game → Confirmation → Title Screen
  └── No current_run → Title Screen
  
Title Screen
  ├── New Game (30-day) → Dashboard
  ├── Daily Challenge → Daily Setup → Dashboard
  └── History → Run History Screen

Dashboard (Main Game Screen)
  ├── Opportunity Cards → Deal Modal
  ├── Grid Actions → inline
  ├── Plants → Plant Detail Sheet
  ├── End Day → Day Summary
  └── Menu → Pause Menu (save, quit, settings)

Day Summary
  ├── Continue → Dashboard (next day)
  └── (auto) Game Over check → Game Over Screen

Game Over Screens
  ├── Breaking News (heat arrest) → Corruption Receipt
  ├── Blackout (grid collapse) → Score Screen
  ├── Revolt (rage) → Score Screen
  └── Survived (day 30) → Score Screen

Score Screen
  ├── Share → native share / copy
  ├── Try Again → Title Screen
  └── History → Run History
```

### 17.2 Key UI Elements (Always Visible)

**Sticky Header (Dashboard):**
- Day counter (X/30)
- Budget
- THE BAG (gold, prominent, always visible — the emotional anchor)
- Heat bar + label
- Rage bar + label

**Bottom Action Bar:**
- "End Day X" primary button
- Menu / Score secondary

### 17.3 Responsive Design

- Max-width: 430px (mobile viewport)
- Safe area insets for notched phones
- Touch targets: minimum 44px
- Bottom sheet modals (not center popups) for mobile-native feel
- No horizontal scrolling anywhere
- Snap-to viewport sections for key flows

---

## 18. Balancing Guidelines

### 18.1 Target Session Metrics

| Metric | Target |
|--------|--------|
| Average run length | 18–22 days (most players lose before 30) |
| First run length | 10–15 days (learning curve) |
| Day duration | 30–60 seconds |
| Full run duration | 15–25 minutes |
| Daily challenge duration | 5–10 minutes |
| Win rate | 15–25% (surviving 30 days is hard) |
| Arrest rate | 30–40% (heat is the most common death) |

### 18.2 Difficulty Curve

```
Days 1–5:   Tutorial-ish. Low demand, few events, small opportunities.
Days 6–12:  Ramping. Demand grows, events start, medium deals appear.
Days 13–20: Pressure. Multiple events, high-value deals, heat becomes dangerous.
Days 21–30: Endgame. Maximum chaos. Huge opportunities but lethal heat.
```

### 18.3 The "One More Turn" Hook

At the end of every day summary, show a teaser for tomorrow:
- Next day's biggest opportunity (with skim amount visible)
- Warning about upcoming events
- "If you survive 3 more days, you'll unlock [Big Opportunity]"

This is the core retention mechanic. The player should ALWAYS feel like quitting now would mean missing out.

---

## 19. Audio & Haptics (Future)

### 19.1 Sound Design Direction
- Ambient: low electrical hum, transformer buzz, distant city
- Deal taken: cash register + subtle dark chord
- Heat warning: rising synth tone
- Breaking News: TV news sting
- Game Over: power-down sound (descending tone to silence)

### 19.2 Haptics (Mobile)
- Deal taken: medium impact
- Day end: soft tick
- Game over: heavy buzz
- Stage change: light tap

---

## 20. MVP Scope

### 20.1 Include in MVP

- [ ] Core game loop (30-day run)
- [ ] 5 regions (reduced from 10)
- [ ] 6 plants (reduced from 8)
- [ ] The Bag + Heat + Rage systems
- [ ] 15 opportunities (from 20 pool)
- [ ] 15 events (from 25 pool)
- [ ] Load shedding stages 0–8
- [ ] Corruption Receipt
- [ ] Score + Titles
- [ ] Share card (copy to clipboard)
- [ ] localStorage persistence
- [ ] Save/Resume/New Game flow
- [ ] Run History
- [ ] Responsive mobile-first UI
- [ ] All core screens from prototype

### 20.2 Exclude from MVP (Phase 2+)

- [ ] Daily Challenge mode
- [ ] Leaderboard (requires backend)
- [ ] Sound & haptics
- [ ] PWA / offline support
- [ ] Advanced animations
- [ ] Manual region allocation (keep stage-based only)
- [ ] Plant upgrade system
- [ ] Multiplayer
- [ ] Campaign mode (multiple consecutive 30-day terms)

---

## 21. Expansion Roadmap

### Phase 2: Social
- Daily Challenge with shared seeds
- Leaderboard (Supabase or similar)
- Share to Twitter/WhatsApp with OG image generation

### Phase 3: Depth
- Manual allocation mode (advanced)
- Plant upgrades & long-term investment
- Policy decisions (tariff changes, renewable mandates)
- Sabotage mechanic (player can sabotage to create opportunities)

### Phase 4: Campaign
- Multiple 30-day terms
- Carry-over consequences
- Political system (elections, coalitions)
- Story events with branching narratives

### Phase 5: Multiplayer
- Competitive: same seed, compare scores
- Cooperative: split regions between 2 players
- Adversarial: one player is the grid controller, one is the journalist

---

## END OF GAME SPEC
