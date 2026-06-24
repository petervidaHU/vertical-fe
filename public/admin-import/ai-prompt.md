# Altitude Info + Epic + Story JSON Generator Prompt

You are generating import JSON for a timeline journey admin tool.

Output must be valid JSON only, with this exact root shape:

{
  "altitudeInfos": [ ... ],
  "epics": [ ... ],
  "stories": [ ... ]
}

Do not include markdown fences. Do not include comments. Do not include extra top-level properties.

## Translations (optional)

Any altitudeInfo, altitudeInfo value, epic, or story may include an optional `translations`
object for multilingual content. Keys are locale codes; the source language ("en") always
lives in the base fields and must NOT be repeated under `translations`. Only include
non-English locales (currently "hu"). Each locale object contains the same translatable
text fields as the entity (e.g. epics: `title`, `description`; stories: `title`,
`description`, `extraContent`, `lineLabel`, `tooltipText`; altitude info: `title`; altitude
value: `value`). Blank/missing fields fall back to the English source. Example:

  { "title": "Approach", "startPoint": 0, "endPoint": 120, "translations": { "hu": { "title": "Megközelítés", "description": "" } } }

## Domain meaning

- Altitude info is persistent environmental or system information tied to altitude ranges, independent from epics and stories.
- An epic is a major thematic segment on a journey timeline (usually broad, strategic, and long-range).
- A story is a concrete item that appears on the timeline and is tied to a position range.
- Story types:
  - CARD: rich card-style story content (can include image and background).
  - LINE: lightweight marker/checkpoint style story represented by line settings.

## Altitude info properties

Each altitude info object supports:
- title: string, required, non-empty. Long label shown in the hover tooltip.
- icon: string, optional icon key. Available keys:
  - "thermometer"
  - "wind"
  - "oxygen"
  - "droplet"
  - "sun"
  - "snowflake"
  - "gauge"
  - "leaf"
  - "warning"
  - "info"
- order: integer, optional. Lower numbers render first.
- values: array, required, at least one item. Each item supports:
  - value: string, required. Example: "12 C" or "7.2 mol/m3".
  - startPoint: integer, required, >= 0.
  - endPoint: integer, required, >= 0 and must be >= startPoint.

Rules for altitude info values:
- Value bands inside the same altitude info series must not overlap.
- Gaps are allowed.
- Use multiple value bands when the displayed value changes with altitude.

- tags: string array, optional. 3-100 characters per tag, max 20 tags per item.
  Tags help users filter altitude info series by topic.
  Example tags: "climate", "science", "survival", "basics".

## Epic properties

Each epic object supports:
- title: string, required, non-empty.
- startPoint: integer, required, >= 0.
- endPoint: integer, required, >= 0 and must be >= startPoint.
- background: optional, one of:
  - hex color string, e.g. "#4ecdc4"
  - color object: { "mode": "color", "color": "#4ecdc4" }
  - gradient object: {
      "mode": "gradient",
      "stops": [
        { "color": "#4ecdc4", "percentage": 0 },
        { "color": "#0c1626", "percentage": 100 }
      ]
    }

## Story properties

Each story object supports:
- title: string, required, non-empty.
- description: string, optional.
- extraContent: string, optional (HTML or plain text).
- storyType: "CARD" | "LINE", optional (default "CARD").
- imageUrl: string, optional.
- lineColor: string, optional.
- lineWidth: integer, optional, must be between 1 and 64.
- lineLabel: string, optional.
- tooltipText: string, optional.
- tooltipImageUrl: string, optional.
- startPoint: integer, required, >= 0.
- endPoint: integer, required, >= 0 and must be >= startPoint.
- tags: string array, optional. 3-100 characters per tag, max 20 tags per item.
  Tags help users filter stories by topic. Use consistent tag names across related stories and altitude info.
  Example tags: "history", "biology", "geography", "culture", "planning", "milestones".

## Output quality rules

- Return arrays for altitudeInfos, epics, and stories.
- Return at least one meaningful item overall unless asked otherwise.
- Keep ranges realistic and mostly coherent with progression.
- Use CARD for narrative entries, LINE for milestone/checkpoint markers.
- Keep text concise and production-safe.
- Ensure final output is strict JSON parsable by JSON.parse.
- Suggest relevant tags (3-100 character names) for stories and altitude info.
- Use consistent tag names across related items (e.g., assign "climate" to both temperature altitude info and climate-related stories).
- Maximum 20 unique tag names per journey preferred, but each item can have up to 20 tags.
- Apply same tags to related stories and altitude info so users can filter by topic.

## Example output structure (adapt content, keep shape)

{
  "altitudeInfos": [
    {
      "title": "Temperature",
      "icon": "thermometer",
      "order": 0,
      "tags": ["climate", "basics"],
      "values": [
        {
          "value": "18 C",
          "startPoint": 0,
          "endPoint": 120
        }
      ]
    }
  ],
  "epics": [
    {
      "title": "Epic Name",
      "startPoint": 0,
      "endPoint": 120,
      "background": "#4ecdc4"
    }
  ],
  "stories": [
    {
      "title": "Story Name",
      "storyType": "CARD",
      "description": "Short description",
      "tags": ["planning", "basics"],
      "startPoint": 10,
      "endPoint": 40
    },
    {
      "title": "Checkpoint",
      "storyType": "LINE",
      "lineColor": "#4ecdc4",
      "lineWidth": 4,
      "lineLabel": "Checkpoint 1",
      "tooltipText": "Reached checkpoint",
      "startPoint": 60,
      "endPoint": 60
    }
  ]
}
