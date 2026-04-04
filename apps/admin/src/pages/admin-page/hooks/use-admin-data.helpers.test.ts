import { describe, expect, it } from "vitest";
import { parseCsv } from "../../../shared/api";
import type { ToggleView } from "../../../shared/api";
import type { ToggleForm } from "../types";
import {
  buildIncludeSubjectKeys,
  buildTogglePayload,
  deriveAdditionalSubjectKeysForEdit,
  removeToggleFromCache,
  toToggleView,
  upsertToggleCache,
  validateTogglePayload
} from "./use-admin-data.helpers";

const sampleForm: ToggleForm = {
  appId: "demo-app",
  key: "checkout-redesign",
  name: "Checkout redesign",
  featureKey: "checkout-redesign",
  featureEnabled: true,
  rolloutPercent: 25,
  trafficPercent: 70,
  groupNames: ["beta-team"],
  includeIdsRaw: "user:manual,user:manual-2",
  variants: [
    { key: "A", weightPercent: 40 },
    { key: "B", weightPercent: 60 }
  ]
};

describe("use-admin-data helpers", () => {
  it("parseCsv include ids: trims, filters empty and deduplicates", () => {
    expect(parseCsv(" a, b ,, c ")).toEqual(["a", "b", "c"]);

    const includeIds = buildIncludeSubjectKeys("user:maria,user:manual,user:maria");

    expect(includeIds).toEqual(["user:maria", "user:manual"]);
  });

  it("derives Additional subject keys by excluding members from selected groups", () => {
    const additionalIds = deriveAdditionalSubjectKeysForEdit(
      [
        {
          id: "g1",
          name: "beta-team",
          description: "",
          members: [{ memberKey: "user:egor" }, { memberKey: "user:maria" }]
        }
      ],
      ["beta-team"],
      ["user:egor", "user:maria", "user:manual"]
    );

    expect(additionalIds).toEqual(["user:manual"]);
  });

  it("builds payload from toggle form with trafficPercent and flexible variants", () => {
    const { payload, includeSubjectKeys } = buildTogglePayload(sampleForm);

    expect(includeSubjectKeys).toEqual(["user:manual", "user:manual-2"]);
    expect(payload.trafficPercent).toBe(70);
    expect(payload.segmentRules.rolloutPercent).toBe(25);
    expect(payload.variants).toEqual([
      { key: "A", weightPercent: 40, payload: { variant: "A" } },
      { key: "B", weightPercent: 60, payload: { variant: "B" } }
    ]);
  });

  it("validates payload fields, range checks and variant weights", () => {
    const { payload } = buildTogglePayload(sampleForm);
    expect(validateTogglePayload(payload)).toBeNull();
    expect(
      validateTogglePayload({
        ...payload,
        trafficPercent: 0,
        segmentRules: { ...payload.segmentRules, rolloutPercent: 0 }
      })
    ).toBeNull();

    expect(
      validateTogglePayload({
        ...payload,
        variants: [{ key: "A", weightPercent: 20, payload: {} }]
      })
    ).toContain("sum must be 100");

    expect(
      validateTogglePayload({
        ...payload,
        variants: [
          { key: "A", weightPercent: 50, payload: {} },
          { key: "A", weightPercent: 50, payload: {} }
        ]
      })
    ).toContain("unique");

    expect(
      validateTogglePayload({
        ...payload,
        appId: ""
      })
    ).toContain("Fill appId");

    expect(
      validateTogglePayload({
        ...payload,
        variants: []
      })
    ).toBeNull();
  });

  it("updates local cache after create/update/delete", () => {
    const { payload } = buildTogglePayload(sampleForm);
    const initial: ToggleView[] = [];
    const createdToggle = toToggleView("t-1", payload);

    const afterCreate = upsertToggleCache(initial, createdToggle, "create");
    expect(afterCreate).toHaveLength(1);
    expect(afterCreate[0].id).toBe("t-1");

    const updatedToggle = toToggleView("t-1", {
      ...payload,
      name: "Checkout redesign v2"
    });
    const afterUpdate = upsertToggleCache(afterCreate, updatedToggle, "update");
    expect(afterUpdate).toHaveLength(1);
    expect(afterUpdate[0].name).toBe("Checkout redesign v2");

    const afterDelete = removeToggleFromCache(afterUpdate, "t-1");
    expect(afterDelete).toEqual([]);
  });
});

