import { describe, expect, it } from "vitest";
import {
  isExperimentEnabled,
  isInTraffic,
  resolveAssignment,
  resolveVariant
} from "./assignment";
import type { ActiveExperiment } from "./types";

const baseExperiment: ActiveExperiment = {
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

describe("resolveVariant", () => {
  it("returns deterministic variant for same user", () => {
    const one = resolveVariant("user-1", baseExperiment);
    const two = resolveVariant("user-1", baseExperiment);

    expect(one).toBe(two);
  });

  it("returns control when trafficPercent is 0", () => {
    const result = resolveVariant("user-1", {
      ...baseExperiment,
      trafficPercent: 0
    });

    expect(result).toBe("control");
  });

  it("returns 'on' when traffic allows user and variants are not configured", () => {
    const result = resolveVariant("user-1", {
      ...baseExperiment,
      variants: []
    });

    expect(result).toBe("on");
  });
});

describe("isExperimentEnabled", () => {
  it("returns false when feature is disabled", () => {
    const enabled = isExperimentEnabled("user-1", [], {
      ...baseExperiment,
      featureEnabled: false
    });

    expect(enabled).toBe(false);
  });

  it("returns true for included subject key", () => {
    const enabled = isExperimentEnabled("user-1", [], {
      ...baseExperiment,
      segmentRules: { includeSubjectKeys: ["user-1"], rolloutPercent: 0 }
    });

    expect(enabled).toBe(true);
  });

  it("returns true when user is in included group", () => {
    const enabled = isExperimentEnabled("user-1", ["beta-team"], {
      ...baseExperiment,
      segmentRules: { includeGroups: ["beta-team"], rolloutPercent: 0 }
    });

    expect(enabled).toBe(true);
  });

  it("returns false when rolloutPercent is 0 and user is not explicitly included", () => {
    const enabled = isExperimentEnabled("user-1", ["public"], {
      ...baseExperiment,
      segmentRules: { rolloutPercent: 0 }
    });

    expect(enabled).toBe(false);
  });
});

describe("isInTraffic", () => {
  it("returns false when trafficPercent is 0", () => {
    expect(
      isInTraffic("user-1", { ...baseExperiment, trafficPercent: 0 })
    ).toBe(false);
  });

  it("returns true when trafficPercent is 100", () => {
    expect(
      isInTraffic("user-1", { ...baseExperiment, trafficPercent: 100 })
    ).toBe(true);
  });
});

describe("resolveAssignment", () => {
  it("returns disabled control when experiment is not eligible", () => {
    const result = resolveAssignment("user-1", [], {
      ...baseExperiment,
      segmentRules: { rolloutPercent: 0 }
    });

    expect(result).toEqual({ enabled: false, variant: "control" });
  });

  it("returns disabled control when user is out of traffic", () => {
    const result = resolveAssignment("user-1", [], {
      ...baseExperiment,
      trafficPercent: 0
    });

    expect(result).toEqual({ enabled: false, variant: "control" });
  });

  it("returns enabled variant when user is eligible and in traffic", () => {
    const result = resolveAssignment("user-1", [], baseExperiment);

    expect(result.enabled).toBe(true);
    expect(["A", "B"]).toContain(result.variant);
  });
});
