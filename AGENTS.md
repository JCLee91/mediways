# Repository Guidelines

## Project Structure & Module Organization
- `src/app` holds Next.js route handlers and page-level layouts; co-locate server actions near their routes.
- Reusable UI primitives live in `src/components`; compose them rather than duplicating Tailwind utilities.
- Domain logic sits under `src/lib` with service-specific folders and accompanying tests in `__tests__` directories. Shared hooks and types are in `src/hooks` and `src/types`.
- Static assets live in `public/`; environment-driven configuration and seed scripts are grouped under `supabase/` and `scripts/`.

## Build, Test, and Development Commands
- `pnpm dev` starts the Next.js dev server with Turbopack; expose new routes via `src/app`.
- `pnpm build` performs a production build; run before deploying to catch SSR hydration issues.
- `pnpm lint` (ESLint) and `pnpm format` (Biome) keep code style aligned; stage only files that pass both.
- `pnpm type-check` runs the TypeScript compiler without emit; fix all typing regressions prior to PRs.
- `pnpm test` executes the Jest suite once; use `pnpm test:watch` for tight loops while working on services.

## Coding Style & Naming Conventions
- Default indentation is two spaces; keep TypeScript strict mode errors resolved.
- Components and hooks follow `PascalCase` and `useCamelCase` naming respectively. Utility functions stay `camelCase`; constants use `SCREAMING_SNAKE_CASE` only when shared across modules.
- Prefer Tailwind utility classes for styling; extract shared patterns into `src/components/ui` when reused.
- Let Biome manage formatting; avoid manual alignment that will be reset by `pnpm format`.

## Testing Guidelines
- Jest with the jsdom environment covers service logic; keep new business rules in `src/lib/services` accompanied by a matching spec in `__tests__`.
- Use descriptive `it('returns compliant copy for ...')` titles to document regulatory expectations.
- Guard edge cases (empty inputs, Supabase failures) with regression tests before merging.

## Commit & Pull Request Guidelines
- Existing history uses concise, imperative subjects (e.g., `웹사이트 디자인 및 기능 개선 업데이트`); follow the same style and keep to ≤72 characters.
- Group related changes into a single commit; include context in the body when touching compliance-sensitive modules.
- Pull requests must describe intent, note impacted routes or services, and list manual verification (e.g., `pnpm test`, `pnpm lint`). Attach screenshots or clips for UI-visible changes and link tracking tickets when available.
