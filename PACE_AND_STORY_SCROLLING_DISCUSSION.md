# Pace And Story Scrolling Discussion

## Context

The current timeline exposes a pace or multiplier control, but the implementation behaves like a wheel-distance multiplier rather than a travel pace.

Today the relevant pieces are:

- `app/features/timeline/domain/scrollMultiplier.ts`
  - `BASE_SCROLL_DISTANCE_METERS = 100`
  - `SCROLL_MULTIPLIER_STEPS = [1, 10, 100, 1000]`
  - the UI labels are derived from physical distance: `100 m`, `1 km`, `10 km`, `100 km`
- `app/shared/hooks/useWheelAltitude.ts`
  - wheel input uses `nextScaled = currentScaled + deltaY * pace`
- `app/features/timeline/pixi/JourneyPixiTimeline.tsx`
  - the canvas does not jump directly to the new altitude
  - it smooths toward `targetAltitudeRef.current` through `stepAltitudeMotor(...)`
- `app/features/timeline/pixi/motion/altitudeMotor.ts`
  - smoothing uses a half-life based motor with a capped per-frame step
- `app/features/timeline/pixi/layout/storyPresentation.ts`
  - story visibility is already modeled as a band with entry and exit margins
- `app/features/timeline/domain/recentStories.ts`
  - recent stories are derived only from the current altitude after a story is already passed

This means the current control does two things that do not match the intended product meaning:

1. It multiplies manual wheel distance.
2. It makes the rendered altitude continue catching up after the wheel input stops.

That combination reads as automated motion, not as a user-controlled faster pace.

---

## Problem Statement

The desired behavior is:

- changing pace should not make manual wheel scrolling feel different
- changing pace should not make the altitude keep visibly drifting after the user releases the mouse in a way that feels like autoplay
- short-lived stories and line stories must not be silently skipped when travel is fast

The current behavior conflicts with all three.

---

## Why The Current Model Feels Wrong

### 1. The control is named like pace, but behaves like jump size

From the code, pace is not a travel speed. It is a multiplier applied directly to wheel delta.

That means:

- the same physical wheel gesture produces a different altitude jump
- the gesture itself changes semantics when the user switches pace
- the UI communicates speed, but the implementation changes sensitivity

This is why the control feels inconsistent.

### 2. The smoothing motor turns large wheel jumps into delayed motion

The route updates only `targetAltitudeRef.current`, while Pixi animates `renderedAltitudeRef.current` toward that target.

That architecture is generally correct, but once the target jump becomes very large because of the multiplier, the user sees:

- the counter changing immediately toward a distant target
- the rendered altitude continuing after input stops
- visual motion that feels like the system took over

The motor is not the main problem by itself. The problem is feeding it oversized target jumps from the wheel multiplier.

### 3. Story visibility becomes vulnerable when the input step is too large

Even though `storyPresentation.ts` already protects short stories with `getEffectiveStoryEndPoint(...)` and visibility margins, large jumps still create product risks:

- a short card can be crossed so quickly that it is technically encountered but not actually perceived
- a line story can be crossed between frames and never receive enough on-screen time to register
- the current `recentStories` model only knows what is behind the current altitude, not what was crossed during a fast segment

---

## Revised Constraints

The previous direction was too invasive for the product.

The revised plan should assume:

- keep the current info area and pace control
- do not add new hold-to-cruise controls
- do not introduce a new assisted-travel mode
- keep the current wheel + pace interaction model for now
- solve the skipping problem by changing target selection, not by redesigning the UI

---

## Revised Design Conclusion

Do not decouple pace from wheel input yet.

Instead, keep the current pace model and make it story-aware.

### Recommendation

When a paced wheel step would jump past the next story, clamp that step to the next story checkpoint and stop there.

That means:

- the current pace control remains in place
- the current info area remains in place
- the wheel still uses the selected pace to compute a proposed jump
- only the final target altitude is adjusted when a story would be skipped
- the system stops one story at a time, then the next wheel gesture can continue

This is a much smaller and more practical hybrid model than introducing new movement controls.

---

## New Hybrid Model: Story-Aware Paced Stops

### Core Rule

The current wheel event computes a proposed paced target exactly as it does today:

```ts
const proposedTarget = currentTarget + deltaY * pace;
```

Before committing that target, the system checks whether the movement segment would overjump the next story in the travel direction.

- if no story would be skipped, keep the proposed target
- if a story would be skipped, replace the proposed target with a stop altitude for the nearest skipped story

This preserves fast movement through empty altitude ranges, while forcing a stop only when narrative content would be lost.

### Why This Fits The Product Better

- no new UI
- no new controls
- no semantic rewrite of the pace control
- no info-area redesign
- minimal change to the interaction model users already understand

The only change is that fast paced movement becomes story-safe.

---

## What Counts As An Overjump?

The simplest useful rule is:

- determine the scroll direction
- compute the proposed paced target
- find the nearest story checkpoint between the current target altitude and the proposed target altitude
- if one exists, stop there instead of jumping farther

This is intentionally simpler than full crossed-story clustering or new autoplay logic.

### Story Checkpoint Choice

To actually show the story, the stop should land inside the active phase rather than only at the beginning of the entry animation.

Use the existing presentation helpers in `storyPresentation.ts`:

- ascending stop altitude: `story.startPoint`
- descending stop altitude: `getEffectiveStoryEndPoint(story)`

Why this works:

- `story.startPoint` is the beginning of the active phase when moving upward
- `getEffectiveStoryEndPoint(story)` respects the enforced minimum active lifespan for short stories when moving downward
- this lands the user inside a visible, stable story state rather than merely brushing the entry or exit margin

### Card And Line Stories

For the first version, both story types should use the same stop rule.

- cards need the stop because they are dense content blocks
- line stories need the stop because they are easy to miss at high pace

If line stories still feel too subtle after this, then the line checkpoint can later be nudged slightly deeper into the active band. That should be a tuning step, not part of the initial refactor.

---

## Critical Detail: The Stop Must Actually Hold

There is one important implementation nuance in the current code.

`useWheelAltitude` updates `targetAltitudeRef.current`, while Pixi renders toward that target over time.

That means a naive clamp is not enough.

If we only clamp one wheel event, repeated wheel events can still queue multiple future jumps before the rendered altitude has actually reached the first stopped story. The result would still feel like autoplay.

### Required Mechanism: Pending Story Stop

Add a route-side pending stop lock.

Conceptually:

- when a wheel event is clamped to a story checkpoint, store that checkpoint as a pending stop
- while that stop is pending and the rendered altitude has not reached it yet, do not allow further same-direction wheel input to push the target beyond it
- once the rendered altitude reaches the stop vicinity, clear the lock and let the next wheel gesture continue normally
- if the user reverses direction, clear the pending stop immediately

This is what makes the solution actually stop at the story instead of merely queuing a brief intermediate target.

---

## Suggested Algorithm

### Step 1: Compute Proposed Target

Keep the current behavior:

```ts
const proposedTarget = currentTarget + deltaY * pace;
```

### Step 2: Resolve The Next Story Stop

Add a small domain utility that finds the nearest skipped story checkpoint.

Suggested shape:

```ts
type StoryStopResolution = {
  nextTarget: number;
  didClamp: boolean;
  storyId: string | null;
  stopAltitude: number | null;
};

function resolveStoryAwareTarget(...) => StoryStopResolution
```

Inputs:

- current target altitude
- proposed paced target altitude
- rendered altitude or current displayed altitude
- direction
- filtered stories

Outputs:

- the final target to apply
- whether the target was clamped
- which story caused the clamp
- the stop altitude that should remain locked until reached

### Step 3: Apply Pending Stop Lock

Route-side logic in `journey.$id.tsx` should maintain something like:

```ts
type PendingStoryStop = {
  storyId: string;
  direction: 1 | -1;
  altitude: number;
};
```

Behavior:

- if a pending stop exists in the same direction and the rendered altitude has not reached it, keep `targetAltitudeRef.current` pinned to that stop
- if the stop has been reached, clear it
- if direction changes, clear it

### Step 4: Continue With Existing Motion System

Keep the current smoothing motor.

This plan does not require replacing `stepAltitudeMotor(...)`. The important change is to feed it smaller, story-safe targets rather than huge pace-scaled jumps that can outrun narrative content.

---

## Why This Is Still A Hybrid Model

It is hybrid because it combines two behaviors:

- fast paced scrolling in empty spaces
- automatic story-safe stopping only when content would be skipped

It does not force every movement to be slow, and it does not introduce a separate autopilot mode.

This is the simplest version of hybrid behavior that still respects the existing UI.

---

## Proposed Refactor Direction

### 1. Keep The Existing Info Area And Pace UI

Do not touch the Pixi info area or multiplier controls in `JourneyPixiTimeline.tsx`.

The refactor should happen behind that UI, not by redesigning it.

### 2. Add A Story Stop Resolver

Create a new domain utility, for example:

- `app/features/timeline/domain/storyStops.ts`

Responsibilities:

- calculate direction-aware story checkpoints
- find the nearest skipped story inside a paced jump
- return a clamped target when needed

### 3. Add A Pending Stop Lock In The Route

Implement the control logic in `app/routes/journey.$id.tsx`.

Why the route is the right place:

- it already owns `targetAltitudeRef`
- it already handles wheel input through `useWheelAltitude`
- it already receives `currentAltitude` back from Pixi via `onRenderedAltitudeChange`

This means the new logic can be added without reworking the Pixi HUD.

### 4. Keep `scrollMultiplier.ts` And `useWheelAltitude.ts`

No semantic rewrite is needed yet.

- `useWheelAltitude` still computes the paced proposal
- the route intercepts that proposal before writing the final target
- `scrollMultiplier.ts` can stay as the current pace source

### 5. Leave `recentPassedStories` Alone For The First Pass

The main fix should be stop-before-skip.

Only add encounter or crossed-story bookkeeping later if real usage shows that dense clusters still need additional fallback behavior.

---

## Suggested Refactor Phases

### Phase 1: Story Stop Resolver

- create a domain helper for nearest skipped story checkpoint
- test upward scrolling, downward scrolling, short stories, and multiple stories inside one paced step

### Phase 2: Route-Side Pending Stop Lock

- intercept `nextScaled` in `journey.$id.tsx`
- clamp to the next story stop when needed
- keep same-direction wheel input pinned until the rendered altitude reaches that stop
- clear the lock on direction change

### Phase 3: Tuning Pass

- verify whether `startPoint` and `getEffectiveStoryEndPoint(...)` are enough for both cards and lines
- if line stories still feel too easy to miss, bias line stops slightly deeper into the active span

### Phase 4: Optional Dense-Region Fallback

- only if necessary, add crossed-story bookkeeping or clustering for very dense line-story bands
- this should be a later refinement, not part of the initial refactor

---

## Open Questions

1. Is `story.startPoint` the best upward stop altitude for line stories, or should line stories stop slightly deeper in their active span?
2. What epsilon should count as "the stop has been reached" when releasing a pending lock?
3. If multiple stories share the same checkpoint altitude, should one stop be enough for all of them? Probably yes.
4. Should a pending stop clear immediately on reversed scrolling direction? Probably yes.
5. Do we need dense-region clustering at all once stop-before-skip is in place, or only if real content proves it necessary?

---

## Recommended Next Step

If we want the most direct implementation aligned with the current UI:

1. Keep the current info area and pace control exactly as they are.
2. Add a domain helper that resolves the next story-safe target for a paced jump.
3. Add a route-side pending stop lock so a fast wheel cannot queue past the next stopped story.
4. Validate upward and downward overjump cases, especially for short line stories.

This keeps the product simple: fast pace still exists, but it automatically stops at the next story instead of letting the user blow past it.