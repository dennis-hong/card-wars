# Repository Guidelines

## Project Structure & Module Organization
- `src/app`: Next.js App Router entry points and route screens (`battle`, `booster`, `deck`, `collection`).
- `src/components`: Feature UI organized by domain (`battle`, `booster`, `card`, `collection`, `deck`, `ui`).
- `src/hooks`: Shared React hooks (notably `useGameState` for persistence and gameplay state).
- `src/lib`: Core game logic/utilities (battle engine, gacha, sound, IDs).
- `src/data`: Static content (cards, titles, battlefield events).
- `src/types`: Central TypeScript models.
- `public/images` and `public/sfx`: runtime assets. Keep filenames kebab-case (for example `zhang-fei.png`).
- `docs`: planning and design notes.

## Build, Test, and Development Commands
- `npm run dev`: start local dev server at `http://localhost:3000`.
- `npm run build`: create production build; run before opening PRs.
- `npm run start`: serve the production build locally.
- `npm run lint`: run ESLint across the repository.

## Coding Style & Naming Conventions
- Language stack: TypeScript + React (Next.js 16 App Router).
- Use 2-space indentation, semicolons, and single quotes in TS/TSX to match existing files.
- Components: PascalCase file and export names (`BattleArena.tsx`).
- Hooks: `use*` naming (`useGameState.ts`).
- Utility/data modules: concise kebab-case or domain names (`battle-engine.ts`, `cards.ts`).
- Prefer path aliases (`@/...`) over long relative imports.
- Styling is Tailwind-first in JSX; keep shared/global styles in `src/app/globals.css`.

## Testing Guidelines
- There is no dedicated automated test suite yet.
- Minimum verification for each change: run `npm run lint`, run `npm run build`, then manually validate affected flows in `npm run dev` (booster open, deck edit/save, battle outcome, collection updates).
- When adding tests, colocate as `*.test.ts`/`*.test.tsx` near the feature or in a local `__tests__` folder.

## Commit & Pull Request Guidelines
- Follow Conventional Commit prefixes seen in history: `feat:`, `fix:`, `checkpoint:`.
- Keep commit subject short and scoped to one change.
- PRs should include a concise behavior summary, linked issue/task (if available), screenshots/GIFs for UI changes, and verification notes listing commands run and manual flows tested.
