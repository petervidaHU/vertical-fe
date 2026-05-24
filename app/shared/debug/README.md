# Debug Bus

Reusable debug/logger utility for temporary instrumentation.

## Why this exists

- Keep debugging code decoupled from feature logic.
- Reuse one mechanism across Pixi, routes, services, hooks, and API layers.
- Remove instrumentation easily after bug fixes by deleting only feature-local log calls.

## Quick start

```ts
import { createDebugChannel } from "../shared/debug";

const debug = createDebugChannel("feature-name", {
  enabledByDefault: true,
  maxEntries: 1500,
  mirrorToConsole: true,
});

debug.log("event-name", { any: "payload" });
```

## DevTools bridge

Global bridge is auto-installed on first import:

- `window.__verticalDebug.listChannels()`
- `window.__verticalDebug.getChannelLogs("feature-name")`
- `window.__verticalDebug.setChannelEnabled("feature-name", false)`
- `window.__verticalDebug.clearChannel("feature-name")`
- `window.__verticalDebug.clearAll()`

To copy logs quickly:

```js
copy(window.__verticalDebug.getChannelLogs("feature-name"))
```

## Removal strategy

1. Delete only the `debug.log(...)` calls in the feature.
2. Keep channel creation if you may need it later, or remove the import + channel constant.
3. No behavior logic should depend on debug return values.
