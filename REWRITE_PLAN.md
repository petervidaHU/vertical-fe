# Vertical FE Complete Rewrite Plan

## 1. Objective

Rebuild the frontend from scratch with a modern, maintainable architecture while preserving business behavior and backend compatibility.

Target stack:
- React Router v7 (Remix v2 style data APIs)
- Mantine UI v8
- PixiJS v8
- TypeScript (strict mode)

Important constraint:
- Backend remains standalone and is consumed only via REST API requests.
- No backend contract breaking from frontend changes.

## 1.1 Implementation Decision (Explicit)

This is an in-place rewrite in the same repository, not a separate greenfield repo.

Decision:
- Keep using the current root project folder.
- Create the new frontend architecture under a new root-level app/ directory.
- Keep legacy src/ temporarily for parity checks and staged migration.
- Remove legacy src/ and obsolete webpack/tailwind v3 setup only after cutover.

So the path is: rewrite this app inside the current project, with a temporary side-by-side code layout during migration.

## 1.2 Migration Tracking Notes

- Shared reusable hooks are being moved from legacy src/ into app/shared/ to support the cutover.
- Current migrated reusable scroll hooks:
  - app/shared/hooks/useWheelAltitude.ts
  - app/shared/hooks/useAltitudePrefetchTrigger.ts
- Timeline feature implemented in app/:
  - app/features/timeline/domain/types.ts
  - app/features/timeline/services/useTimelineScroll.ts
  - app/features/timeline/components/TimelineStoryCard.tsx
  - app/features/timeline/components/TimelineEpicBadge.tsx
  - app/features/timeline/components/TimelineAltitudeDisplay.tsx
  - app/routes/_index.tsx (wired with real timeline interaction)
- API layer extended with prefetchTimeline and getTimelineProgress endpoints.
- Legacy compatibility shims may remain temporarily in src/hooks/ until all route usage is moved to app/.
- Goal after full parity verification: delete the legacy src/ app and keep app/ as the single runtime frontend.
- Remaining legacy src/ consumers to migrate before deletion: MainWrapper, VisibleStories, Epics, ProgressLogic, ProgressBar, ScrollAmount, Settings, Story, Epic, PassedStoryChip + Redux store + RTK Query setup.

## 2. Why Full Rewrite

The current app works as a prototype but has architectural issues that justify a clean rewrite:
- Render-time side effects and dispatches
- Mixed typing quality and frequent any usage
- Fragile scroll logic and stale-closure risk
- Admin UX/data handling issues
- Missing automated test baseline

A rewrite is lower risk than layering more patches onto unstable foundations.

## 3. Architecture Principles

- Pure render functions, side effects only in loaders/actions/hooks.
- Route-first architecture with data loading at route boundaries.
- Strict typing from API client to UI component props.
- Clear separation of concerns:
  - Domain models
  - API client and mapping
  - Route modules
  - Presentational UI
  - Pixi rendering engine module
- Incremental migration with behavior parity checkpoints.
- Accessibility and keyboard support as first-class requirements.

## 4. Target Application Architecture

## 4.1 Suggested Folder Structure

- app/
  - entry.client.tsx
  - entry.server.tsx (if SSR enabled)
  - root.tsx
  - routes/
    - _index.tsx
    - admin.tsx
    - admin.list.tsx
    - admin.edit.$id.tsx
    - admin.edit._index.tsx
  - features/
    - timeline/
      - domain/
      - services/
      - components/
      - pixi/
    - admin/
      - domain/
      - services/
      - components/
  - shared/
    - api/
      - client.ts
      - endpoints.ts
      - types.ts
      - mappers.ts
    - ui/
    - utils/
    - constants/
  - styles/
  - test/

## 4.2 Routing and Data Flow

Use React Router v7 data APIs:
- loaders for read requests
- actions for create/update/delete
- useFetcher for non-navigation mutations
- route-level error boundaries for resilient UX

Benefits:
- Side effects move out of render paths
- Better caching/revalidation model
- Easier testability of data loading logic

## 4.3 REST API Integration Strategy

- Centralize HTTP handling in shared/api/client.ts.
- Define one typed API contract layer in shared/api/types.ts.
- Add runtime validation for critical payloads (recommended: zod).
- Normalize backend responses into frontend domain models using mappers.
- Standardize error model:
  - transport error
  - validation error
  - domain error

No direct fetch calls inside presentational components.

## 4.4 State Management Strategy

Default strategy:
- Route data from loaders as primary source of truth.
- Local UI state in component hooks.
- Shared cross-route state only when necessary.

Avoid global store unless a strong cross-route requirement exists.
If needed, use a lightweight state layer only for:
- viewport interaction settings
- transient Pixi runtime controls

## 4.5 Mantine UI v8 Strategy

- Build design system tokens first:
  - color palette
  - typography scale
  - spacing and radius
  - semantic status colors
- Implement layout shells and reusable primitives:
  - app shell
  - page headers
  - table wrappers
  - form field components
- Use Mantine form utilities for admin forms.
- Enforce accessibility labels and keyboard focus states.

## 4.6 PixiJS Strategy

- Integrate Pixi as an isolated rendering module under features/timeline/pixi.
- App initialization pattern:
  - create Application
  - await app.init(options)
  - attach app.canvas to DOM
- Keep Pixi scene graph decoupled from route logic.
- Define a renderer adapter with typed inputs from domain models.
- Add explicit cleanup on route unmount:
  - remove listeners
  - destroy app and children

Do not place business logic directly in Pixi display objects.

## 5. Delivery Plan (Phased)

## Phase 0: Foundation

- Initialize new app shell with TypeScript strict mode.
- Add React Router v7 route modules and root layout.
- Set up Mantine provider and base theme.
- Add API client scaffolding and shared domain types.
- Add lint, format, and test setup.

Exit criteria:
- App boots and routes render.
- CI checks pass on empty feature baseline.

## Phase 1: Backend Contract and Data Layer

- Implement typed REST client.
- Implement endpoint modules for stories, epics, timeline.
- Add mappers and error normalization.
- Add integration tests for API modules with mocked responses.

Exit criteria:
- Data layer passes tests.
- All expected backend responses mapped to domain models.

## Phase 2: Reader Experience Rewrite (Main Screen)

- Build timeline route with loader-based data retrieval.
- Implement new scroll interaction engine (deterministic and testable).
- Integrate Pixi scene rendering for timeline visualization.
- Keep behavior parity with current user flow.

Exit criteria:
- User can scroll through stories and epics reliably.
- No render-time side effects.
- Pixi mount/unmount is leak-free.

## Phase 3: Admin Rewrite

- Build admin list route with server-driven pagination/filter/sort.
- Build admin edit/create forms with schema validation.
- Implement actions for create/update/delete via route actions.
- Improve accessibility, error messaging, and loading states.

Exit criteria:
- CRUD behavior complete.
- Form validation and optimistic/non-optimistic states are defined.

## Phase 4: Quality and Hardening

- Add end-to-end tests for critical flows:
  - read timeline
  - filter/sort list
  - create/edit/delete entity
- Add performance profiling for Pixi scene.
- Add error boundary coverage and observability hooks.

Exit criteria:
- All critical user journeys tested.
- Performance and memory within agreed thresholds.

## Phase 5: Cutover

- Run side-by-side QA against current production behavior.
- Freeze old frontend except for emergency fixes.
- Deploy new frontend behind feature flag or controlled rollout.
- Monitor and complete rollback plan readiness.

Exit criteria:
- Stable production metrics after rollout window.

## 6. Technical Standards

- TypeScript strict mode enabled.
- No any in app code except isolated compatibility shims.
- ESLint + Prettier + import ordering.
- Unit tests for core logic.
- Integration tests for loaders/actions and API client.
- E2E tests for core business workflows.

## 7. API Compatibility Checklist

For each endpoint:
- Request method/path/query/body preserved.
- Response shape mapped and validated.
- Error codes handled consistently.
- Empty states and edge cases covered.

Suggested endpoint groups:
- timeline
- prefetch stories by position
- one story by id
- list with pagination/sort/filter
- create story
- update story
- delete story

## 8. Key Risks and Mitigations

- Risk: Scroll behavior regressions
  - Mitigation: Isolated interaction engine + unit and E2E tests

- Risk: Pixi memory leaks
  - Mitigation: strict lifecycle wrapper and teardown tests

- Risk: Backend contract drift
  - Mitigation: typed client, response validation, contract smoke tests

- Risk: Rewrite scope creep
  - Mitigation: phase gates and parity-first rule

## 9. Done Definition

The rewrite is complete when:
- All user and admin business flows work against the existing REST backend.
- React Router v7 data APIs are used consistently.
- Mantine UI v8 is the primary component system.
- PixiJS is integrated through a dedicated rendering module.
- Strict TypeScript and test quality gates pass.
- Rollout and rollback plans are documented and verified.

## 10. Immediate Next Actions

1. Create a new branch and scaffold the new app architecture.
2. Implement the typed REST client and endpoint modules first.
3. Build route shells with loaders/actions before UI detail work.
4. Implement timeline domain and Pixi adapter in isolation.
5. Start parity validation against existing behavior from the first feature slice.
