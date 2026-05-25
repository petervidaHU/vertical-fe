import { describe, expect, it } from "@jest/globals";
import { createDebugChannel } from "./debugBus";

describe("debug bus", () => {
  it("records sequenced events", () => {
    const channel = createDebugChannel("jest-debug-seq", { enabledByDefault: true });
    channel.clear();

    channel.log("event-1", { ok: true });
    channel.log("event-2");

    const records = channel.getRecords();

    expect(records).toHaveLength(2);
    expect(records[0].sequence).toBeLessThan(records[1].sequence);
    expect(records[0]).toMatchObject({ channel: "jest-debug-seq", event: "event-1" });
  });

  it("respects enable and clear controls", () => {
    const channel = createDebugChannel("jest-debug-control", { enabledByDefault: false });
    channel.clear();

    channel.log("hidden");
    expect(channel.getRecords()).toHaveLength(0);

    channel.setEnabled(true);
    channel.log("shown");
    expect(channel.getRecords()).toHaveLength(1);

    channel.clear();
    expect(channel.getRecords()).toHaveLength(0);
  });

  it("enforces max entries cap", () => {
    const channel = createDebugChannel("jest-debug-cap", { enabledByDefault: true, maxEntries: 10 });
    channel.clear();

    for (let index = 0; index < 20; index += 1) {
      channel.log(`event-${index}`);
    }

    const records = channel.getRecords();
    expect(records).toHaveLength(10);
    expect(records[0].event).toBe("event-10");
  });
});
