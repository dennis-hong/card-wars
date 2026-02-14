# Card Wars Refactoring Plan

Date: 2026-02-14

## Executive Summary
The codebase is functional and visually mature, but it has grown into a state-heavy, monolithic architecture. The highest-risk areas are:
- `src/lib/battle-engine.ts` (large combat state machine with mixed concerns)
- `src/components/battle/BattleArena.tsx` (UI + animation orchestration + game logic wiring)
- `src/hooks/useGameState.ts` (all persistence, mutation, reward logic, migration, and orchestration)
- Shared domain duplication across collection/deck/booster/card views.

This plan prioritizes stability and maintainability while preserving behavior.

---

## High Priority

### 1) Split `battle-engine` into explicit battle domains
- **Current issue**: 1,333 lines combines initialization, skill systems, tactic resolution, combat phase, AI, and utility helpers in one file.
- **Priority**: High
- **Effort**: 2–3 days
- **Files**: `src/lib/battle-engine.ts` (split)
- **Proposed structure**:
  - `src/lib/battle/init.ts`: deck validation, `createBattleWarrior`, enemy build, tactic build.
  - `src/lib/battle/skills/passive.ts`: passive and active skills + skill metadata.
  - `src/lib/battle/skills/tactics.ts`: tactic resolution + counters.
  - `src/lib/battle/combat.ts`: turn combat resolver and post-turn state checks.
  - `src/lib/battle/ai.ts`: AI tactic selection + any matching logic.
  - `src/lib/battle/types.ts`: battle-local event/phase helpers and shared constants.
- **Justification**:
  - Easier ownership boundaries and unit-level testing.
  - Reduced risk in combat calculations and better diff visibility.
  - Enables faster gameplay balancing and simulation scripting.

### 2) Introduce bounded domain types for string-based game mechanics
- **Current issue**: mechanics use raw strings in many places (`fieldEvent.effect`, skill labels, statuses), making mismatch bugs possible at compile time.
- **Priority**: High
- **Effort**: 1–2 days
- **Files**:
  - `src/types/game.ts` add narrow unions/enums:
    - `BattleFieldEffect` (기존 effect strings)
    - `StatusEffectType` (기존 status types)
    - `BattleEventType`, `CombatLogType`, `CardCategory`, etc.
  - `src/data/battlefield-events.ts` and `src/lib/battle-engine.ts` to export/use constants from unions.
  - `src/components/battle/BattleArena.tsx` to consume typed values instead of free-form strings.
- **Justification**:
  - Eliminates typo-driven runtime bugs.
  - Improves autocomplete and codemod-safe refactors.

### 3) Replace monolithic `GameStateContext` value with typed slices/hooks
- **Current issue**: `GameStateContext` returns entire hook output and any screen re-renders on every state change (god-object style).
- **Priority**: High
- **Effort**: 2–3 days
- **Files**:
  - `src/context/GameStateContext.tsx`
  - `src/hooks/useGameState.ts`
  - call sites (pages/components)
- **Approach**:
  - Add thin domain hooks/context selectors:
    - `useGameStateCore` (stats/loaded/loading)
    - `useOwnedCards` (collection/enhance)
    - `useDecks` (list/save/activate/delete)
    - `useBattleProgress` (record/booster add/reward)
  - Invalidate only required slices (or split providers) so high-frequency battle UI and lightweight views do not re-render for unrelated updates.
- **Justification**:
  - Improves render performance and limits accidental coupling.
  - Reduces temptation to access unrelated state via context.

### 4) Build a single persistence layer with versioned schema + migration utilities
- **Current issue**: `loadState` stores raw JSON and performs minimal migration; `saveState` writes blindly. Multiple functions assume migrated shape.
- **Priority**: High
- **Effort**: 1–2 days
- **Files**:
  - `src/hooks/useGameState.ts` (extract)
  - `src/lib/storage.ts` (new)
- **What to extract**:
  - `GAME_STATE_VERSION`, schema validators/guards, `migrateState()`.
  - Explicit parse and fallback for all persisted fields, including `activeTitle`, `earnedTitles`, `stats`, and newly added fields like `tactic levels`.
  - Optional checksum/integrity guard.
- **Justification**:
  - Prevents silent runtime breakage from stale/corrupt saves.

### 5) Decompose `BattleArena.tsx` by UI responsibility
- **Current issue**: 1,624 lines mixing board layout, animation scheduling, tactical forecast, result overlay, action reducer, and global visual effects.
- **Priority**: High
- **Effort**: 3–5 days
- **Files**:
  - `src/components/battle/BattleArena.tsx`
  - `src/components/battle/` (new files):
    - `WarriorSlot.tsx` (already logical subcomponent inside file)
    - `BattleLogPanel.tsx`
    - `BattleHeader.tsx`
    - `TacticPanel.tsx`
    - `BattleOverlays.tsx`
    - `BattleActionPresenter.ts` (or reducer-like utility for playback)
- **Justification**:
  - Clarifies responsibilities and enables independent perf work on overlays/animations without touching battle logic.

---

## Medium Priority

### 6) Split `BoosterPackView` into phase-specific components
- **Current issue**: 909 lines with phase state, reveal animation orchestration, card rendering, summary/detail interactions in one file.
- **Priority**: Medium
- **Effort**: 2 days
- **Files**:
  - `src/components/booster/BoosterPackView.tsx`
  - new: `src/components/booster/`:
    - `PackSelectionView.tsx`
    - `PackTearView.tsx`
    - `PackRevealView.tsx`
    - `PackSummaryModal.tsx`
    - `useBoosterFlow.ts` (state machine + reveal sequencing)
- **Benefits**: simpler flow control and easier animation tuning.

### 7) Split deck editor responsibilities
- **Current issue**: 413 lines handle deck validation, lane management, selection UX, and synergy preview in one place.
- **Priority**: Medium
- **Effort**: 1–2 days
- **Files**: `src/components/deck/DeckEditor.tsx`
- **Proposed extraction**:
  - `useDeckDraftState` hook for local mutation/validation.
  - `WarriorLaneGrid`, `TacticSlots`, `OwnedCardList`, `SynergyPreviewPanel`.
- **Benefit**: clearer unit testing for deck rules (3 lanes distinct, full/empty states).

### 8) Centralize duplicated card collection/deck utility logic
- **Current issue**: same counting/sorting/filtering formulas repeated across collection/deck/booster.
- **Priority**: Medium
- **Effort**: 1–2 days
- **Files**:
  - `src/lib/card-utils.ts` (new)
  - `src/components/collection/CardCollection.tsx`
  - `src/components/deck/DeckEditor.tsx`
  - `src/components/booster/BoosterPackView.tsx`
- **Move utilities**:
  - `buildCountsByCardId`
  - `groupOwnedCardsByCardId`
  - `calculateEnhanceFuel`
  - lane/sort helpers
  - faction synergy helper (currently duplicated between deck preview and detail view)

### 9) Create deterministic battle test data + pure action logger
- **Current issue**: many mechanics rely on randomness and mutation; no deterministic harness.
- **Priority**: Medium
- **Effort**: 2 days
- **Files**:
  - `src/lib/rng.ts` (seeded RNG helper)
  - `src/lib/battle/*` for deterministic injections
  - optional `src/lib/battle/__tests__/` (if tests adopted later)
- **Benefit**: reproducible bug analysis for combat edge cases.

### 10) Extract reusable style/animation tokens
- **Current issue**: many motion variant objects and repeated style/utility objects in component render scope.
- **Priority**: Medium
- **Effort**: 1 day
- **Files**:
  - `src/lib/animation-presets.ts`
  - `src/components/battle/BattleArena.tsx`
  - `src/components/booster/BoosterPackView.tsx`
- **Benefits**: reduces render churn and improves visual consistency.

---

## Low Priority

### 11) Harden deck/owner validation functions
- **Priority**: Low
- **Effort**: 1 day
- **Files**:
  - `src/hooks/useGameState.ts`
  - `src/components/deck/DeckEditor.tsx`
- **Work**: move card-ID resolution to single helper and avoid repeated `getCardById` loops.

### 12) Normalize component props and data contracts
- **Priority**: Low
- **Effort**: 0.5–1 day
- **Files**:
  - `src/types/game.ts`
  - `src/components/*`
- **Work**:
  - prefer optional/nullable props with explicit contracts (avoid repeated `null || undefined` conversion)
  - reduce broad unions via interfaces for modal actions/config objects.

### 13) Audit and dedupe duplicated constants
- **Priority**: Low
- **Effort**: 0.5 day
- **Files**:
  - `src/types/game.ts`
  - `src/components/card/Wa***` and `CardCollection`
- **Work**: centralize size class maps and grade/faction display constants.

---

## Specific Type Safety Risk Register

- `BattleFieldEvent.effect` remains broad string in `types/game.ts`; this should become a union to prevent engine/UI drift.
- `status`/`action` names in battle engine and `BattleArena` are not fully coupled by compiler guarantees.
- LocalStorage loading in `useGameState.ts` is runtime-unsafe (`parsed` typed as any-like); add validator/migration.
- `localStorage` filter preset state in `CardCollection` uses `Prompt` + JSON parse; malformed entries can create hard-to-debug runtime states.
- Several domain lookups (`getCardById`, `getWarriorById`) return optional; repeated use without explicit guards relies on UI assumptions.

---

## Specific Component Responsibility Audit (condensed)

- **`BattleArena.tsx`**
  - Too much responsibility: UI rendering + animation timing + battle action interpretation + battle progression state + user interaction handling.
- **`useGameState.ts`**
  - Too much responsibility: loading/saving, deck/card mutations, battle reward logic, title tracking, stats, and migration.
- **`GameStateContext.tsx`**
  - Pure pass-through of big hook object; effectively global dependency injector without boundaries.
- **`BoosterPackView.tsx`**
  - Too much responsibility for phase transitions, timing, visual effects, analytics-ready summary flow, and detail modal wiring.
- **`CardCollection.tsx`**
  - Too much state for filters + presets + sorting + modal + rendering; should split into hooks/components.

---

## Performance Risk Register

- `battle-engine.ts` + `BattleArena.tsx` do repeated full-state clones during a combat resolution (`structuredClone` for each turn/action). This is costly as gameplay grows.
- `BattleArena.tsx` uses many `setTimeout` / `setInterval` timers and DOM measurements every action cycle.
- `TacticPanel`/battle overlays and action playback can trigger frequent re-renders (large derived arrays and floating-state updates).
- `SFX` creates a new `Audio` object on every play call, which increases allocations during combat/booster interaction.
- `GameStateContext` broad context value causes render fan-out across all subscribers on every state mutation.

---

## Suggested Implementation Order

1. High-priority architecture hardening:
   - typed enums + persistence migration + context slice split
2. battle engine and arena decomposition
3. booster/deck/collection utility extraction and component extraction
4. targeted performance cleanup:
   - state cloning, timer handling, audio cache
5. finalize polish and doc migration notes for devs


## Estimated Total Effort

- High: ~7–11 days
- Medium: ~6–9 days
- Low: ~2–3 days
- Total: ~15–23 days (depending on whether tests and migration tooling are included)

