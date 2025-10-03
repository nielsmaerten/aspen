# Repository Guidelines

## Project Structure & Module Organization
`src/index.ts` bootstraps Aspen and delegates to `src/app.ts`. Helpers sit in `src/bootstrap` and `src/config`, API clients in `src/clients`, shared domain logic in `src/domain`, and utilities in `src/utils` and `src/logging`. Prompt templates live under `prompts/`. Tests mirror runtime modules in `test/unit` and `test/integration`, and builds emit to `dist/`.

## Build, Test, and Development Commands
- `pnpm install` – sync dependencies when the lockfile changes.
- `pnpm dev` – run `src/index.ts` with live reload via `tsx`.
- `pnpm build` – type-check and emit ESM bundles to `dist/`.
- `pnpm test` / `pnpm test:watch` – execute Vitest once or in watch mode.
- `pnpm lint` / `pnpm format` – validate or apply Prettier to code, tests, and prompts.

## Coding Style & Implementation Guidelines
Strict TypeScript ESM with two-space indentation enforced by Prettier. Prefer named exports, camelCase for values, PascalCase for types or classes, and uppercase snake case for constants. Keep files aligned with their primary export and ship focused modules.

- Keep functions small; reuse helpers instead of duplicating logic.
- Prefer mature npm packages over bespoke utilities.
- Use `async/await` for all async paths and log concise errors with `pino` before bubbling failures.
- Add short comments when intent might be opaque.
- Start simple, iterate as needs emerge, and rely on Prettier for formatting.

## Testing Guidelines
- Place unit specs in `test/unit`; do not colocate them with source files.
- House cross-cutting but still isolated flows anywhere under `test/`, keeping fixtures local.
- Classify a spec as an integration test only when it requires live Paperless or AI provider access. These belong in `test/integration` and must gate on `ASPEN_DEV_RUN_INTEGRATION`.
- Agents must not execute integration suites; request that the user runs them when verification against live services is needed.
- Always run `pnpm test` (unit-only) before handoff.

## Commit & Pull Request Guidelines
Follow conventional commits (`feat:`, `refactor:`, `fix:`) with subjects under 72 characters and optional bodies for context. Pull requests should reference issues, list manual or automated checks, and attach screenshots or logs for visible changes.

## Environment & Configuration Tips
Start from `.env.example`, add Paperless credentials, and set the required AI provider key. Adjust `ASPEN_INTERVAL` and `ASPEN_TAG_*` to match the workflow. Coordinate before toggling `ASPEN_DEV_RUN_INTEGRATION`; leave it `false` unless someone can observe Paperless-side effects.
