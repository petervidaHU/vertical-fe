export type DebugRecord = {
  sequence: number;
  timestamp: number;
  channel: string;
  event: string;
  data?: unknown;
};

export type DebugChannel = {
  readonly name: string;
  log: (event: string, data?: unknown) => void;
  getRecords: () => DebugRecord[];
  clear: () => void;
  isEnabled: () => boolean;
  setEnabled: (enabled: boolean) => void;
};

type DebugChannelState = {
  name: string;
  enabled: boolean;
  maxEntries: number;
  mirrorToConsole: boolean;
  nextSequence: number;
  records: DebugRecord[];
};

type DebugStore = {
  channels: Map<string, DebugChannelState>;
};

export type CreateDebugChannelOptions = {
  enabledByDefault?: boolean;
  maxEntries?: number;
  mirrorToConsole?: boolean;
};

type DebugBridge = {
  listChannels: () => string[];
  getChannelLogs: (channel: string) => DebugRecord[];
  clearChannel: (channel: string) => void;
  clearAll: () => void;
  setChannelEnabled: (channel: string, enabled: boolean) => void;
  isChannelEnabled: (channel: string) => boolean;
};

type GlobalDebugHost = typeof globalThis & {
  __verticalDebugStore?: DebugStore;
  __verticalDebug?: DebugBridge;
};

function getHost(): GlobalDebugHost {
  return globalThis as GlobalDebugHost;
}

function getStore(): DebugStore {
  const host = getHost();
  if (!host.__verticalDebugStore) {
    host.__verticalDebugStore = {
      channels: new Map<string, DebugChannelState>(),
    };
  }
  return host.__verticalDebugStore;
}

function ensureBridge(): void {
  const host = getHost();
  if (host.__verticalDebug) return;

  host.__verticalDebug = {
    listChannels: () => [...getStore().channels.keys()].sort(),
    getChannelLogs: (channel: string) => {
      const state = getStore().channels.get(channel);
      return state ? [...state.records] : [];
    },
    clearChannel: (channel: string) => {
      const state = getStore().channels.get(channel);
      if (!state) return;
      state.records.length = 0;
    },
    clearAll: () => {
      getStore().channels.forEach((state) => {
        state.records.length = 0;
      });
    },
    setChannelEnabled: (channel: string, enabled: boolean) => {
      const state = getStore().channels.get(channel);
      if (!state) return;
      state.enabled = enabled;
    },
    isChannelEnabled: (channel: string) => {
      const state = getStore().channels.get(channel);
      return Boolean(state?.enabled);
    },
  };
}

function getOrCreateChannelState(name: string, options?: CreateDebugChannelOptions): DebugChannelState {
  const store = getStore();
  const existing = store.channels.get(name);
  if (existing) return existing;

  const state: DebugChannelState = {
    name,
    enabled: options?.enabledByDefault ?? true,
    maxEntries: Math.max(10, options?.maxEntries ?? 1500),
    mirrorToConsole: options?.mirrorToConsole ?? false,
    nextSequence: 1,
    records: [],
  };

  store.channels.set(name, state);
  ensureBridge();
  return state;
}

export function createDebugChannel(name: string, options?: CreateDebugChannelOptions): DebugChannel {
  const state = getOrCreateChannelState(name, options);

  return {
    name,
    log: (event: string, data?: unknown) => {
      if (!state.enabled) return;

      const record: DebugRecord = {
        sequence: state.nextSequence,
        timestamp: Date.now(),
        channel: state.name,
        event,
        data,
      };

      state.nextSequence += 1;
      state.records.push(record);
      if (state.records.length > state.maxEntries) {
        state.records.shift();
      }

      if (state.mirrorToConsole) {
        console.debug(`[debug:${state.name}]`, record);
      }
    },
    getRecords: () => [...state.records],
    clear: () => {
      state.records.length = 0;
    },
    isEnabled: () => state.enabled,
    setEnabled: (enabled: boolean) => {
      state.enabled = enabled;
    },
  };
}

ensureBridge();
