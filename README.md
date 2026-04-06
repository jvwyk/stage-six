# ⚡ STAGE 6 — Project Package

> *Drug Wars meets SimCity — but you're running South Africa's failing power grid and skimming billions.*

---

## 📁 Package Contents

```
stage6-project/
├── docs/
│   ├── GAME_SPEC.md              # Complete game design (start here)
│   ├── TECHNICAL_ARCHITECTURE.md  # Code structure, state, engines
│   └── IMPLEMENTATION_PLAN.md     # Step-by-step build plan for Claude Code
├── prototypes/
│   ├── stage6-v1.jsx             # Initial mockup (management sim framing)
│   └── stage6-v2.jsx             # Final mockup (greed-vs-survival loop)
└── README.md                      # This file
```

## 🎮 Game Summary

- **Role:** Corrupt grid controller in a South Africa–inspired power crisis
- **Goal:** Extract maximum personal wealth before getting caught or the grid collapses
- **Core Loop:** Daily opportunities (take the deal / go clean / skip) → manage grid → survive consequences
- **Key Systems:** The Bag (offshore account), Heat (exposure risk), Rage (public anger), Load Shedding (0–8)
- **Platform:** Mobile-first web game (React + TypeScript + Vite)
- **Persistence:** localStorage for save/resume, run history, stats

## 🚀 Getting Started with Claude Code

Open IMPLEMENTATION_PLAN.md and follow from Session 0. Each session is self-contained with clear deliverables.

```bash
# Quick start
npm create vite@latest stage6 -- --template react-ts
cd stage6 && npm install zustand
```

## 📐 Prototypes

The `.jsx` prototype files are runnable React artifacts. They define the visual design language and can be previewed in Claude.ai artifacts or any React sandbox. They serve as the **pixel-perfect design target** for implementation.

### Key Screens (v2 — final design):
1. **Title** — "You're in charge now" with greed-forward framing
2. **Dashboard** — Offshore account hero, heat/rage meters, opportunity cards
3. **Deal Modal** — Risk/reward bottom sheet with 3 choices
4. **Day Summary** — What you earned, what happened, tomorrow's teaser
5. **Breaking News** — Cinematic arrest sequence (screenshot bait)
6. **Corruption Receipt** — Itemized NPA evidence, score, share card
7. **Daily Challenge** — Shared seed leaderboard (Phase 2)

## 📊 Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State management | Zustand | Lightweight, perfect for single-store game state |
| Persistence | localStorage | Zero backend, instant save/load, sufficient for MVP |
| Styling | Inline + tokens | No CSS framework overhead, type-safe design system |
| Routing | State-based | No React Router needed for linear screen flow |
| Random | Seeded PRNG | Enables daily challenge mode (same seed = same game) |
| Engine | Pure functions | Testable, deterministic, serializable |
