import type { ToggleForm } from "./types";

export const defaultToggleForm: ToggleForm = {
  appId: "demo-app",
  key: "cta-color",
  name: "Toggle example",
  featureKey: "new-cta",
  featureEnabled: true,
  rolloutPercent: 100,
  trafficPercent: 100,
  groupNames: [],
  includeIdsRaw: "",
  variants: []
};

export const defaultGroupName = "beta-team";
export const defaultGroupDescription = "Beta release team";
