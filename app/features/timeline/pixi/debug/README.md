# PixiJS Timeline Debug Logger

A loosely-coupled debugging system for the PixiJS timeline component. Designed to be easily removed from production without touching your code.

## Quick Start

### Enable the Logger

In your browser console:
```javascript
__PIXI_TIMELINE_LOGGER__.setEnabled(true)
```

### View All Logs (formatted)
```javascript
__PIXI_TIMELINE_LOGGER__.dumpLogs()
```
This will:
1. Print formatted logs to console
2. Automatically copy logs to clipboard

### Manual Copy
```javascript
__PIXI_TIMELINE_LOGGER__.exportLogs()
```
Returns formatted log string you can copy manually

### Clear Logs
```javascript
__PIXI_TIMELINE_LOGGER__.clearLogs()
```

### Check Log Count
```javascript
__PIXI_TIMELINE_LOGGER__.getLogCount()
```

## Features

The logger tracks:
- **MOVEMENT**: Card/line position, scale, alpha, rotation changes
- **HOVER**: Hover amount changes for each story
- **ALTITUDE**: Altitude changes and target altitude
- **IMAGE_LOAD**: Image loading success/failure with URLs
- **EVENT_***: Custom events (POINTERDOWN, HOVER, etc.)

## Example Log Output

```
=== PIXI Timeline Debug Logs ===

--- story-123 ---
[1234.56ms] MOVEMENT: {"x":100,"y":200,"scale":1.5,"alpha":0.9}
[1235.67ms] HOVER: {"hoverAmount":0.25}
[1236.78ms] IMAGE_LOAD: {"imageUrl":"https://...",  "success":true}

--- GLOBAL ---
[1234.00ms] ALTITUDE: {"current":5000,"target":5500}
```

## Integration Notes

- **Loosely-coupled**: All logging is wrapped in a dedicated module that's not part of production code
- **Memory-safe**: Keeps only last 1000 logs to prevent memory bloat
- **Zero overhead when disabled**: All functions check `enabled` flag first
- **Easy removal**: Delete the import line and logger calls - no breaking changes

## Production Deployment

To remove from production:
1. Set `DEBUG_ENABLED = false` in `pixi-timeline-logger.ts`
2. Or delete the import statement from `JourneyPixiTimeline.tsx`
3. TypeScript compiler will tree-shake unused code

## How It Works

```typescript
// All logging is optional and disabled by default
if (!this.enabled) return;

// Logs are stored in memory (last 1000 entries)
this.logs.push(entry);
if (this.logs.length > 1000) {
  this.logs = this.logs.slice(-1000);
}

// Available in global scope for browser console access
__PIXI_TIMELINE_LOGGER__
```
