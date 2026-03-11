import { describe, expect, it } from "vitest";
import { resolveVariant } from "./assignment";

describe("resolveVariant", () => {
  it("returns deterministic variant for same user", () => {
    const experiment = {
      key: "cta-color",
      featureKey: "new-cta",
      featureEnabled: true,
      segmentRules: { rolloutPercent: 100 },
      trafficPercent: 100,
      variants: [
        { key: "A", weightPercent: 50 },
        { key: "B", weightPercent: 50 }
      ]
    };

    const one = resolveVariant("user-1", experiment);
    const two = resolveVariant("user-1", experiment);

    expect(one).toBe(two);
  });
});
