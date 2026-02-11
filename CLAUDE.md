# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server**: `npm run dev` (Next.js on port 3000)
- **Build**: `npm run build`
- **Lint**: `npm run lint` (ESLint with Next.js + TypeScript rules)
- No test framework is configured.

## Architecture

This is a **client-side-only card battle game** ("삼국무장전: 카드워즈") built with Next.js 16 App Router, React 19, TypeScript (strict), and Tailwind CSS v4. There is no backend, no API routes, and no database — all state persists to `localStorage` under key `cardwars_save`.

### Core Layers

| Layer | Location | Purpose |
|-------|----------|---------|
| UI | `src/components/` | Screen-specific React components (battle, deck editor, collection, booster) |
| Page Controller | `src/app/page.tsx` | Single-page app with screen-based routing via state |
| State | `src/hooks/useGameState.ts` | Central game state hook, auto-persists to localStorage |
| Business Logic | `src/lib/` | Battle engine, gacha system, sound, utilities |
| Game Content | `src/data/` | Card definitions (20 warriors + 8 tactics), titles, battlefield events |
| Types | `src/types/game.ts` | Complete type system for the entire game domain |
| Assets | `public/images/`, `public/sfx/` | AI-generated warrior portraits, sound effects |

### Key Modules

- **`src/lib/battle-engine.ts`** (~1240 lines): The most complex module. Handles 3v3 lane-based combat with turn phases (tactic → combat → result), faction synergies, skill activation, status effects, AI decision-making, and combat logging.
- **`src/hooks/useGameState.ts`**: Manages all persistent state (owned cards, decks, currency, battle stats, titles). Uses immutable updates with `setState(prev => ({...prev, ...}))` and auto-saves after every change.
- **`src/data/cards.ts`**: Card database with 20 Three Kingdoms warriors (4 factions: 위/촉/오/군벌) and 8 tactic cards. Each warrior has grades (1-4★), stats (attack/command/intel/defense), and skills.

### Game Domain

- **Factions**: 위(Wei), 촉(Shu), 오(Wu), 군벌(Warlords) — synergy bonuses at 2/3 (minor) and 3/3 (major) same-faction warriors
- **Decks**: 3 warriors (front/mid/back lanes) + up to 2 tactic cards
- **Battle**: Turn-based (max 3 turns), win by eliminating all enemy warriors or having highest total HP at end
- **Progression**: Gacha booster packs → collection → enhancement (duplicate merging for levels) → deck building → battles → rewards
- **HP formula**: Command × 3; damage uses attack stat with modifiers

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

### Language

All UI text is in Korean. HTML lang is set to "ko".
