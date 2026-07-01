I'm building an interactive educational web app called **Vertical** — a scrollable journey through Earth's atmosphere (and beyond). The user scrolls the mouse wheel to ascend upward through altitude, and the scene changes as they rise. Think of it as an interactive encyclopedia organised vertically by meters above sea level.

---

### Core concepts

#### Journey
A **Journey** is the top-level container for everything. It has a name, a slug, and owns all Epics, Stories, Altitude Info, and Tags. Think of it as one "trip" through altitude — e.g. "From the Ocean Floor to the Moon".

#### Altitude
All positions are expressed as **altitude in meters** (integers). Sea level = 0. Altitude can go into the millions (space). Every piece of content is attached to an altitude range via `startPoint` and `endPoint` (both integers, meters above sea level).

Examples of reference altitudes:
- 0 m — sea level
- 200 m — low hills
- 2 000 m — mountain foothills
- 8 849 m — Mount Everest summit
- 12 000 m — cruising altitude of a commercial jet
- 50 000 m — stratosphere boundary
- 100 000 m — Kármán line (official edge of space)
- 400 000 m — ISS orbit
- 384 400 000 m — Moon

#### Epic
An **Epic** is a large, named segment of the journey that occupies a continuous altitude range. It gives the reader a sense of "chapter" — it has a title, description, a dominant color, and a background (solid color, gradient, image, or pattern). Epics do **not** carry detailed facts; they set the scene.

**Epic schema (fields you can populate):**

```json
{
  "title": "string — the chapter name, e.g. 'The Troposphere'",
  "description": "string — 1–3 sentence overview shown in the epic panel",
  "color": "string — hex color that represents this epic, e.g. '#4ecdc4'",
  "background": {
    "mode": "color | gradient | image | pattern",
    "color": "#hex (for mode=color)",
    "gradient": { "from": "#hex", "to": "#hex", "direction": "vertical|horizontal" }
  },
  "startPoint": "integer — altitude in meters where this epic begins",
  "endPoint":   "integer — altitude in meters where this epic ends"
}
```

#### Story
A **Story** is a specific piece of information anchored to an altitude (or altitude range). There are two types:

- **CARD** — displayed as a floating info card attached to an altitude *zone* (`startPoint`–`endPoint`). Has a title, description, optional image, and optional rich `extraContent` HTML. The card appears while the reader is inside that altitude zone.
- **LINE** — a labeled horizontal line drawn at a specific altitude. Used for pinpoint events ("Concorde's service ceiling", "Ozone layer peak"). For a LINE, `startPoint` and `endPoint` are usually the same value or a very narrow range.

**Story schema (fields you can populate):**

```json
{
  "title": "string — headline of the story",
  "description": "string — 1–4 sentence body copy",
  "extraContent": "string — optional longer HTML content",
  "storyType": "CARD | LINE",
  "startPoint": "integer — altitude in meters (start of the zone or exact altitude)",
  "endPoint":   "integer — altitude in meters (end of the zone; same as startPoint for a line)",
  "imageUrl": "string | null — URL of an illustration or photo",
  "lineColor": "string — hex color for the line (LINE type only), e.g. '#ff6b6b'",
  "lineLabel": "string — short label shown on the line (LINE type only), e.g. 'Ozone peak'",
  "tooltipText": "string — short tooltip shown on hover (LINE type only)",
  "tags": ["array of tag name strings that classify this story"]
}
```

#### Tag
A **Tag** is a simple label used to filter content. Users can activate/deactivate tags to show only relevant stories and altitude info. Tags are scoped to a Journey.

**Tag schema:**
```json
{ "name": "string — short lowercase label, e.g. 'biology'" }
```

---

### Suggested tags

Here is a starter set of tags you can reference or extend:

| Tag | What it filters |
|-----|----------------|
| `biology` | Living organisms, extremophiles, bacteria at altitude |
| `clouds` | Cloud types, formation altitudes, cloud layers |
| `temperature` | How air temperature changes with altitude |
| `pressure` | Atmospheric pressure, boiling point changes |
| `aviation` | Aircraft, flight envelopes, contrails |
| `weather` | Storms, jet streams, weather phenomena |
| `ozone` | Ozone layer formation and depletion |
| `radiation` | UV, cosmic rays, radiation exposure |
| `astronomy` | Stars, planets, telescopes, observations |
| `human-limits` | Hypoxia, pressure suits, survival limits |
| `military` | High-altitude reconnaissance, spy planes |
| `rockets` | Launch vehicles, staging altitudes |
| `satellites` | Orbits, ISS, GPS, communication satellites |
| `space-exploration` | Missions, history, milestones |
| `geography` | Mountains, peaks, terrain features |
| `physics` | Sound propagation, gravity, atmospheric physics |
| `history` | Historical records, first ascents, milestones |

---

### What I need from you

I will now ask you to generate **Epics** and **Stories** for this journey. Please produce JSON objects that match the schemas above, with realistic altitude values and accurate scientific content. When generating Stories, always assign appropriate tags from the list above (or propose new ones if clearly needed).

Ready — I'll give you the next instruction now.
