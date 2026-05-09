import { describe, expect, it } from "vitest";
import {
  addVariantWithAutoWeights,
  rebalanceVariantWeights,
  removeVariantWithAutoWeights
} from "./variant-weights";

describe("toggle-drawer variant auto weights", () => {
  it("rebalances 3 variants to a 100% sum", () => {
    const variants = rebalanceVariantWeights([
      { key: "A", weightPercent: 0 },
      { key: "B", weightPercent: 0 },
      { key: "C", weightPercent: 0 }
    ]);

    expect(variants.map((item) => item.weightPercent)).toEqual([34, 33, 33]);
    expect(variants.reduce((sum, item) => sum + item.weightPercent, 0)).toBe(100);
  });

  it("auto-assigns equal weights when adding a new variant", () => {
    const variants = addVariantWithAutoWeights([
      { key: "A", weightPercent: 100, comment: "control" }
    ]);

    expect(variants.map((item) => item.key)).toEqual(["A", "V1"]);
    expect(variants.map((item) => item.weightPercent)).toEqual([50, 50]);
    expect(variants.reduce((sum, item) => sum + item.weightPercent, 0)).toBe(100);
  });

  it("preserves comments and rebalances after remove", () => {
    const variants = removeVariantWithAutoWeights(
      [
        { key: "A", weightPercent: 25, comment: "default" },
        { key: "B", weightPercent: 25, comment: "middle" },
        { key: "C", weightPercent: 25, comment: "long range" },
        { key: "D", weightPercent: 25, comment: "all time" }
      ],
      1
    );

    expect(variants.map((item) => item.key)).toEqual(["A", "C", "D"]);
    expect(variants.map((item) => item.comment)).toEqual([
      "default",
      "long range",
      "all time"
    ]);
    expect(variants.map((item) => item.weightPercent)).toEqual([34, 33, 33]);
  });
});
