# Smooth Scrolling Plan — Journey Timeline

## Mission

Make journey scrolling feel continuous and reliable even during aggressive wheel input, while keeping the PixiJS implementation scalable for many stories and maintainable for future server-windowed rendering.

---

## Root Cause Analysis

The current Pixi timeline mixes three concerns in one place: wheel input handling, altitude state updates, and per-card visibility and animation lifecycle. That coupling creates a failure mode under fast scrolling.

### 1. History-Driven Card State Machine

`JourneyPixiTimeline.tsx` contains a hand-rolled state machine with 7 phases:

```
hidden → entering → transitioning-with-scroll → holding-end → armed-exit → exiting → hidden
                  ↘ holding-start ↗
```

Phase transitions are triggered by altitude boundary crossings (`crossedStartAscending`, `crossedEndAscending`, etc.) computed inside `renderFrame`. When the user scrolls fast, multiple boundary crossings happen in a single frame — the state machine can't correctly sequence them.

A single wheel burst can move altitude across both `startPoint` and `endPoint` simultaneously. Cards can enter and exit in the same logical pass. The result is visible blinking, popping, or cards vanishing before the user can register them.

Additional problems:

- The `armed-exit` phase uses a scroll tick counter that increments on each `wheel` event. This is decoupled from the render loop and creates timing races.
- `queuedTransitionToExit` is a band-aid flag for the case where start and end are crossed in the same frame. It signals the state machine is structurally broken, not that the edge case was handled.
- `holding-start` is a defined phase but never transitioned into — dead code indicating design drift.

This is not mainly a Pixi rendering problem. It is a state-model problem.

### 2. Raw Wheel Events Drive the Render Directly

The animation system has no buffer between input and rendering. Wheel input updates altitude, and altitude immediately determines card positions. There is no intermediate `renderedAltitude` that moves smoothly toward a `targetAltitude`. A fast flick of a high-DPI mouse wheel can produce `deltaY` values of 1000+, causing the user to skip past multiple stories entirely without them ever appearing on screen.

### 3. Duplicate Wheel Handling Fights React

`JourneyPixiTimeline` has its own `onWheel` handler attached to the host div, duplicating logic from `useWheelAltitude`. It calls `setAltitude` (React state) inside the wheel handler, which fires at 60+ fps from the mouse. React's state batching fights the PixiJS ticker — altitude updates can arrive in batches, causing visual jitter.

### 4. Per-Frame Layout Recalculation

The horizontal layout (`queueStartX`, `scaledCardWidth`, `cardScale`) is recalculated every frame based on the current count of visible cards. This is computationally wasteful and causes cards to shift horizontally when new cards enter or exit — a source of perceived jank.

### 5. No Viewport Culling

All card containers exist in the scene graph at all times. While `container.visible` is toggled, the animation state machine still runs for every card on every frame. For a journey with many stories, that is many state-machine evaluations per frame regardless of how many cards are actually on screen.

---

## Design Goals

- Smooth motion under mouse wheel and trackpad bursts
- Deterministic card visibility for any altitude delta size
- Stable behavior when scrolling up or down quickly
- Rendering cost bounded by viewport window, not total story count
- Clear separation between input, motion, layout, windowing, and Pixi presentation
- Easy migration toward the server-window architecture described in `ARCHITECTURE.md`

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  INPUT                                                           │
│  Wheel events → targetAltitude only (no React state, no render) │
├──────────────────────────────────────────────────────────────────┤
│  MOTION                                                          │
│  Ticker-driven: renderedAltitude interpolates toward target      │
│  All scene content derives from renderedAltitude                 │
├──────────────────────────────────────────────────────────────────┤
│  WINDOWING                                                       │
│  Active story set = stories intersecting renderedAltitude window │
│  Asymmetric overscan buffers entries and exits                   │
├──────────────────────────────────────────────────────────────────┤
│  LAYOUT                                                          │
│  Pure functions: renderedAltitude + story → StoryRenderModel     │
│  No history, no phase transitions, no event dependencies         │
├──────────────────────────────────────────────────────────────────┤
│  PRESENTATION (PixiJS)                                           │
│  Pooled containers apply StoryRenderModel each frame             │
│  No layout math, no domain decisions                             │
└──────────────────────────────────────────────────────────────────┘
```

---

## Detailed Implementation Plan

### Phase 1 — Split Target and Rendered Altitude

Do not move visible content directly from raw wheel events.

- `targetAltitude`: updated immediately from wheel input, stored in a ref
- `renderedAltitude`: updated on `app.ticker` using `deltaMS`, drives all rendering
- all card positions, line positions, background, and active-story calculations use `renderedAltitude`, never `targetAltitude`

This is the single most impactful change. It ensures that even when the user flicks the wheel hard, `renderedAltitude` still travels through intermediate values, meaning short stories still appear on screen instead of being skipped in a single frame.

Motion model:

```ts
// Wheel handler — updates target only, no React setState
targetAltitude += wheelImpulse;
targetAltitude = clamp(targetAltitude, 0, journey.endOfTheWorld);

// Pixi ticker — smooth interpolation toward target
const smoothing = 1 - Math.exp(-deltaMS / 90);
renderedAltitude += (targetAltitude - renderedAltitude) * smoothing;
```

Guardrails:

- Clamp `targetAltitude` to journey bounds
- Cap maximum `renderedAltitude` step per frame to avoid jump artifacts after tab restore or frame stalls:

```ts
const MAX_STEP_PER_FRAME = 300; // tune based on typical story span
const rawStep = (targetAltitude - renderedAltitude) * smoothing;
const step = Math.sign(rawStep) * Math.min(Math.abs(rawStep), MAX_STEP_PER_FRAME);
renderedAltitude += step;
```

- Configure the Pixi ticker intentionally: `minFPS = 30`, `maxFPS = 60`

**Remove the duplicate wheel listener from `JourneyPixiTimeline`.** Wheel input flows through `useWheelAltitude` in the route component only. The PixiJS component receives `altitudeRef` — a ref, not React state — and reads `altitudeRef.current` each ticker frame with no re-render involved.

```ts
// In journey.$id.tsx
const altitudeRef = useRef(0);

useWheelAltitude({
  pace: scrollMultiplier,
  scaledValue: altitudeRef.current,
  onChange: ({ nextScaled }) => {
    altitudeRef.current = nextScaled;
    // trigger prefetch check here (debounced), not React setState
  },
  enabled: true,
  target: typeof document !== "undefined" ? document : null,
});
```

**Checklist:**

- [ ] Add `targetAltitude` ref beside current altitude
- [ ] Drive `renderedAltitude` from ticker interpolation with frame cap
- [ ] Make line, background, and HUD rendering use `renderedAltitude`
- [ ] Remove `host.addEventListener("wheel", ...)` from `JourneyPixiTimeline`
- [ ] Wire `useWheelAltitude` in the route component, pass `altitudeRef` to Pixi component
- [ ] Throttle React-facing HUD state (10–15 fps, or on rounded altitude change only)

---

### Phase 2 — Replace the State Machine with a Pure Presentation Function

The card should not depend on whether a previous wheel event crossed a threshold. Its transform should be a deterministic function of `renderedAltitude` alone.

Replace the 7-phase machine with a piecewise presentation function per story:

```ts
const entryStart  = story.startPoint - ENTRY_MARGIN;
const exitEnd     = story.endPoint   + EXIT_MARGIN;

function getStoryPresentation(story: Story, renderedAltitude: number): StoryRenderModel {
  if (renderedAltitude < entryStart || renderedAltitude > exitEnd) {
    return { visible: false, alpha: 0, ... };
  }

  let progress: number;
  let phase: "entering" | "active" | "exiting";

  if (renderedAltitude < story.startPoint) {
    phase    = "entering";
    progress = (renderedAltitude - entryStart) / (story.startPoint - entryStart); // 0 → 1
  } else if (renderedAltitude <= story.endPoint) {
    phase    = "active";
    progress = (renderedAltitude - story.startPoint) / (story.endPoint - story.startPoint); // 0 → 1
  } else {
    phase    = "exiting";
    progress = (renderedAltitude - story.endPoint) / (exitEnd - story.endPoint); // 0 → 1
  }

  return {
    visible: true,
    alpha:   deriveAlpha(phase, progress),
    y:       deriveY(phase, progress, story),
    scale:   deriveScale(phase, progress),
    slot:    story.slot,
  };
}
```

Why this is the core fix:

- No skipped internal phases regardless of how large the altitude jump was
- No dependency on scroll tick counters
- No special handling for crossing both start and end in one wheel burst — the function simply returns the correct state for the current `renderedAltitude`
- Scrolling down reverses the same function naturally — symmetric behavior is free

The `StoryRenderModel` type:

```ts
type StoryRenderModel = {
  id:       string;
  visible:  boolean;
  kind:     "CARD" | "LINE";
  x:        number;
  y:        number;
  alpha:    number;
  scale:    number;
  rotation: number;
  zIndex:   number;
  slot:     number;
};
```

**Smooth interpolation toward target values**

For the `active` phase, cards are tracking a moving target (their `y` changes as `renderedAltitude` moves). Use frame-rate-independent exponential decay so tracking is smooth and never jumps:

```ts
function smoothToward(current: number, target: number, halfLifeMs: number, deltaMs: number): number {
  const decay = Math.exp(-deltaMs / (halfLifeMs / Math.LN2));
  return target + (current - target) * decay;
}
```

Starting `halfLifeMs` values:

| Property | halfLifeMs | Rationale |
|---|---|---|
| `y` | 80ms | Tight, responsive to scroll |
| `alpha` | 150ms | Smooth fade, no flicker |
| `scale` | 120ms | Subtle size changes feel natural |
| `x` (slot reflow) | 120ms | Cards slide into new queue positions |

For enter and exit animations, use the existing easing functions applied cleanly against animation progress:

- **Entering:** `alpha` 0→1, `y` from offscreen to target, `scale` 0.7→target. Duration: 400ms.
- **Exiting:** `alpha` 1→0, `y` to offscreen, `scale` target→0.7. Duration: 300ms.

**Delete:**

- The 7-phase state machine and all its transition logic
- `queuedTransitionToExit` flag
- The dead `holding-start` phase
- The scroll tick counter used by `armed-exit`

**Checklist:**

- [ ] Implement `getStoryPresentation` as a pure function in `layout/storyPresentation.ts`
- [ ] Replace `renderFrame` phase-transition logic with calls to `getStoryPresentation`
- [ ] Implement `smoothToward` with the half-life constants above
- [ ] Apply enter/exit easing against `animationProgress`, not tick counts
- [ ] Unit test: large wheel impulse crossing both `startPoint` and `endPoint` does not produce invalid state
- [ ] Unit test: scrolling up through an altitude band produces the symmetric inverse of scrolling down

---

### Phase 3 — Altitude Windowing with Overscan and Presenter Pool

**Windowing**

Do not manage every story as a live visual node at all times. Create an application-level virtual window:

```ts
const visibleStart = renderedAltitude - beforeOverscan;
const visibleEnd   = renderedAltitude + viewportHeight + afterOverscan;
```

Use asymmetric overscan, biased toward the current travel direction:

| Region | Overscan |
|---|---|
| Card ahead (travel direction) | 1.5× viewport height |
| Card behind | 0.75× viewport height |
| Line ahead | slightly larger than cards (cheap to draw) |

Only stories intersecting this altitude band are mounted into the Pixi presentation layer. Stories outside it have no live Pixi nodes. This keeps CPU and memory cost bounded by viewport size, not total story count.

When direction changes (scroll reversal), update the overscan bias within one ticker frame — do not wait for stories to vanish before pre-loading in the new direction.

**Presenter pool**

Never create or destroy PixiJS display objects during scrolling. Recycle instead.

```ts
class StoryPresenterPool {
  private pool: Container[] = [];

  acquire(): Container {
    if (this.pool.length > 0) {
      const container = this.pool.pop()!;
      container.visible = true;
      container.alpha   = 1;
      container.scale.set(1);
      container.rotation = 0;
      return container;
    }
    return this.createNewContainer(); // Graphics + Text children created once
  }

  release(container: Container): void {
    container.visible = false;
    container.removeAllListeners();
    this.pool.push(container);
  }
}
```

Pre-warm the pool at init with `MAX_VISIBLE_CARDS + 4` containers. Typical max visible is 6–8 cards, so pool size ~12. This covers the overlap period where entering and exiting cards coexist.

Avoid rebuilding Graphics every frame. Avoid changing Text every frame except HUD values that truly need it. Prefer updating transforms and alpha over destroying and recreating display objects.

A `storyId → presenter` mapping exists only while the story is inside overscan. When a story leaves overscan, its presenter is released back to the pool.

**Stable slot assignment**

Cards behave as a horizontal queue. That queue should be derived, not event-driven.

- Active cards are sorted by `startPoint`, then `id`
- Each visible card gets a stable slot index within the current window
- Screen `x` comes from slot index × (card width + gap)
- If slot jumping is noticeable when cards enter or leave, keep slots sticky until a card fully leaves exit overscan and animate reflow with the 120ms `x` half-life

**Checklist:**

- [ ] Implement `altitudeWindow.ts`: overscan logic, active story selection, direction bias
- [ ] Implement `StoryPresenterPool`: acquire, release, pre-warm at init
- [ ] Implement stable slot assignment sorted by `startPoint` then `id`
- [ ] Wire windowing into the ticker: on each frame, diff active set, acquire/release presenters
- [ ] Unit test: windowing returns the same story set regardless of whether altitude arrives in one jump or several small steps
- [ ] Unit test: slot assignment is stable for unchanged active story sets

---

### Phase 4 — React Isolation and HUD Throttling

React should not own high-frequency animation state.

- Keep `targetAltitude`, `renderedAltitude`, velocity, and active presenter maps in refs or a scene controller object
- Only expose throttled values to React for HUD text or external controls
- Update React at 10–15 fps, or only when the rounded altitude display value changes
- Profile text updates and Graphics redraws after this phase — only add Pixi-level culling flags if profiling shows GPU-bound rendering

**Checklist:**

- [ ] Move all per-frame animation state to refs or a `JourneyPixiScene` controller
- [ ] Replace `setAltitude` React setState in the wheel handler with a ref write
- [ ] Add throttled `onAltitudeChange` callback for HUD updates only
- [ ] Profile: measure frame time before and after, confirm no regression

---

### Phase 5 — Server-Windowed Data (Future Migration)

The current route loads all stories upfront. That is acceptable until Phase 1–4 are stable, but the architecture should be prepared for server windowing.

Target direction:

- Client keeps local `targetAltitude` and `renderedAltitude`
- Client requests story windows around altitude bands via a resource route
- Server returns render-ready window data (pre-calculated positions, colors, slot assignments)
- Client presenter pool handles only the active window items

The windowing layer introduced in Phase 3 should use an interface that works for both all-stories-loaded mode and server-windowed mode — this makes the migration in Phase 5 a data source swap, not an architecture change.

**Resource route:** `app/routes/api.journey.$id.window.ts`

```ts
export async function loader({ params, request }: Route.LoaderArgs) {
  const url            = new URL(request.url);
  const altitude       = Number(url.searchParams.get("altitude")) || 0;
  const viewportWidth  = Number(url.searchParams.get("viewportWidth")) || 1200;
  const viewportHeight = Number(url.searchParams.get("viewportHeight")) || 800;

  return await computeRenderCards({
    journeyId: params.id!,
    altitude,
    viewportWidth,
    viewportHeight,
    window: 3000, // fetch cards within ±3000 altitude units
  });
}
```

Add ETag/If-None-Match caching keyed on `(journeyId, altitude, viewportWidth, viewportHeight)` — the window query is idempotent and can be cached for 30 seconds in memory to contain server compute cost during a fast scroll session.

**Checklist:**

- [ ] Design `StoryWindowSource` interface with both in-memory and server-fetch implementations
- [ ] Implement `computeRenderCards` server module
- [ ] Implement resource route with ETag caching
- [ ] Wire `useFetcher` prefetch triggered from `targetAltitude` (not `renderedAltitude`) so data arrives before it is needed
- [ ] Implement card merge strategy: new cards enter, existing cards update target properties only, departed cards exit

---

## Module Breakdown

Suggested boundaries inside `app/features/timeline/pixi/`:

```
motion/
  altitudeMotor.ts         — targetAltitude, renderedAltitude, smoothing, bounds, velocity cap

windowing/
  altitudeWindow.ts        — overscan logic, active story selection, direction bias

layout/
  storyPresentation.ts     — pure functions: renderedAltitude + story → StoryRenderModel
  slotAssignment.ts        — stable slot index computation for the card queue

presenters/
  storyCardPresenter.ts    — applies StoryRenderModel to a pooled card Container
  storyLinePresenter.ts    — applies StoryRenderModel to a pooled line Container

pool/
  storyPresenterPool.ts    — acquire, release, reuse Pixi nodes

JourneyPixiScene.ts        — orchestration only: wires the above, owns the ticker callback
```

`JourneyPixiTimeline.tsx` becomes a thin React wrapper that:

- Creates the Pixi app
- Wires `JourneyPixiScene`
- Forwards `altitudeRef` and resize events
- Exposes callbacks like `onStoryCardClick`
- Contains no animation logic

---

## Implementation Order

| Phase | Description | Core impact | Depends on |
|---|---|---|---|
| 1 | Split target/rendered altitude, unify wheel handling | Eliminates teleport, removes React jitter | — |
| 2 | Pure presentation function, remove state machine | Eliminates blink/vanish bug | Phase 1 |
| 3 | Altitude windowing, presenter pool, stable slots | Bounds rendering cost, prevents GC churn | Phase 2 |
| 4 | React isolation, HUD throttle, profiling | Removes re-render pressure, validates perf | Phase 3 |
| 5 | Server-windowed data via resource route | Enables large journeys, aligns with ARCHITECTURE.md | Phase 3 |

**Safest first move if starting immediately:**

1. Add `targetAltitude` beside the current altitude
2. Drive `renderedAltitude` from ticker interpolation
3. Make line and background rendering use `renderedAltitude`
4. Replace card visibility with `getStoryPresentation` for one card type
5. Verify that fast wheel bursts no longer produce blink or skip behavior

That sequence addresses the root cause before touching pooling, windowing, or server infrastructure.

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Server compute cost per `useFetcher` call | ETag caching keyed on `(journeyId, altitude, viewport)`, 30s TTL in memory |
| Card flicker when `fetcher.data` arrives mid-animation | Exponential decay interpolation absorbs target property changes smoothly — no state reset needed |
| Horizontal layout shift when card count changes | Server pre-computes `x` for the window; new `target.x` is tracked with 120ms half-life |
| Line-only and admin view regressions | Phases 1–4 target the card view path; line-only rendering keeps its simpler path until Phase 5 |
| Tab restore / frame stall jump | Frame cap on `renderedAltitude` step prevents a large accumulated delta from appearing as a single jump |

---

## Testing and Instrumentation

**Unit tests — add before the broad refactor:**

- Large wheel impulse crossing both `startPoint` and `endPoint` does not push `getStoryPresentation` into invalid state
- Altitude motor converges to `targetAltitude` monotonically within bounds
- Windowing returns the same active story set regardless of whether altitude arrives in one large jump or several small steps
- Slot assignment is stable for unchanged active story sets
- Scrolling upward through an altitude band is the symmetric inverse of scrolling downward

**Debug overlay — add early, keep permanently in dev:**

- `targetAltitude` and `renderedAltitude` displayed live
- Active story count
- Pooled presenter count (acquired vs available)
- Window bounds (visibleStart, visibleEnd)
- Current travel direction and overscan values

**Debug log from the new layout layer:**

Record story enter and exit decisions from `getStoryPresentation`, not from animation phase transitions. This makes it easy to verify the pure function is producing correct output without needing to trace through a state machine.

---

## Acceptance Criteria

- Fast wheel bursts do not cause story cards to blink in and out within a single visible moment
- A short story whose altitude span is crossed in one wheel burst still becomes visible because `renderedAltitude` interpolates through its band
- Scrolling upward and downward produces symmetric, reversible behavior with no special-case handling
- The number of live Pixi story nodes remains bounded near the viewport window regardless of total story count
- No card node destruction or recreation occurs during normal scrolling
- The scene remains smooth with a large journey dataset because work scales with window size, not total item count

---

## Non-Goals

- Do not add more special-case transitions to the current state machine — it is being deleted, not extended
- Do not make Pixi responsible for domain decisions like story visibility windows
- Do not introduce server windowing infrastructure before the client-side animation model is correct — Phase 5 requires Phase 3 to be stable first
- Do not enable every Pixi optimization by default — application-level windowing is the primary scalability tool; Pixi-level culling flags are only added after profiling shows GPU-bound rendering
