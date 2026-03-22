import { afterEach, describe, expect, it, vi } from "vitest";
import { ExperimentClient } from "./client";
import type { ActiveExperiment } from "./types";

const payload: ActiveExperiment[] = [
  {
    key: "checkout-cta",
    featureKey: "checkout-cta",
    featureEnabled: true,
    segmentRules: { rolloutPercent: 100 },
    trafficPercent: 100,
    variants: [
      { key: "A", weightPercent: 50 },
      { key: "B", weightPercent: 50 }
    ]
  }
];

describe("ExperimentClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns cached experiments within TTL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ experiments: payload })
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = new ExperimentClient("http://localhost:3000", 60_000);

    const first = await client.getActiveExperiments("demo-app");
    const second = await client.getActiveExperiments("demo-app");

    expect(first).toEqual(payload);
    expect(second).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws on non-ok response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = new ExperimentClient("http://localhost:3000", 1_000);

    await expect(client.getActiveExperiments("demo-app")).rejects.toThrow(
      "Failed to fetch experiments: 500"
    );
  });
});
