# How a Scrolling Journey Works — React Router v7 Architecture

## Core Concept

A **journey** is a vertical, infinite-scroll experience where the user navigates upward through a series of **stories** grouped into **epics**. The position is tracked with a virtual unit called **altitude** — a number starting at `0` that grows as the user scrolls up.

There is no standalone backend. All server-side logic runs inside React Router v7 **loaders** and **actions** — Node.js code that executes on the server, queries the database directly, and returns pre-calculated render-ready data to the client. The client (PixiJS canvas) only receives exactly what it needs to draw.

---

## Content Model

```
Journey
 └── Epic 1  (startPoint: 0 → endPoint: 3000)
 │    ├── Story A  (startPoint: 0,   endPoint: 300)
 │    ├── Story B  (startPoint: 400, endPoint: 700)
 │    └── Story C  (startPoint: 900, endPoint: 1200)
 └── Epic 2  (startPoint: 3000 → endPoint: 7000)
      ├── Story D  (startPoint: 3100, endPoint: 3500)
      └── ...
```

### Story
A single task, milestone or event. Fields: `id`, `title`, `description`, `startPoint`, `endPoint`.

### Epic
A named chapter spanning an altitude range. Active when the user's altitude is within `startPoint`–`endPoint`.

### PixiJS RenderCard
The **server computes** a `RenderCard` from each story before sending it to the client. It contains everything PixiJS needs to draw the card — no calculations left to the client.

```ts
interface RenderCard {
  id: string;
  title: string;
  description: string;
  // Pre-calculated PixiJS layout values
  y: number;           // canvas Y position (startPoint - altitude, inverted)
  alpha: number;       // 0–1 based on distance from viewport center
  scale: number;       // shrinks cards near the edge of the window
  epicColor: number;   // hex color inherited from parent epic
  isPassed: boolean;   // altitude > endPoint
}
```

---

## Server / Client Boundary

```
┌─────────────────────────────────┐      ┌────────────────────────────────┐
│          SERVER (Node.js)       │      │        CLIENT (Browser)        │
│                                 │      │                                │
│  Loader / Resource Route        │      │  PixiJS Canvas                 │
│  ─ DB query (windowed)          │─────▶│  ─ receives RenderCards[]      │
│  ─ compute y, alpha, scale      │      │  ─ draws sprites, no math      │
│  ─ assign epic colors           │      │                                │
│  ─ mark passed stories          │      │  useWheelAltitude (hook)       │
│                                 │      │  ─ tracks altitude locally     │
│  DB credentials never           │      │  ─ triggers fetcher on scroll  │
│  leave this boundary            │      │                                │
└─────────────────────────────────┘      └────────────────────────────────┘
```

The **only state that lives on the client** is the current altitude and pace. Everything else is derived on the server per request.

---

## Route Structure

### UI Routes

| Route | File | Purpose |
|-------|------|---------|
| `/journey` | `routes/journey._index.tsx` | List of all journeys (loader fetches from DB) |
| `/journey/:id` | `routes/journey.$id.tsx` | PixiJS canvas, receives initial RenderCards from loader |
| `/list` | `routes/list.tsx` | Flat, non-canvas story list |
| `/admin` | `routes/admin.tsx` | CRUD for journeys, epics, stories |
| `/documentation` | `routes/documentation.tsx` | In-app docs |

### Resource Routes (API-only, no component export)

| Route | File | Purpose |
|-------|------|---------|
| `GET /api/journey/:id/window?altitude=N` | `routes/api.journey.$id.window.ts` | Returns `RenderCard[]` for the requested altitude window |
| `GET /api/journey/:id/meta` | `routes/api.journey.$id.meta.ts` | Returns epic list, `endOfTheWorld`, `lastId` |

Resource routes have **no default export**. They are pure server functions called by `useFetcher` during scrolling.

---

## Initial Page Load — Loader

When the user navigates to `/journey/:id`, the route loader runs on the server:

```ts
// app/routes/journey.$id.tsx
export async function loader({ params }: Route.LoaderArgs) {
  const journey = await db.journey.findUnique({ where: { id: params.id } });
  const meta = await db.epic.findMany({ where: { journeyId: params.id } });
  const initialCards = await computeRenderCards({
    journeyId: params.id,
    altitude: 0,
    viewportHeight: 800,  // default SSR assumption
  });

  return { journey, meta, initialCards };
}
```

The component receives `initialCards` already calculated — PixiJS starts rendering immediately, no client-side fetch on mount.

---

## Scroll → Prefetch — useFetcher

While the user scrolls, the client tracks altitude locally (fast, no network). When the prefetch threshold is crossed, `useFetcher` calls the resource route:

```ts
// app/routes/journey.$id.tsx  (client component)
const fetcher = useFetcher<typeof windowLoader>();

// triggered by useAltitudePrefetchTrigger
useEffect(() => {
  if (shouldPrefetch) {
    fetcher.load(`/api/journey/${id}/window?altitude=${altitude}`);
  }
}, [altitude, shouldPrefetch]);

// new cards arrive via fetcher.data — hand off to PixiJS
useEffect(() => {
  if (fetcher.data) {
    pixiScene.updateCards(fetcher.data.cards);
  }
}, [fetcher.data]);
```

The resource route runs the same `computeRenderCards` server function, returns `RenderCard[]`, and the client passes them directly to PixiJS — no transformation.

---

## Server-Side computeRenderCards

This is where all layout math lives — once, on the server:

```ts
// app/server/journey.ts
export async function computeRenderCards({
  journeyId,
  altitude,
  viewportHeight,
  window = 2000,
}: ComputeOptions): Promise<RenderCard[]> {
  const stories = await db.story.findMany({
    where: {
      journeyId,
      startPoint: { gte: altitude - window, lte: altitude + window },
    },
    include: { epic: true },
    orderBy: { startPoint: 'asc' },
  });

  return stories.map((story) => ({
    id: story.id,
    title: story.title,
    description: story.description,
    y: story.startPoint - altitude,
    alpha: computeAlpha(story, altitude, viewportHeight),
    scale: computeScale(story, altitude, viewportHeight),
    epicColor: story.epic.color,
    isPassed: altitude > story.endPoint,
  }));
}
```

---

## Client: What the Hooks Do

With layout logic moved to the server, the hooks become thin and focused:

### useWheelAltitude
Unchanged — converts `wheel` events to altitude deltas. Pure client math, no server involvement.

### useAltitudePrefetchTrigger
Simplified — no longer needs to inspect story/epic counts. Fires when the current altitude is within `PREFETCH_THRESHOLD` units of the last loaded card's `startPoint`, and `endOfTheWorld` has not been reached.

### No more useTimelineScroll
The old `useTimelineScroll` combined altitude tracking, prefetch logic, API calls, and viewport filtering into one hook. This is now split across its natural owners:

| Old responsibility | New home |
|---|---|
| `wheel` → altitude | `useWheelAltitude` (unchanged) |
| Should prefetch? | `useAltitudePrefetchTrigger` (simplified) |
| Fetch stories/epics | `useFetcher` (inline in route component) |
| Filter visible stories | `computeRenderCards` on the server |
| Compute card positions | `computeRenderCards` on the server |

The route component wires these three primitives together directly — no god-hook needed.

---

## Data Flow: Full Picture

```
Initial navigation to /journey/:id
  │
  └── loader() runs on server
        ├── query DB for journey meta
        ├── computeRenderCards(altitude=0)
        └── return { journey, meta, initialCards }
              │
              ▼
        PixiJS canvas bootstrapped with initialCards
        endOfTheWorld + lastCardStartPoint stored in component state

────────────────────────────────────────────────────────────────

User scrolls up (client only, no network)
  │
  └── useWheelAltitude → altitude++
        │
        ├── PixiJS moves existing sprites (local, instant)
        │
        └── useAltitudePrefetchTrigger fires?
              │  YES
              ▼
        useFetcher.load(`/api/journey/:id/window?altitude=N`)
              │
              └── resource route runs on server
                    ├── computeRenderCards(altitude=N)
                    └── return { cards: RenderCard[] }
                          │
                          ▼
                    pixiScene.updateCards(cards)
                    (server-calculated positions, just draw)
```

---

## Database Schema

```
Journey
  id          string   (slug, e.g. "my-product-roadmap")
  name        string
  createdAt   datetime

Epic
  id          string
  journeyId   string   → Journey.id
  title       string
  color       number   (hex, e.g. 0x4ecdc4)
  startPoint  number
  endPoint    number

Story
  id          string
  journeyId   string   → Journey.id
  epicId      string   → Epic.id
  title       string
  description string
  startPoint  number
  endPoint    number
```

DB access lives exclusively in `app/server/` — imported only inside loaders and actions. Never imported in client-side code and never included in the browser bundle (Vite's SSR boundary enforces this).

---

## Key Design Decisions

- **Server owns all layout math** — altitude-to-pixel, alpha, scale, color. PixiJS is a dumb renderer: it receives a list of positioned, styled cards and draws them.
- **Loaders for initial render** — first screenful arrives with the HTML, no loading spinner on entry.
- **useFetcher for scroll updates** — lightweight, non-blocking. Multiple in-flight requests are possible if the user scrolls fast; the last response wins.
- **Altitude stays on the client** — changes 60× per second. Only threshold crossings cause network calls.
- **No standalone backend** — DB credentials, query logic, and render computation are all server-side within the same React Router app. Single deploy, zero CORS.
- **PixiJS on `/journey/:id` only** — other routes (`/list`, `/admin`) use plain Mantine components. PixiJS is not loaded globally.
