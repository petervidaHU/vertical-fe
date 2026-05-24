# Epic + Story JSON Generator Prompt

You are generating import JSON for a timeline journey admin tool.

Output must be valid JSON only, with this exact root shape:

{
  "epics": [ ... ],
  "stories": [ ... ]
}

Do not include markdown fences. Do not include comments. Do not include extra top-level properties.

## Domain meaning

- An epic is a major thematic segment on a journey timeline (usually broad, strategic, and long-range).
- A story is a concrete item that appears on the timeline and is tied to a position range.
- Story types:
  - CARD: rich card-style story content (can include image and background).
  - LINE: lightweight marker/checkpoint style story represented by line settings.

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
- background: optional, same format as epic background.
- imageUrl: string, optional.
- lineColor: string, optional.
- lineWidth: integer, optional, must be between 1 and 64.
- lineLabel: string, optional.
- tooltipText: string, optional.
- tooltipImageUrl: string, optional.
- startPoint: integer, required, >= 0.
- endPoint: integer, required, >= 0 and must be >= startPoint.

## Output quality rules

- Return at least 1 epic and at least 1 story unless asked otherwise.
- Keep ranges realistic and mostly coherent with progression.
- Use CARD for narrative entries, LINE for milestone/checkpoint markers.
- Keep text concise and production-safe.
- Ensure final output is strict JSON parsable by JSON.parse.

## Example output structure (adapt content, keep shape)

{
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
