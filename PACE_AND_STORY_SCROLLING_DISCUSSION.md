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

## Design Conclusion

Manual scrolling and travel pace should be decoupled.

### Recommendation

Keep manual wheel and trackpad behavior constant at every setting.

If the product wants a faster pace concept, attach it to assisted travel, not to wheel sensitivity.

In practice that means:

- wheel input should always use the same base scroll behavior
- pace should affect only explicit assisted movement modes
- any assisted fast movement must become story-aware

---

## Recommended Product Model

### Manual Scroll

Manual scroll should always behave the same.

- one wheel gesture should always produce the same altitude delta
- smoothing can remain, but only for normal micro-latency smoothing, not for absorbing huge pace-scaled jumps
- this preserves muscle memory and removes the autoplay feeling

### Assisted Travel

If we still want a notion of pace, it should represent assisted travel speed. Examples:

- press-and-hold on a dedicated up or down control
- keyboard hold behavior
- an autoplay or cruise mode
- dragging the altitude rail while the system optionally animates to checkpoints

This matches the meaning of pace much better than multiplying the wheel.

### Naming

If the current control remains tied to wheel distance, it should be renamed to something like:

- `Jump size`
- `Scroll step`
- `Altitude step`

If the product intent is really pace, the better rename is:

- `Travel mode`
- `Cruise speed`
- `Auto travel pace`

---

## Story Scrolling: How To Handle Fast Travel

This is the core design question.

If movement can ever be faster than manual wheel cadence, the system must not rely only on what happened to be visible on screen in a single frame. It should explicitly detect which stories were crossed.

### Principle

For any movement segment from `previousAltitude` to `nextAltitude`, treat stories as encountered if that segment intersects the story visibility band.

The visibility band already exists in `storyPresentation.ts`:

- `entryStart`
- `activeEnd`
- `exitEnd`

That is a good basis because it is broader than the raw story span and already encodes the user-facing display window.

### Encounter Detection Rule

For each story:

- compute its visibility band
- compute the traveled altitude segment
- if the segment intersects `[entryStart, exitEnd]`, mark the story as crossed

Conceptually:

```ts
const travelMin = Math.min(previousAltitude, nextAltitude);
const travelMax = Math.max(previousAltitude, nextAltitude);

const crossed = stories.filter((story) => {
  const band = getStoryVisibilityBand(story);
  return travelMax >= band.entryStart && travelMin <= band.exitEnd;
});
```

This is the minimum reliable logic for not losing short stories.

---

## What Should Happen When A Story Is Crossed?

There are several viable behaviors.

### Option A: Log crossed stories only

Behavior:

- do not interrupt movement
- add crossed stories to a recent or encountered queue
- let the user review them after the fast movement

Pros:

- minimal friction
- easiest to implement on top of the existing recent stories concept

Cons:

- users can still miss the moment in context
- line stories may feel too easy to miss even if they are logged

### Option B: Temporary slowdown near crossed stories

Behavior:

- assisted travel can run fast in empty altitude ranges
- when entering a story visibility band, reduce motor speed automatically

Pros:

- preserves overview travel while still giving stories time on screen
- feels intentional if tuned well

Cons:

- complexity in the altitude motor
- risk of feeling sticky or inconsistent if story density is high

### Option C: Snap to meaningful checkpoints

Behavior:

- fast travel moves between story or epic checkpoints
- movement pauses briefly at stories or dense clusters

Pros:

- strongest guarantee that content is not skipped
- useful for keyboard or autoplay modes

Cons:

- less freeform
- can feel heavy-handed for manual exploration

### Option D: Hybrid model

Behavior:

- card stories trigger slowdown or optional snap
- line stories are always logged in an encounter queue
- dense regions collapse into a grouped summary instead of stopping on every single item

Pros:

- best balance between continuity and discoverability

Cons:

- requires slightly more product design

### Recommended Choice

Use a hybrid model.

- Manual scroll: no special pace logic, same behavior always.
- Assisted fast travel: detect crossed stories.
- Card stories: optional adaptive slowdown or soft checkpointing.
- Line stories: always capture in a crossed-story queue, because they are the easiest to miss.
- Dense regions: collapse multiple crossed stories into a cluster summary instead of multiple hard stops.

---

## Proposed Refactor Direction

### 1. Remove multiplier from wheel sensitivity

Refactor `useWheelAltitude` usage so wheel delta is not multiplied by the selected pace.

Possible direction:

- keep a constant `MANUAL_SCROLL_DISTANCE_METERS`
- use that for wheel and trackpad input regardless of selected pace
- keep the current control value out of the wheel path entirely

This is the single most important semantic change.

### 2. Re-scope the current control

Replace the current multiplier meaning with one of these:

- assisted travel speed
- rail drag inertia preset
- keyboard hold speed
- future autoplay speed

If no assisted travel mode ships now, it is better to remove the control than to keep a misleading one.

### 3. Add a crossed-story detector

Create a domain utility that answers:

- which stories were crossed between two altitude samples
- which of those are cards versus lines
- whether the crossed set is sparse or dense

Suggested file:

- `app/features/timeline/domain/crossedStories.ts`

Inputs:

- `previousAltitude`
- `nextAltitude`
- `stories`

Outputs:

- `crossedStories`
- `crossedCardStories`
- `crossedLineStories`
- maybe `clusters`

### 4. Evolve the recent-stories model into an encounter model

`recentStories.ts` is useful, but it currently answers a narrower question: "what stories are now behind the current altitude?"

That is not enough for fast travel.

A better model is:

- `recentPassedStories`: derived from current altitude for passive UI
- `crossedStories`: derived from the last movement segment for guaranteed encounter capture

The recent tray can then be fed by crossed stories instead of only by final altitude state.

### 5. Keep the motor, but only for presentation smoothing

`stepAltitudeMotor(...)` is still valuable.

The change is not "remove smoothing." The change is:

- stop feeding it pace-inflated wheel jumps
- use it for smooth rendering of normal input
- if assisted travel is added later, give it explicit speed rules rather than overloading wheel pace

### 6. Consider separate policies for cards and line stories

Cards and lines are not equivalent.

- cards are larger and can support soft slowdown or checkpoint behavior
- line stories are subtle and should always be captured as encounters when crossed

This difference should be explicit in the domain logic, not an accidental side effect of rendering.

---

## Suggested Refactor Phases

### Phase 1: Semantic cleanup

- remove pace from wheel scaling
- keep wheel behavior constant
- decide whether to rename or temporarily remove the current UI control

### Phase 2: Crossed-story detection

- add segment-based crossed story detection
- integrate it with the existing recent stories tray or modal
- ensure short line stories are captured reliably

### Phase 3: Assisted travel mode

- introduce a separate assisted travel concept if still desired
- pace affects only assisted movement
- add slowdown or checkpoint behavior around crossed stories

### Phase 4: Density-aware handling

- cluster multiple crossed stories in dense altitude bands
- define whether the system slows once per cluster or simply logs them

---

## Open Product Questions

These need product decisions before implementation details are finalized.

1. Do we still want a pace control if there is no assisted travel mode yet?
2. Should fast travel be explicit, such as a play or hold control, instead of implicit on wheel input?
3. When a card story is crossed during assisted travel, should the system:
   - slow down,
   - snap briefly,
   - or only log it?
4. Should line stories ever interrupt movement, or should they always be passive encounters?
5. In dense regions, do we want grouped summaries rather than one-by-one stops?
6. Should the recent stories tray become the primary fallback for missed stories?

---

## Recommended Next Step

If we want the cleanest immediate improvement with minimal product risk:

1. Remove multiplier influence from wheel input.
2. Keep the current smoothing motor.
3. Re-label or temporarily hide the pace control.
4. Add crossed-story detection as a domain utility.
5. Feed crossed line stories into the recent stories UI first.

That gives us a much more honest manual scroll interaction immediately, while leaving room for a real pace or assisted-travel system later.