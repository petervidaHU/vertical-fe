# PixiJS Timeline Refactoring Guide

## Overview
This guide explains the new modular architecture for the PixiJS timeline renderer and how to migrate from the monolithic `JourneyPixiTimeline.tsx` to reusable components and utilities.

## New Directory Structure

```
app/features/timeline/pixi/
├── JourneyPixiTimeline.tsx          # Main component (entry point)
├── utils/                            # Reusable utilities
│   ├── index.ts                      # Exports all utilities
│   ├── math.ts                       # Math functions (lerp, clamp01, rotatePoint, etc.)
│   ├── color.ts                      # Color utilities (parseColor, colorNumberToRgb, etc.)
│   ├── text.ts                       # Text utilities (formatAltitude, fitTextToWidth, etc.)
│   └── graphics.ts                   # Graphics drawing utilities (drawCardLiftShadow, drawGradientRect, etc.)
├── icons/                            # Reusable icon library
│   ├── index.ts                      # Exports all icons
│   └── chevron.ts                    # Chevron icon (used in cards, epics, multiplier)
├── components/                       # Reusable UI components (planned)
│   ├── CardNode/
│   └── LineNode/
├── ui-elements/                      # Reusable UI elements (planned)
└── ... (existing motion/, layout/, debug/ directories)
```

## Migration Steps

### Step 1: Use New Utilities in JourneyPixiTimeline.tsx

Replace imports and function definitions with the new utilities:

```typescript
// OLD: Functions defined locally in the file
function lerp(a: number, b: number, t: number): number { ... }
function drawChevronIcon(graphics: Graphics, options: {...}): void { ... }

// NEW: Import from utilities
import { lerp, clamp01, rotatePoint, smoothstep } from "./utils/math";
import { parseColor, colorNumberToRgb, rgbToColorNumber, mixColorNumbers } from "./utils/color";
import { formatAltitude, fitTextToHeight, fitTextToWidth, truncateText } from "./utils/text";
import { drawChevronIcon, type ChevronIconOptions } from "./icons";
import { drawCardLiftShadow, drawGradientRect, sampleGradientColor } from "./utils/graphics";
```

### Step 2: Create Reusable Components

Extract card and line node creation into separate component files:

```typescript
// app/features/timeline/pixi/components/CardNode.ts
export function createCardNode(story: StoryItem, options: CardNodeOptions): CardNodeInstance {
  // Card creation logic extracted from JourneyPixiTimeline.tsx
  // Returns { container, story, onRender, cleanup }
}

// app/features/timeline/pixi/components/LineNode.ts
export function createLineNode(story: StoryItem, options: LineNodeOptions): LineNodeInstance {
  // Line creation logic extracted from JourneyPixiTimeline.tsx
}
```

### Step 3: Build UI Element Library

Extract common UI patterns:

```typescript
// app/features/timeline/pixi/ui-elements/RoundedRectButton.ts
export function createRoundedRectButton(options: ButtonOptions): Graphics { ... }

// app/features/timeline/pixi/ui-elements/GradientFill.ts
export function createGradientFill(options: GradientFillOptions): Graphics { ... }
```

## Key Benefits

1. **Reusability** - Chevron icon can be used across story cards, epic cards, multiplier selector
2. **Maintainability** - Utilities are isolated and easier to test/modify
3. **Consistency** - Shared color mixing, text fitting, and math functions ensure consistency
4. **Testability** - Utilities can be unit tested independently
5. **Code Organization** - Clear separation of concerns

## Current Status

✅ **Completed:**
- Math utilities (`utils/math.ts`)
- Color utilities (`utils/color.ts`)
- Text utilities (`utils/text.ts`)
- Graphics utilities (`utils/graphics.ts`)
- Chevron icon library (`icons/chevron.ts`)
- Chevron hover effect with glow in `JourneyPixiTimeline.tsx`

⏳ **Planned:**
- Migrate `JourneyPixiTimeline.tsx` to use new utilities
- Extract `CardNode` component
- Extract `LineNode` component
- Extract `EpicPanel` component
- Create UI element library
- Add unit tests for utilities and components

## Usage Examples

### Using Math Utilities
```typescript
import { lerp, clamp01, rotatePoint } from "./utils/math";

const progress = lerp(0, 1, 0.5);           // 0.5
const clamped = clamp01(1.5);               // 1
const rotated = rotatePoint(x, y, cx, cy, Math.PI / 2);
```

### Using Chevron Icon
```typescript
import { drawChevronIcon } from "./icons";

drawChevronIcon(graphics, {
  x: 100,
  y: 100,
  size: 24,
  progress: 0.5,  // 0 = down, 1 = up
  color: 0x8b7d72,
  alpha: 0.7,
  hovered: isHovered,
  glowColor: 0xa89968,
});
```

### Using Graphics Utilities
```typescript
import { drawCardLiftShadow, drawGradientRect } from "./utils/graphics";

drawCardLiftShadow(shadowGraphic, {
  shellX: 28,
  shellWidth: 380,
  shellHeight: 146,
  imageX: 0,
  imageY: 14,
  imageSize: 118,
  imageRadius: 10,
  offsetX: 0,
  offsetY: 8,
  spread: 16,
  softAlpha: 0.1,
  coreAlpha: 0.2,
  hasImage: true,
});

drawGradientRect(graphics, {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  stops: [
    { color: 0xff0000, percentage: 0 },
    { color: 0x0000ff, percentage: 100 },
  ],
  alpha: 0.9,
  steps: 32,
});
```

## Next Steps

1. Update imports in `JourneyPixiTimeline.tsx` to use new utilities
2. Verify all tests pass
3. Extract card and line node creation into components
4. Add unit tests for utilities
5. Document component APIs
