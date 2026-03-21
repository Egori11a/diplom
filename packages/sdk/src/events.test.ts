import { afterEach, describe, expect, it, vi } from "vitest";
import { EventBuffer } from "./events";
import type { ABProviderConfig } from "./types";

const config: ABProviderConfig = {
  apiUrl: "http://localhost:3000",
  appId: "demo-app",
  batchSize: 2,
  flushIntervalMs: 10_000
};

describe("EventBuffer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("flushes automatically when batch size is reached", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(crypto, "randomUUID").mockReturnValueOnce("e-1").mockReturnValueOnce("e-2");

    const buffer = new EventBuffer(config, "anon-1");
    buffer.track({
      type: "click",
      experiment_key: "cta-color",
      variant_key: "A"
    });
    buffer.track({
      type: "conversion",
      experiment_key: "cta-color",
      variant_key: "A"
    });

    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0];
    const payload = JSON.parse(options.body as string) as { events: Array<{ event_id: string }> };
    expect(payload.events).toHaveLength(2);
    expect(payload.events[0].event_id).toBe("e-1");
    expect(payload.events[1].event_id).toBe("e-2");
  });

  it("retries failed payload on next flush", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(crypto, "randomUUID").mockReturnValueOnce("e-1").mockReturnValueOnce("e-2");

    const buffer = new EventBuffer({ ...config, batchSize: 20 }, "anon-1");
    buffer.track({
      type: "click",
      experiment_key: "cta-color",
      variant_key: "A"
    });
    buffer.track({
      type: "conversion",
      experiment_key: "cta-color",
      variant_key: "A"
    });

    await buffer.flush();
    await buffer.flush();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstPayload = JSON.parse(fetchMock.mock.calls[0][1].body as string) as { events: unknown[] };
    const secondPayload = JSON.parse(fetchMock.mock.calls[1][1].body as string) as { events: unknown[] };
    expect(firstPayload.events).toHaveLength(2);
    expect(secondPayload.events).toHaveLength(2);
  });
});
