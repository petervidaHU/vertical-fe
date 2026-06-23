# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

An educational web app that conveys how vast space/the atmosphere is and what exists at
each altitude. The user scrolls the mouse wheel to ascend through the air. Along the way
they encounter:

- **Epics** — large pre-defined segments of the journey (an altitude range with its own
  title, color, and background) that frame a bigger slice of the trip.
- **Stories** — smaller information pieces, independent of epics, of two kinds:
  - `CARD` — attached to an altitude *zone* (a start/end range).
  - `LINE` — attached to a specific altitude (rendered as a labeled line).
- **Altitude info** — indicator values tied to altitude ranges (e.g. temperature,
  pressure), optionally interpolated with a gradient between `startValue`/`endValue`.
- **Tags** — used to filter which stories / altitude info are shown.

There is a separate **admin** area for managing journeys and all of the above.

## Commands

```bash
npm run dev            # dev server on 0.0.0.0:3001 (React Router + Vite)
npm run build          # production build (react-router build)
npm start              # serve the production build
npm run typecheck      # react-router typegen && tsc  (run after changing routes)
npm run lint           # eslint . (airbnb + prettier); lint:fix to autofix

# Tests — Jest is the primary runner
npm test               # Jest (ESM via --experimental-vm-modules), matches *.jest.test.ts(x)
npm run test:watch
npm run test:coverage
npx node --experimental-vm-modules node_modules/jest/bin/jest.js --config jest.config.ts <pattern>   # single test/file

# Vitest also exists for *.test.ts files (legacy/secondary)
npm run test:vitest

# Database (Prisma + Postgres)
npm run db:generate            # regenerate client into app/generated/prisma after schema edits
npm run db:migrate             # prisma migrate dev
npm run db:migrate:deploy
npm run db:push
npm run db:studio
```

Local Postgres runs via Docker (`docker/` + `Dockerfile`). Required env (`.env`):
`DATABASE_URL`, `SHADOW_DATABASE_URL` (for migrations). `API_BASE_URL` only feeds the
unused REST client layer (see below).

## Architecture

**This is a full-stack React Router v7 app (SSR/framework mode), not a separate
frontend.** Despite `REWRITE_PLAN.md` describing a REST-API-consuming client, the live
data path is: route **loaders/actions query Prisma directly** via
[app/server/db.ts](app/server/db.ts). There is no running backend service — `backend/` is
empty, and [app/shared/api/](app/shared/api/) (typed REST `client`/`endpoints`) is a
migration leftover that nothing in the active routes uses. Treat it as dead unless you are
deliberately reviving it.

**Legacy code:** the entire `src/` tree (old Redux/RTK-Query/webpack/Tailwind prototype)
is dead — `routes.ts` only wires `app/routes/*`. Don't edit `src/`, the duplicate
`*.config.js` files, or `webpack.config.js` when working on features. See `REWRITE_PLAN.md`
for migration history.

### Layout

- `app/routes/` — route modules; routing is config-based in [app/routes.ts](app/routes.ts)
  (not file-name convention). Public reader is `/journey/:id`; admin is nested under
  `/admin/:journeyId/...`; `api.tags*` are resource routes (loader/action only, no UI).
- `app/features/<feature>/` — feature code split into `domain/` (pure, unit-tested logic),
  `components/`, and for the timeline `pixi/`, `motion/`, `layout/`.
- `app/shared/` — cross-feature `hooks/`, `domain/`, `validation/` (zod), `debug/`,
  `components/`, and the dormant `api/`.
- `app/server/` — server-only code (Prisma client, tag API helpers). Imported only from
  loaders/actions.
- `app/generated/prisma/` — **generated Prisma client; do not edit.** Regenerate with
  `npm run db:generate`. Schema lives in [prisma/schema.prisma](prisma/schema.prisma).

### Data model

`Journey` is the aggregate root; it owns `Epic[]`, `Story[]`, `AltitudeInfo[]` (each with
`AltitudeInfoValue[]`), and `Tag[]`. Stories and AltitudeInfo are many-to-many with Tags.
`Story.storyType` is the `CARD`/`LINE` enum. Most positional models carry
`startPoint`/`endPoint` integers (altitude in meters). Backgrounds are stored as JSON
strings (`Epic.background`, `Story.background`) plus optional image/pattern config.

### Reader scroll & rendering pipeline

The journey page is a full-screen PixiJS canvas with React UI (Mantine modals/buttons)
layered on top. The interaction loop is deliberately split so React never drives the
animation frame:

1. [useWheelAltitude](app/shared/hooks/useWheelAltitude.ts) listens to `wheel`, scales
   delta by the scroll multiplier (pace), and pushes a **target** altitude into a ref
   (`targetAltitudeRef`) — no React state per wheel event.
2. The Pixi renderer's ticker reads the target ref each frame and eases the rendered
   altitude toward it via the
   [altitudeMotor](app/features/timeline/pixi/motion/altitudeMotor.ts) (exponential
   smoothing with adaptive half-life / per-frame clamp).
3. The renderer reports the rendered altitude back up via `onRenderedAltitudeChange`,
   which the route stores in a ref and mirrors into React state (wrapped in
   `startTransition`) to drive altitude-dependent UI (active altitude info, epic-entered
   modal, recent-stories list).

Pure, testable pieces of this live in `app/features/timeline/domain/`
(`storyStops`, `recentStories`, `scrollMultiplier`) — prefer adding logic there over the
renderer. The "fast scroll story-stop clamp" (slow down through stories when paging
quickly) is in `storyStops.ts` and wired in `journey.$id.tsx`.

### PixiJS

- [JourneyPixiTimeline.tsx](app/features/timeline/pixi/JourneyPixiTimeline.tsx) is the
  ~2500-line renderer (the scene graph, cards, lines, epic backgrounds, multiplier
  selector). It is loaded **client-only** through
  [JourneyPixiTimelineClient.tsx](app/features/timeline/pixi/JourneyPixiTimelineClient.tsx)
  via dynamic `import()` so it never runs during SSR.
- An incremental refactor is extracting reusable code into `pixi/utils/`, `pixi/icons/`,
  `pixi/layout/`, `pixi/motion/`. See
  [pixi/REFACTORING.md](app/features/timeline/pixi/REFACTORING.md) for the plan and what's
  done; prefer the extracted utilities over re-defining helpers in the monolith.
- This repo is set up for **PixiJS v8** — follow
  [.github/copilot-instructions.md](.github/copilot-instructions.md): single `pixi.js`
  package, `await app.init()`, `app.canvas`, shape-then-`.fill()`/`.stroke()` graphics,
  `Assets.load()`, ticker callback receives the `Ticker`, explicit
  `app.destroy(true, { children: true })` cleanup.

### Admin

Admin routes use React Router **actions** with native `<Form>` submissions and Prisma
mutations (see e.g. `admin.$journeyId.stories.$storyId.tsx`). Image handling and import
parsing live in `app/features/admin/domain/` with `.server.ts`/`.shared.ts` splits to keep
server-only code out of the client bundle. Rich text uses Tiptap (`StoryExtraContentEditor`);
`extraContent` HTML is validated/sanitized via `app/shared/validation/storySchemas.ts`.

## Conventions

- TypeScript strict; avoid `any` (REWRITE_PLAN rule). Side effects belong in
  loaders/actions/hooks, not render. No direct `fetch`/Prisma in presentational components.
- Server-only modules must end up only in loaders/actions — use `.server.ts` suffixes or
  dynamic `import()` inside actions for code that touches the filesystem/`sharp`.
- Tests are colocated. `*.jest.test.ts(x)` run under Jest (the configured matcher);
  `*.test.ts` run under Vitest. When adding tests, prefer the `.jest.test` convention.
- Temporary instrumentation should use the debug bus
  ([app/shared/debug](app/shared/debug/README.md)), inspectable at runtime via
  `window.__verticalDebug`.
- A husky pre-push hook runs `lint:fix`.
